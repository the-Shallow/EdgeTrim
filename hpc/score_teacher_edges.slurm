#!/bin/bash
#SBATCH --job-name=edgetrim-score
#SBATCH --output=runs/teacher-score-%A_%a.out
#SBATCH --error=runs/teacher-score-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=64G
#SBATCH --time=01:50:00
#SBATCH --array=0-8%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda

source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

REMOVAL_FRACTIONS=(0.2 0.4 0.6)
SEEDS_PER_BUDGET=3

BUDGET_INDEX=$((SLURM_ARRAY_TASK_ID / SEEDS_PER_BUDGET))
TEACHER_SEED=$((SLURM_ARRAY_TASK_ID % SEEDS_PER_BUDGET))

REMOVAL_FRACTION="${REMOVAL_FRACTIONS[$BUDGET_INDEX]}"
REMOVAL_PERCENT=$(python -c "print(round($REMOVAL_FRACTION * 100))")

TEACHER_CHECKPOINT="runs/final600/ogbn_arxiv_unpruned_seed${TEACHER_SEED}/checkpoint.pt"
RUN_DIR="runs/final600/teacher_graph_remove${REMOVAL_PERCENT}_teacher_seed${TEACHER_SEED}"

nvidia-smi

python scripts/score_teacher_edges.py \
    --root data/ogbn-arxiv \
    --teacher-checkpoint "$TEACHER_CHECKPOINT" \
    --removal-fraction "$REMOVAL_FRACTION" \
    --run-dir "$RUN_DIR"
