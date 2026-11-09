#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runs

for seed in 0 1 2; do
    checkpoint="runs/ogbn_arxiv_unpruned_seed${seed}/checkpoint.pt"
    if [[ ! -f "$checkpoint" ]]; then
        echo "Missing required teacher checkpoint: $checkpoint" >&2
        exit 1
    fi
done

pruned_job=$(sbatch --parsable hpc/train_pruned_grid.slurm)
scoring_job=$(sbatch --parsable hpc/score_teacher_edges.slurm)
student_job=$(sbatch \
    --parsable \
    --dependency="afterok:${scoring_job}" \
    hpc/train_teacher_students.slurm)
profile_job=$(sbatch \
    --parsable \
    --dependency="afterok:${pruned_job}:${student_job}" \
    hpc/profile_grid.slurm)

echo "pruned_grid=$pruned_job"
echo "teacher_scoring=$scoring_job"
echo "teacher_students=$student_job"
echo "inference_profiling=$profile_job"
