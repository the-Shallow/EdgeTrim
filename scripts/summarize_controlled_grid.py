"""Summarize the controlled selector-by-loss experiment."""

import argparse
import json
import statistics
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--degree-ce-root", required=True)
    parser.add_argument("--teacher-ce-root", required=True)
    parser.add_argument("--controlled-kd-root", required=True)
    parser.add_argument("--output", default=None)
    return parser.parse_args()


def load_metrics(path):
    return json.loads(path.read_text(encoding="utf-8"))


def run_path(root, selector, loss_mode, removal_percent, seed):
    if selector == "degree" and loss_mode == "ce":
        name = f"ogbn_arxiv_degree_remove{removal_percent}_seed{seed}"
    elif selector == "teacher" and loss_mode == "ce":
        name = (
            f"ogbn_arxiv_strong_teacher_ce_"
            f"remove{removal_percent}_seed{seed}"
        )
    else:
        name = (
            f"ogbn_arxiv_{selector}_kd_"
            f"remove{removal_percent}_seed{seed}"
        )
    return root / name / "metrics.json"


def main():
    args = parse_args()
    roots = {
        ("degree", "ce"): Path(args.degree_ce_root),
        ("teacher", "ce"): Path(args.teacher_ce_root),
        ("degree", "kd"): Path(args.controlled_kd_root),
        ("teacher", "kd"): Path(args.controlled_kd_root),
    }
    runs = []

    for selector in ("degree", "teacher"):
        for loss_mode in ("ce", "kd"):
            for removal_percent in (20, 40, 60):
                for seed in (0, 1, 2):
                    metrics_path = run_path(
                        roots[(selector, loss_mode)],
                        selector,
                        loss_mode,
                        removal_percent,
                        seed,
                    )
                    metrics = load_metrics(metrics_path)
                    runs.append(
                        {
                            "selector": selector,
                            "loss_mode": loss_mode,
                            "removal_percent": removal_percent,
                            "seed": seed,
                            "validation_accuracy": metrics["validation_accuracy"],
                            "test_accuracy": metrics["test_accuracy"],
                        }
                    )

    summary = []
    for selector in ("degree", "teacher"):
        for loss_mode in ("ce", "kd"):
            for removal_percent in (20, 40, 60):
                selected = [
                    row for row in runs
                    if row["selector"] == selector
                    and row["loss_mode"] == loss_mode
                    and row["removal_percent"] == removal_percent
                ]
                summary.append(
                    {
                        "selector": selector,
                        "loss_mode": loss_mode,
                        "removal_percent": removal_percent,
                        "mean_validation_accuracy": statistics.mean(
                            row["validation_accuracy"] for row in selected
                        ),
                        "sample_std_validation_accuracy": statistics.stdev(
                            row["validation_accuracy"] for row in selected
                        ),
                        "mean_test_accuracy": statistics.mean(
                            row["test_accuracy"] for row in selected
                        ),
                        "sample_std_test_accuracy": statistics.stdev(
                            row["test_accuracy"] for row in selected
                        ),
                    }
                )

    paired_effects = []
    for selector in ("degree", "teacher"):
        for removal_percent in (20, 40, 60):
            validation_differences = []
            test_differences = []
            for seed in (0, 1, 2):
                ce = next(
                    row for row in runs
                    if row["selector"] == selector
                    and row["loss_mode"] == "ce"
                    and row["removal_percent"] == removal_percent
                    and row["seed"] == seed
                )
                kd = next(
                    row for row in runs
                    if row["selector"] == selector
                    and row["loss_mode"] == "kd"
                    and row["removal_percent"] == removal_percent
                    and row["seed"] == seed
                )
                validation_differences.append(
                    kd["validation_accuracy"] - ce["validation_accuracy"]
                )
                test_differences.append(
                    kd["test_accuracy"] - ce["test_accuracy"]
                )
            paired_effects.append(
                {
                    "selector": selector,
                    "removal_percent": removal_percent,
                    "mean_kd_minus_ce_validation": statistics.mean(
                        validation_differences
                    ),
                    "sample_std_kd_minus_ce_validation": statistics.stdev(
                        validation_differences
                    ),
                    "mean_kd_minus_ce_test": statistics.mean(test_differences),
                    "sample_std_kd_minus_ce_test": statistics.stdev(
                        test_differences
                    ),
                    "per_seed_kd_minus_ce_test": test_differences,
                }
            )

    result = {
        "runs": runs,
        "summary": summary,
        "paired_effects": paired_effects,
    }
    rendered = json.dumps(result, indent=2)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
