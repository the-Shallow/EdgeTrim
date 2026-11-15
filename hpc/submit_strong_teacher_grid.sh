#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runs
mkdir -p runs/strong_teacher_grid

for seed in 0 1 2; do
    checkpoint="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${seed}/checkpoint.pt"
    if [[ ! -f "$checkpoint" ]]; then
        echo "Missing strong-teacher checkpoint: $checkpoint" >&2
        exit 1
    fi
done

scoring_job=$(sbatch \
    --parsable \
    hpc/score_strong_teacher_edges.slurm)
student_job=$(sbatch \
    --parsable \
    --dependency="afterok:${scoring_job}" \
    hpc/train_strong_teacher_students.slurm)
profile_job=$(sbatch \
    --parsable \
    --dependency="afterok:${student_job}" \
    hpc/profile_strong_teacher_grid.slurm)

echo "strong_teacher_scoring=$scoring_job"
echo "strong_teacher_students=$student_job"
echo "strong_teacher_profiling=$profile_job"
