#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runs
mkdir -p runs/kd_confirm40

for seed in 1 2; do
    teacher_checkpoint="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${seed}/checkpoint.pt"
    selected_graph="runs/strong_teacher_grid/teacher_graph_remove40_teacher_seed${seed}/selected_graph.pt"

    if [[ ! -f "$teacher_checkpoint" ]]; then
        echo "Missing strong-teacher checkpoint: $teacher_checkpoint" >&2
        exit 1
    fi

    if [[ ! -f "$selected_graph" ]]; then
        echo "Missing selected graph: $selected_graph" >&2
        exit 1
    fi
done

confirm_job=$(sbatch --parsable hpc/train_kd_confirm40.slurm)
echo "kd_confirm40=$confirm_job"
