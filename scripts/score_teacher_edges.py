import argparse
import json
import time
from pathlib import Path

import torch
from torch_geometric.utils import coalesce, to_undirected

from edgetrim.data import load_ogbn_arxiv
from edgetrim.model import build_model_from_config
from edgetrim.pruning import (
    select_connections_by_score,
    teacher_gradient_connection_scores
)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="data/ogbn-arxiv")
    parser.add_argument("--teacher-checkpoint", required=True)
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--removal-fraction", type=float, default=0.4)
    return parser.parse_args()

def main():
    args = parse_args()

    device = torch.device("cuda:0")

    data, split = load_ogbn_arxiv(args.root)

    edge_index = to_undirected(
        data.edge_index,
        num_nodes=data.num_nodes,
    )
    edge_index = coalesce(
        edge_index,
        num_nodes=data.num_nodes,
    )

    unpruned_connection_count = int(
        (edge_index[0] < edge_index[1]).sum().item()
    )

    connections_to_keep = round(
        unpruned_connection_count
        * (1.0 - args.removal_fraction)
    )

    node_features = data.x.to(device)
    labels = data.y.view(-1).long().to(device)
    train_indices = split["train"].view(-1).long().to(device)
    edge_index = edge_index.to(device)

    checkpoint = torch.load(
        args.teacher_checkpoint,
        map_location=device,
        weights_only=True,
    )

    teacher_config = checkpoint["config"]

    teacher = build_model_from_config(
        teacher_config,
        in_channels=data.num_features,
        out_channels=int(labels.max().item()) + 1,
    ).to(device)

    teacher.load_state_dict(
        checkpoint["model_state_dict"]
    )

    torch.cuda.reset_peak_memory_stats(device)
    torch.cuda.synchronize(device)
    scoring_started = time.perf_counter()

    connection_keys, connection_scores, teacher_loss = (
        teacher_gradient_connection_scores(
            teacher=teacher,
            node_features=node_features,
            edge_index=edge_index,
            labels=labels,
            train_indices=train_indices
        )
    )

    pruned_edge_index, kept_keys, kept_scores = (
        select_connections_by_score(
            edge_index=edge_index,
            connection_keys=connection_keys,
            connection_scores=connection_scores,
            connections_to_keep=connections_to_keep,
            num_nodes=data.num_nodes
        )
    )

    torch.cuda.synchronize(device)
    edge_scoring_seconds = time.perf_counter() - scoring_started
    peak_scoring_memory_bytes = int(torch.cuda.max_memory_allocated(device))

    retained_connection_count = int(
        (pruned_edge_index[0] < pruned_edge_index[1])
        .sum().item()
    )

    actual_removal_fraction = 1.0 - (
        retained_connection_count / unpruned_connection_count
    )

    run_dir = Path(args.run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)

    metadata = {
        "dataset": "ogbn-arxiv",
        "method": "teacher_gradient",
        "teacher_checkpoint": args.teacher_checkpoint,
        "teacher_seed": teacher_config["seed"],
        "teacher_loss": teacher_loss,
        "unpruned_connection_count": unpruned_connection_count,
        "connections_to_keep": connections_to_keep,
        "retained_connection_count": retained_connection_count,
        "removal_fraction_requested": args.removal_fraction,
        "removal_fraction_actual": actual_removal_fraction,
        "edge_scoring_seconds": edge_scoring_seconds,
        "peak_scoring_memory_bytes": peak_scoring_memory_bytes,
        "score": "absolute gate-times-gradient",
        "edge_preprocessing": "make undirected, then coalesce duplicates",
    }

    torch.save(
        {
            "edge_index": pruned_edge_index.cpu(),
            "kept_connection_keys": kept_keys.cpu(),
            "kept_connection_scores": kept_scores.cpu(),
            "metadata": metadata,
        },
        run_dir / "selected_graph.pt",
    )

    with (run_dir / "scoring_metrics.json").open(
        "w",
        encoding="utf-8",
    ) as stream:
        json.dump(metadata, stream, indent=2)

    print(json.dumps(metadata, indent=2), flush=True)


if __name__ == "__main__":
    main()
