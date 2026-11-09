#!/bin/bash
#SBATCH --job-name=edgetrim-pruned
#SBATCH --output=runs/pruned-%A_%a.out
#SBATCH --error=runs/pruned-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:50:00
#SBATCH --array=0-26%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

METHODS=(random degree feature)
REMOVAL_FRACTIONS=(0.2 0.4 0.6)
SEEDS_PER_BUDGET=3
TASKS_PER_METHOD=9

METHOD_INDEX=$((SLURM_ARRAY_TASK_ID / TASKS_PER_METHOD))
WITHIN_METHOD=$((SLURM_ARRAY_TASK_ID % TASKS_PER_METHOD))
BUDGET_INDEX=$((WITHIN_METHOD / SEEDS_PER_BUDGET))
SEED=$((WITHIN_METHOD % SEEDS_PER_BUDGET))

METHOD="${METHODS[$METHOD_INDEX]}"
REMOVAL_FRACTION="${REMOVAL_FRACTIONS[$BUDGET_INDEX]}"
REMOVAL_PERCENT=$(python -c "print(round($REMOVAL_FRACTION * 100))")
RUN_DIR="runs/ogbn_arxiv_${METHOD}_remove${REMOVAL_PERCENT}_seed${SEED}"

nvidia-smi

python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --method "$METHOD" \
    --loss-mode ce \
    --removal-fraction "$REMOVAL_FRACTION" \
    --seed "$SEED" \
    --run-dir "$RUN_DIR"
