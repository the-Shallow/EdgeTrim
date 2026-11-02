import copy
import statistics
import time

import torch
import torch.nn.functional as F

from edgetrim.model import GCN


@torch.no_grad()
def evaluate(model, data, edge_index):
    model.eval()
    predictions = model(data.x, edge_index).argmax(dim=1)
    return {
        split: (predictions[mask] == data.y[mask]).float().mean().item()
        for split, mask in [("train", data.train_mask), ("val", data.val_mask), ("test", data.test_mask)]
    }


def synchronize(device):
    if device.type == "cuda":
        torch.cuda.synchronize()


def train_gcn(
    data,
    edge_index,
    seed: int,
    hidden_channels: int,
    dropout: float,
    learning_rate: float,
    weight_decay: float,
    max_epochs: int,
    patience: int,
):
    """Train a fresh two-layer GCN and keep the epoch with the best validation accuracy."""
    torch.manual_seed(seed)
    device = data.x.device
    model = GCN(
        in_channels=data.num_features,
        hidden_channels=hidden_channels,
        out_channels=int(data.y.max()) + 1,
        dropout=dropout,
    ).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate, weight_decay=weight_decay)

    best_val_accuracy = -1.0
    best_epoch = 0
    best_state = None

    synchronize(device)
    start = time.perf_counter()
    for epoch in range(1, max_epochs + 1):
        model.train()
        optimizer.zero_grad()
        logits = model(data.x, edge_index)
        loss = F.cross_entropy(logits[data.train_mask], data.y[data.train_mask])
        loss.backward()
        optimizer.step()

        val_accuracy = evaluate(model, data, edge_index)["val"]
        if val_accuracy > best_val_accuracy:
            best_val_accuracy = val_accuracy
            best_epoch = epoch
            best_state = copy.deepcopy(model.state_dict())

        if epoch - best_epoch >= patience:
            break
    synchronize(device)
    train_time_s = time.perf_counter() - start

    model.load_state_dict(best_state)
    accuracies = evaluate(model, data, edge_index)
    return model, {
        "best_epoch": best_epoch,
        "epochs_run": epoch,
        "train_accuracy": accuracies["train"],
        "val_accuracy": accuracies["val"],
        "test_accuracy": accuracies["test"],
        "train_time_s": train_time_s,
    }


@torch.no_grad()
def measure_inference(model, x, edge_index, warmup_runs: int, measured_runs: int):
    """Median warm full-graph forward latency in ms, and peak GPU memory in MB on CUDA."""
    model.eval()
    device = x.device
    for _ in range(warmup_runs):
        model(x, edge_index)
    synchronize(device)

    if device.type == "cuda":
        torch.cuda.reset_peak_memory_stats(device)

    times_ms = []
    for _ in range(measured_runs):
        if device.type == "cuda":
            start = torch.cuda.Event(enable_timing=True)
            end = torch.cuda.Event(enable_timing=True)
            start.record()
            model(x, edge_index)
            end.record()
            torch.cuda.synchronize()
            times_ms.append(start.elapsed_time(end))
        else:
            start = time.perf_counter()
            model(x, edge_index)
            times_ms.append((time.perf_counter() - start) * 1000)

    peak_memory_mb = torch.cuda.max_memory_allocated(device) / 2**20 if device.type == "cuda" else None
    return statistics.median(times_ms), peak_memory_mb
