#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runs/frozen_pruned_baselines

for seed in 0 1 2; do
    checkpoint="runs/final600/ogbn_arxiv_unpruned_seed${seed}/checkpoint.pt"
    if [[ ! -f "$checkpoint" ]]; then
        echo "Missing unpruned checkpoint: $checkpoint" >&2
        exit 1
    fi

    for selector in degree random feature; do
        for removal_percent in 20 40 60; do
            graph_path="runs/final600/ogbn_arxiv_${selector}_remove${removal_percent}_seed${seed}/selected_graph.pt"
            if [[ ! -f "$graph_path" ]]; then
                echo "Missing pruned graph: $graph_path" >&2
                exit 1
            fi
        done
    done
done

frozen_job=$(sbatch \
    --parsable \
    hpc/evaluate_frozen_pruned_grid.slurm)

echo "frozen_pruned_evaluation=${frozen_job}"
