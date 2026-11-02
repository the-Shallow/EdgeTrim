"""H1: does teacher-guided edge selection beat random, degree, and feature-similarity pruning?

For each seed: train the full-graph teacher, score every undirected connection with each
method, keep the same number of connections for every method at each removal fraction,
retrain the same GCN on each pruned graph, and record accuracy and inference cost.

Run from the repository root:
    PYTHONPATH=src python scripts/run_h1.py --dataset cora
"""
from pathlib import Path
import argparse
import json
import platform
import time

import pandas as pd
import torch
import torch_geometric
import yaml

from edgetrim.data import load_dataset
from edgetrim.pruning import pairs_to_edge_index, score_edges, select_pairs, undirected_pairs
from edgetrim.training import measure_inference, synchronize, train_gcn

parser = argparse.ArgumentParser()
parser.add_argument("--dataset", choices=["cora", "ogbn-arxiv"], default="cora")
parser.add_argument("--config", default="configs/teacher.yaml")
parser.add_argument("--seeds", type=int, nargs="+", help="defaults to training.seeds in the config")
parser.add_argument("--removal-fractions", type=float, nargs="+", help="defaults to h1.removal_fractions")
parser.add_argument("--methods", nargs="+", help="defaults to h1.methods")
parser.add_argument("--out", help="defaults to runs/h1_<dataset>")
args = parser.parse_args()

config = yaml.safe_load(Path(args.config).read_text())
seeds = args.seeds or config["training"]["seeds"]
removal_fractions = args.removal_fractions or config["h1"]["removal_fractions"]
methods = args.methods or config["h1"]["methods"]
run_dir = Path(args.out or f"runs/h1_{args.dataset}")
run_dir.mkdir(parents=True, exist_ok=True)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_config = config["model"]
training_config = config["training"]
timing_config = config["timing"]
train_settings = {
    "hidden_channels": model_config["hidden_channels"],
    "dropout": model_config["dropout"],
    "learning_rate": training_config["learning_rate"],
    "weight_decay": training_config["weight_decay"],
    "max_epochs": training_config["max_epochs"],
    "patience": training_config["early_stopping_patience"],
}

data = load_dataset(args.dataset, config["datasets"][args.dataset]["root"]).to(device)
pairs = undirected_pairs(data.edge_index, data.num_nodes)
full_edge_index = pairs_to_edge_index(pairs, data.num_nodes)
print(
    f"{args.dataset}: nodes={data.num_nodes}, undirected_connections={pairs.size(1)}, "
    f"directed_edges={full_edge_index.size(1)}, device={device}"
)

run_info = {
    "dataset": args.dataset,
    "seeds": seeds,
    "removal_fractions": removal_fractions,
    "methods": methods,
    "config": config,
    "graph": {
        "num_nodes": data.num_nodes,
        "num_features": data.num_features,
        "num_classes": int(data.y.max()) + 1,
        "loaded_directed_edges": int(data.directed_edges if "directed_edges" in data else data.edge_index.size(1)),
        "undirected_connections": pairs.size(1),
        "directed_edges_used": full_edge_index.size(1),
        "train_val_test": [int(data.train_mask.sum()), int(data.val_mask.sum()), int(data.test_mask.sum())],
    },
    "versions": {
        "python": platform.python_version(),
        "torch": torch.__version__,
        "torch_geometric": torch_geometric.__version__,
    },
    "hardware": {
        "device": str(device),
        "name": torch.cuda.get_device_name(device) if device.type == "cuda" else platform.processor(),
    },
}
(run_dir / "run_info.json").write_text(json.dumps(run_info, indent=2))


def train_and_record(seed, method, removal_fraction, kept, scoring_time_s):
    edge_index = full_edge_index if kept is None else pairs_to_edge_index(pairs[:, kept], data.num_nodes)
    model, metrics = train_gcn(data, edge_index, seed=seed, **train_settings)
    latency_ms, peak_memory_mb = measure_inference(
        model, data.x, edge_index, timing_config["warmup_runs"], timing_config["measured_runs"]
    )
    connections_kept = pairs.size(1) if kept is None else kept.numel()

    out_dir = run_dir / f"seed{seed}" / f"{method}_{round(removal_fraction * 100)}"
    out_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "seed": seed,
            "method": method,
            "removal_fraction": removal_fraction,
            "kept_pairs": None if kept is None else kept.int().cpu(),
            "connections_kept": connections_kept,
            "best_epoch": metrics["best_epoch"],
            "validation_accuracy": metrics["val_accuracy"],
            "test_accuracy": metrics["test_accuracy"],
            "hidden_channels": train_settings["hidden_channels"],
            "dropout": train_settings["dropout"],
        },
        out_dir / "checkpoint.pt",
    )

    row = {
        "seed": seed,
        "method": method,
        "removal_fraction": removal_fraction,
        "connections_kept": connections_kept,
        "directed_edges_kept": edge_index.size(1),
        **metrics,
        "latency_ms": latency_ms,
        "peak_memory_mb": peak_memory_mb,
        "scoring_time_s": scoring_time_s,
    }
    print(
        f"seed={seed} {method:<18} removed={removal_fraction:.0%} kept={connections_kept} "
        f"val={metrics['val_accuracy']:.4f} test={metrics['test_accuracy']:.4f} "
        f"latency={latency_ms:.2f}ms epochs={metrics['epochs_run']}"
    )
    return model, row


rows = []
for seed in seeds:
    teacher, row = train_and_record(seed, "full", 0.0, None, None)
    rows.append(row)

    for method in methods:
        synchronize(device)
        start = time.perf_counter()
        scores = score_edges(method, pairs, data, teacher=teacher, seed=seed)
        synchronize(device)
        scoring_time_s = time.perf_counter() - start

        for removal_fraction in removal_fractions:
            kept = select_pairs(scores, removal_fraction, seed)
            _, row = train_and_record(seed, method, removal_fraction, kept, scoring_time_s)
            rows.append(row)

    pd.DataFrame(rows).to_csv(run_dir / "results.csv", index=False)

results = pd.DataFrame(rows)
summary = (
    results.groupby(["removal_fraction", "method"], sort=True)
    .agg(
        connections_kept=("connections_kept", "first"),
        seeds=("seed", "count"),
        val_mean=("val_accuracy", "mean"),
        val_std=("val_accuracy", "std"),
        test_mean=("test_accuracy", "mean"),
        test_std=("test_accuracy", "std"),
        latency_ms=("latency_ms", "median"),
        peak_memory_mb=("peak_memory_mb", "median"),
        scoring_time_s=("scoring_time_s", "median"),
    )
    .reset_index()
)
summary.to_csv(run_dir / "summary.csv", index=False)
print()
print(summary.to_string(index=False, float_format=lambda value: f"{value:.4f}"))
print(f"\nwrote {run_dir}/results.csv, summary.csv, run_info.json")
