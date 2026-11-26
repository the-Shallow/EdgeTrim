"""Measure ogbn-arxiv inference latency and GPU memory."""

import argparse
import json
import statistics
from pathlib import Path

import torch
from ogb.nodeproppred import Evaluator
from torch_geometric.utils import coalesce, to_undirected
from edgetrim.data import load_ogbn_arxiv
from edgetrim.model import build_model_from_config

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="data/ogbn-arxiv")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--graph-path", default=None)
    parser.add_argument("--evaluation-method", default=None)
    parser.add_argument("--output", default=None)
    parser.add_argument("--warmup-runs", type=int, default=10)
    parser.add_argument("--measured-runs", type=int, default=30)
    return parser.parse_args()

def main():
    args = parse_args()
    device = torch.device("cuda:0")

    data, split = load_ogbn_arxiv(args.root)
    checkpoint_path = Path(args.checkpoint)
    checkpoint = torch.load(
        checkpoint_path,
        map_location=device,
        weights_only=True
    )

    config = checkpoint["config"]

    graph_artifact = None

    # An explicitly supplied graph always overrides the graph on which the
    # checkpoint was trained. This supports frozen-weight transfer evaluation:
    # load a full-graph checkpoint, replace only its edge_index, and run
    # inference without any optimizer steps.
    if args.graph_path is not None:
        graph_path = Path(args.graph_path)
        graph_artifact = torch.load(
            graph_path,
            map_location="cpu",
            weights_only=True,
        )
        edge_index = graph_artifact["edge_index"]
    elif config["method"] == "unpruned":
        edge_index = to_undirected(
            data.edge_index,
            num_nodes=data.num_nodes,
        )
        edge_index = coalesce(
            edge_index,
            num_nodes=data.num_nodes
        )
        graph_path = None
    else:
        graph_path = Path(
            args.graph_path or checkpoint_path.parent / "selected_graph.pt"
        )
        graph_artifact = torch.load(
            graph_path,
            map_location="cpu",
            weights_only=True
        )

        edge_index = graph_artifact["edge_index"]

    if args.evaluation_method is not None:
        evaluation_method = args.evaluation_method
    elif args.graph_path is not None and graph_artifact is not None:
        evaluation_method = graph_artifact.get("method", config["method"])
    else:
        # Preserve the original profiler's method label when it evaluates a
        # checkpoint on its own training graph.
        evaluation_method = config["method"]

    x = data.x.to(device)
    y = data.y.view(-1).long().to(device)
    edge_index = edge_index.to(device)
    test_indices = split["test"].view(-1).long().to(device)

    model = build_model_from_config(
        config,
        in_channels=data.num_features,
        out_channels=int(y.max().item()) + 1,
    ).to(device)

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )
    model.eval()

    with torch.inference_mode():
        for _ in range(args.warmup_runs):
            model(x, edge_index)

        torch.cuda.synchronize(device)
        torch.cuda.reset_peak_memory_stats(device)

        times_ms = []

        for _ in range(args.measured_runs):
            start = torch.cuda.Event(enable_timing=True)
            end = torch.cuda.Event(enable_timing=True)

            start.record()
            logits = model(x, edge_index)
            end.record()

            torch.cuda.synchronize(device)
            times_ms.append(start.elapsed_time(end))

        peak_inference_memory_bytes = int(
            torch.cuda.max_memory_allocated(device)
        )

        final_logits = model(x, edge_index)
        predictions = final_logits[test_indices].argmax(dim=-1, keepdim=True)

    evaluator = Evaluator(name="ogbn-arxiv")
    test_accuracy = float(
        evaluator.eval(
            {
                "y_true": (
                    y[test_indices].view(-1,1).cpu().numpy()
                ),
                "y_pred": predictions.cpu().numpy()
            }
        )["acc"]
    )

    metrics = {
        "dataset": "ogbn-arxiv",
        "method": evaluation_method,
        "checkpoint_method": config["method"],
        "evaluation_method": evaluation_method,
        "evaluation_protocol": (
            "frozen_checkpoint_on_supplied_graph"
            if args.graph_path is not None
            else "checkpoint_on_training_graph"
        ),
        "loss_mode": config.get("loss_mode", "ce"),
        "checkpoint": str(checkpoint_path),
        "graph_path": (
            str(graph_path)
            if graph_path is not None
            else None
        ),
        "edge_count": int(edge_index.size(1)),
        "retained_connection_count": (
            int(graph_artifact["retained_connection_count"])
            if graph_artifact is not None
            and "retained_connection_count" in graph_artifact
            else None
        ),
        "removal_fraction_requested": (
            float(graph_artifact["removal_fraction_requested"])
            if graph_artifact is not None
            and "removal_fraction_requested" in graph_artifact
            else 0.0
        ),
        "removal_fraction_actual": (
            float(graph_artifact["removal_fraction_actual"])
            if graph_artifact is not None
            and "removal_fraction_actual" in graph_artifact
            else 0.0
        ),
        "checkpoint_seed": config.get("seed"),
        "graph_seed": (
            graph_artifact.get("seed")
            if graph_artifact is not None
            else None
        ),
        "parameter_count": sum(
            parameter.numel()
            for parameter in model.parameters()
        ),
        "warmup_runs": args.warmup_runs,
        "measured_runs": args.measured_runs,
        "median_inference_ms": statistics.median(times_ms),
        "mean_inference_ms": statistics.mean(times_ms),
        "min_inference_ms": min(times_ms),
        "max_inference_ms": max(times_ms),
        "peak_inference_memory_bytes": (
            peak_inference_memory_bytes
        ),
        "test_accuracy": test_accuracy,
        "raw_inference_times_ms": times_ms,
        "gpu": torch.cuda.get_device_name(device),
    }

    output_path = Path(
        args.output or checkpoint_path.parent / "inference_metrics.json"
    )

    with output_path.open("w", encoding="utf-8") as stream:
        json.dump(metrics, stream, indent=2)

    print(json.dumps(metrics, indent=2), flush=True)

if __name__ == "__main__":
    main()
