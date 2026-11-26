"""Summarize frozen full-graph checkpoints evaluated on pruned graphs."""

import argparse
import json
import statistics
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        default="runs/frozen_pruned_baselines",
    )
    parser.add_argument("--output", default=None)
    return parser.parse_args()


def main():
    args = parse_args()
    root = Path(args.root)
    records = []

    for metrics_path in sorted(root.glob("*/evaluation_metrics.json")):
        with metrics_path.open(encoding="utf-8") as stream:
            metrics = json.load(stream)

        records.append(
            {
                "selector": metrics["evaluation_method"],
                "removal_percent": round(
                    100 * metrics["removal_fraction_requested"]
                ),
                "seed": metrics["checkpoint_seed"],
                "test_accuracy": metrics["test_accuracy"],
                "median_inference_ms": metrics["median_inference_ms"],
                "peak_inference_memory_bytes": metrics[
                    "peak_inference_memory_bytes"
                ],
                "checkpoint": metrics["checkpoint"],
                "graph_path": metrics["graph_path"],
            }
        )

    expected_runs = 27
    if len(records) != expected_runs:
        raise RuntimeError(
            f"Expected {expected_runs} evaluation files, found {len(records)}"
        )

    summary = []
    for selector in ("degree", "random", "feature"):
        for removal_percent in (20, 40, 60):
            group = [
                record
                for record in records
                if record["selector"] == selector
                and record["removal_percent"] == removal_percent
            ]
            if len(group) != 3:
                raise RuntimeError(
                    f"Expected 3 runs for {selector} at {removal_percent}%, "
                    f"found {len(group)}"
                )

            accuracies = [record["test_accuracy"] for record in group]
            latencies = [record["median_inference_ms"] for record in group]
            memories = [
                record["peak_inference_memory_bytes"] for record in group
            ]
            summary.append(
                {
                    "selector": selector,
                    "removal_percent": removal_percent,
                    "mean_test_accuracy": statistics.mean(accuracies),
                    "sample_std_test_accuracy": statistics.stdev(accuracies),
                    "mean_median_inference_ms": statistics.mean(latencies),
                    "mean_peak_inference_memory_bytes": statistics.mean(
                        memories
                    ),
                }
            )

    result = {"runs": records, "summary": summary}
    rendered = json.dumps(result, indent=2)
    print(rendered, flush=True)

    if args.output is not None:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
