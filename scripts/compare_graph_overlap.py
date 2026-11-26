"""Compare retained connections in degree- and teacher-selected graphs."""

import argparse
import json
import statistics
from pathlib import Path

import torch


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--degree-root", required=True)
    parser.add_argument("--teacher-root", required=True)
    parser.add_argument("--output", default=None)
    return parser.parse_args()


def connection_keys(edge_index, num_nodes):
    source, target = edge_index
    one_direction = source < target
    return torch.sort(source[one_direction] * num_nodes + target[one_direction]).values


def intersection_size(left, right):
    positions = torch.searchsorted(right, left)
    valid = positions < right.numel()
    positions = positions.clamp(max=right.numel() - 1)
    return int((valid & (right[positions] == left)).sum().item())


def main():
    args = parse_args()
    degree_root = Path(args.degree_root)
    teacher_root = Path(args.teacher_root)
    rows = []

    for removal_percent in (20, 40, 60):
        for seed in (0, 1, 2):
            degree_path = (
                degree_root
                / f"ogbn_arxiv_degree_remove{removal_percent}_seed{seed}"
                / "selected_graph.pt"
            )
            teacher_path = (
                teacher_root
                / f"teacher_graph_remove{removal_percent}_teacher_seed{seed}"
                / "selected_graph.pt"
            )

            degree_artifact = torch.load(degree_path, map_location="cpu", weights_only=True)
            teacher_artifact = torch.load(teacher_path, map_location="cpu", weights_only=True)
            num_nodes = int(degree_artifact.get("num_nodes", 169343))
            degree_keys = connection_keys(degree_artifact["edge_index"], num_nodes)
            teacher_keys = connection_keys(teacher_artifact["edge_index"], num_nodes)
            overlap = intersection_size(degree_keys, teacher_keys)
            union = degree_keys.numel() + teacher_keys.numel() - overlap

            rows.append(
                {
                    "removal_percent": removal_percent,
                    "seed": seed,
                    "degree_connections": int(degree_keys.numel()),
                    "teacher_connections": int(teacher_keys.numel()),
                    "overlap_connections": overlap,
                    "overlap_fraction_of_budget": overlap
                    / min(degree_keys.numel(), teacher_keys.numel()),
                    "jaccard": overlap / union,
                }
            )

    summary = []
    for removal_percent in (20, 40, 60):
        budget_rows = [
            row for row in rows
            if row["removal_percent"] == removal_percent
        ]
        summary.append(
            {
                "removal_percent": removal_percent,
                "mean_overlap_fraction_of_budget": statistics.mean(
                    row["overlap_fraction_of_budget"] for row in budget_rows
                ),
                "sample_std_overlap_fraction_of_budget": statistics.stdev(
                    row["overlap_fraction_of_budget"] for row in budget_rows
                ),
                "mean_jaccard": statistics.mean(
                    row["jaccard"] for row in budget_rows
                ),
                "sample_std_jaccard": statistics.stdev(
                    row["jaccard"] for row in budget_rows
                ),
            }
        )

    result = {"comparisons": rows, "summary": summary}
    rendered = json.dumps(result, indent=2)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
