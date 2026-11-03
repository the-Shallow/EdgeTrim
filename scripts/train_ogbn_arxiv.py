"""Train an ogbn-arxiv GCN with unpruned, random, or degree-based edges."""

import argparse
import json
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from ogb.nodeproppred import Evaluator
from torch_geometric.utils import coalesce, to_undirected

from edgetrim.data import load_ogbn_arxiv
from edgetrim.model import GCN
from edgetrim.pruning import degree_prune_edges, random_prune_connections


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="data/ogbn-arxiv")
    parser.add_argument("--run-dir", default=None)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument(
        "--method",
        choices=("unpruned", "random", "degree"),
        default="unpruned",
    )
    parser.add_argument("--removal-fraction", type=float, default=0.4)
    parser.add_argument("--hidden-channels", type=int, default=128)
    parser.add_argument("--dropout", type=float, default=0.5)
    parser.add_argument("--learning-rate", type=float, default=0.01)
    parser.add_argument("--weight-decay", type=float, default=0.0005)
    parser.add_argument("--max-epochs", type=int, default=300)
    parser.add_argument("--patience", type=int, default=50)
    return parser.parse_args()


def count_undirected_connections(edge_index):
    source, target = edge_index
    return int((source < target).sum().item())


def ogb_accuracy(evaluator, logits, labels, indices):
    y_true = labels[indices].view(-1, 1).cpu().numpy()
    y_pred = logits[indices].argmax(dim=-1, keepdim=True).cpu().numpy()
    return float(evaluator.eval({"y_true": y_true, "y_pred": y_pred})["acc"])


