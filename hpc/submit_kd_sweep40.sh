#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runs
mkdir -p runs/kd_sweep40_seed0

teacher_checkpoint="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed0/checkpoint.pt"
selected_graph="runs/strong_teacher_grid/teacher_graph_remove40_teacher_seed0/selected_graph.pt"

if [[ ! -f "$teacher_checkpoint" ]]; then
    echo "Missing strong-teacher checkpoint: $teacher_checkpoint" >&2
    exit 1
fi

if [[ ! -f "$selected_graph" ]]; then
    echo "Missing selected graph: $selected_graph" >&2
    exit 1
fi

sweep_job=$(sbatch --parsable hpc/train_kd_sweep40_seed0.slurm)
echo "kd_sweep40_seed0=$sweep_job"
