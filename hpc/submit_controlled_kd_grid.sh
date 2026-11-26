#!/bin/bash

set -euo pipefail

if [[ "$#" -ne 2 ]]; then
    echo "Usage: bash hpc/submit_controlled_kd_grid.sh KD_ALPHA TEMPERATURE" >&2
    echo "Example: bash hpc/submit_controlled_kd_grid.sh 0.5 2.0" >&2
    exit 1
fi

kd_alpha="$1"
temperature="$2"
alpha_tag="${kd_alpha//./p}"
temperature_tag="${temperature//./p}"
experiment_tag="controlled_kd_alpha${alpha_tag}_temp${temperature_tag}"

cd "$(dirname "$0")/.."
mkdir -p runs
mkdir -p "runs/${experiment_tag}"

for seed in 0 1 2; do
    teacher_checkpoint="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${seed}/checkpoint.pt"
    if [[ ! -f "$teacher_checkpoint" ]]; then
        echo "Missing strong-teacher checkpoint: $teacher_checkpoint" >&2
        exit 1
    fi

    for removal_percent in 20 40 60; do
        degree_graph="runs/final600/ogbn_arxiv_degree_remove${removal_percent}_seed${seed}/selected_graph.pt"
        teacher_graph="runs/strong_teacher_grid/teacher_graph_remove${removal_percent}_teacher_seed${seed}/selected_graph.pt"

        if [[ ! -f "$degree_graph" ]]; then
            echo "Missing degree graph: $degree_graph" >&2
            exit 1
        fi
        if [[ ! -f "$teacher_graph" ]]; then
            echo "Missing teacher graph: $teacher_graph" >&2
            exit 1
        fi
    done
done

training_job=$(sbatch \
    --parsable \
    --export="ALL,KD_ALPHA=${kd_alpha},TEMPERATURE=${temperature},EXPERIMENT_TAG=${experiment_tag}" \
    hpc/train_controlled_kd_grid.slurm)

profile_job=$(sbatch \
    --parsable \
    --dependency="afterok:${training_job}" \
    --export="ALL,EXPERIMENT_TAG=${experiment_tag}" \
    hpc/profile_controlled_kd_grid.slurm)

echo "experiment_tag=${experiment_tag}"
echo "controlled_kd_training=${training_job}"
echo "controlled_kd_profiling=${profile_job}"