def main():
    args = parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("A CUDA GPU is required; submit this script as a Slurm GPU job.")
    if not 0.0 <= args.removal_fraction < 1.0:
        raise ValueError("--removal-fraction must be in the interval [0, 1).")

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.cuda.manual_seed_all(args.seed)

    device = torch.device("cuda:0")
    load_started = time.perf_counter()
    data, split = load_ogbn_arxiv(args.root)
    data_load_seconds = time.perf_counter() - load_started

    raw_edge_count = int(data.edge_index.size(1))
    preprocess_started = time.perf_counter()
    edge_index = to_undirected(data.edge_index, num_nodes=data.num_nodes)
    edge_index = coalesce(edge_index, num_nodes=data.num_nodes)
    unpruned_edge_count = int(edge_index.size(1))
    unpruned_connection_count = count_undirected_connections(edge_index)

    if args.method == "unpruned":
        connections_to_keep = unpruned_connection_count
    else:
        connections_to_keep = round(
            unpruned_connection_count * (1.0 - args.removal_fraction)
        )
        if args.method == "random":
            edge_index = random_prune_connections(
                edge_index,
                connections_to_keep=connections_to_keep,
                seed=args.seed,
            )
        elif args.method == "degree":
            edge_index = degree_prune_edges(
                edge_index,
                connections_to_keep=connections_to_keep,
            )

    retained_edge_count = int(edge_index.size(1))
    retained_connection_count = count_undirected_connections(edge_index)
    actual_removal_fraction = 1.0 - (
        retained_connection_count / unpruned_connection_count
    )
    preprocessing_seconds = time.perf_counter() - preprocess_started

    print(
        f"method={args.method} seed={args.seed} "
        f"connections={unpruned_connection_count}->{retained_connection_count} "
        f"edges={unpruned_edge_count}->{retained_edge_count}",
        flush=True,
    )

    x = data.x.to(device)
    y = data.y.view(-1).long().to(device)
    edge_index = edge_index.to(device)
    split = {key: value.view(-1).long().to(device) for key, value in split.items()}

    model = GCN(
        in_channels=data.num_features,
        hidden_channels=args.hidden_channels,
        out_channels=int(y.max().item()) + 1,
        dropout=args.dropout,
    ).to(device)
    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=args.learning_rate,
        weight_decay=args.weight_decay,
    )
    evaluator = Evaluator(name="ogbn-arxiv")

    best_validation_accuracy = -1.0
    best_epoch = 0
    best_state = None
    torch.cuda.reset_peak_memory_stats(device)
    torch.cuda.synchronize(device)
    training_started = time.perf_counter()

    for epoch in range(1, args.max_epochs + 1):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        logits = model(x, edge_index)
        loss = F.cross_entropy(logits[split["train"]], y[split["train"]])
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            validation_logits = model(x, edge_index)
            validation_accuracy = ogb_accuracy(
                evaluator, validation_logits, y, split["valid"]
            )

        if validation_accuracy > best_validation_accuracy:
            best_validation_accuracy = validation_accuracy
            best_epoch = epoch
            best_state = {
                key: value.detach().cpu().clone()
                for key, value in model.state_dict().items()
            }

        print(
            f"epoch={epoch} loss={loss.item():.4f} "
            f"valid_accuracy={validation_accuracy:.4f}",
            flush=True,
        )

        if epoch - best_epoch >= args.patience:
            break

    torch.cuda.synchronize(device)
    training_seconds = time.perf_counter() - training_started
    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        final_logits = model(x, edge_index)
        metrics = {
            "best_epoch": best_epoch,
            "train_accuracy": ogb_accuracy(evaluator, final_logits, y, split["train"]),
            "validation_accuracy": ogb_accuracy(evaluator, final_logits, y, split["valid"]),
            "test_accuracy": ogb_accuracy(evaluator, final_logits, y, split["test"]),
            "training_seconds": training_seconds,
            "peak_gpu_memory_bytes": int(torch.cuda.max_memory_allocated(device)),
        }

    run_dir = Path(
        args.run_dir or f"runs/ogbn_arxiv_{args.method}_seed{args.seed}"
    )
    run_dir.mkdir(parents=True, exist_ok=True)
    config = {
        "dataset": "ogbn-arxiv",
        "method": args.method,
        "data_root": args.root,
        "split": "official OGB train/valid/test",
        "edge_preprocessing": "make undirected, then coalesce duplicates",
        "raw_edge_count": raw_edge_count,
        "unpruned_edge_count": unpruned_edge_count,
        "retained_edge_count": retained_edge_count,
        "unpruned_connection_count": unpruned_connection_count,
        "retained_connection_count": retained_connection_count,
        "connections_to_keep": connections_to_keep,
        "removal_fraction_requested": (
            0.0 if args.method == "unpruned" else args.removal_fraction
        ),
        "removal_fraction_actual": actual_removal_fraction,
        "num_nodes": int(data.num_nodes),
        "num_features": int(data.num_features),
        "num_classes": int(y.max().item()) + 1,
        "split_sizes": {key: int(value.numel()) for key, value in split.items()},
        "seed": args.seed,
        "model": "two-layer PyG GCN",
        "hidden_channels": args.hidden_channels,
        "dropout": args.dropout,
        "learning_rate": args.learning_rate,
        "weight_decay": args.weight_decay,
        "max_epochs": args.max_epochs,
        "patience": args.patience,
        "torch_version": str(torch.__version__),
        "torch_cuda_build": torch.version.cuda,
        "gpu": torch.cuda.get_device_name(device),
        "gpu_capability": list(torch.cuda.get_device_capability(device)),
        "data_load_seconds": data_load_seconds,
        "preprocessing_seconds": preprocessing_seconds,
    }

    with (run_dir / "config.json").open("w", encoding="utf-8") as stream:
        json.dump(config, stream, indent=2)
    with (run_dir / "metrics.json").open("w", encoding="utf-8") as stream:
        json.dump(metrics, stream, indent=2)
    torch.save(
        {"model_state_dict": best_state, "config": config, "metrics": metrics},
        run_dir / "checkpoint.pt",
    )
    print(f"run_dir={run_dir}", flush=True)
    print(json.dumps(metrics, indent=2), flush=True)


if __name__ == "__main__":
    main()
