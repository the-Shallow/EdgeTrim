#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p runs
mkdir -p runs/final600

teacher_job=$(sbatch --parsable hpc/train_final_teachers.slurm)
pruned_job=$(sbatch --parsable hpc/train_pruned_grid.slurm)
scoring_job=$(sbatch \
    --parsable \
    --dependency="afterok:${teacher_job}" \
    hpc/score_teacher_edges.slurm)
student_job=$(sbatch \
    --parsable \
    --dependency="afterok:${scoring_job}" \
    hpc/train_teacher_students.slurm)
small_student_job=$(sbatch \
    --parsable \
    --dependency="afterok:${scoring_job}" \
    hpc/train_small_student_ablation.slurm)
profile_job=$(sbatch \
    --parsable \
    --dependency="afterok:${teacher_job}:${pruned_job}:${student_job}:${small_student_job}" \
    hpc/profile_grid.slurm)

echo "final_teachers=$teacher_job"
echo "pruned_grid=$pruned_job"
echo "teacher_scoring=$scoring_job"
echo "teacher_students=$student_job"
echo "width64_ablation=$small_student_job"
echo "inference_profiling=$profile_job"
