import statistics
import time
import torch

from edgetrim.data import load_cora
from edgetrim.model import GCN
from edgetrim.pruning import random_prune_edges

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
data = load_cora().to(device)
data.edge_index = random_prune_edges(data.edge_index, removal_fraction=0.4, seed=0)
checkpoint = torch.load(
    "runs/cora_random40_seed0/checkpoint.pt",
    map_location=device,
    weights_only=True,
)

model = GCN(
    in_channels=data.num_features,
    hidden_channels=checkpoint["hidden_channels"],
    out_channels=int(data.y.max()) + 1,
    dropout=checkpoint["dropout"],
).to(device)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

with torch.no_grad():
    for _ in range(10):
        model(data.x, data.edge_index)

    if device.type == "cuda":
        torch.cuda.synchronize()

    times_ms = []
    for _ in range(30):
        if device.type == "cuda":
            start = torch.cuda.Event(enable_timing=True)
            end = torch.cuda.Event(enable_timing=True)
            start.record()
            model(data.x, data.edge_index)
            end.record()
            torch.cuda.synchronize()
            times_ms.append(start.elapsed_time(end))
        else:
            start = time.perf_counter()
            model(data.x, data.edge_index)
            times_ms.append((time.perf_counter() - start) * 1000)

    print(f"median_inference_ms={statistics.median(times_ms):.3f}")
    predictions = model(data.x, data.edge_index).argmax(dim=1)
    test_accuracy = (
        (predictions[data.test_mask] == data.y[data.test_mask])
        .float()
        .mean()
        .item()
    )

print(f"loaded_checkpoint_test_accuracy={test_accuracy:.4f}")