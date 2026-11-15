#!/bin/bash
#SBATCH --job-name=edgetrim-strong-profile
#SBATCH --output=runs/strong-profile-%A_%a.out
#SBATCH --error=runs/strong-profile-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:00:00
#SBATCH --array=0-20%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

LOSS_MODES=(ce kd)
REMOVAL_PERCENTS=(20 40 60)

if ((SLURM_ARRAY_TASK_ID < 3)); then
    SEED="$SLURM_ARRAY_TASK_ID"
    RUN_DIR="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${SEED}"
else
    OFFSET=$((SLURM_ARRAY_TASK_ID - 3))
    LOSS_INDEX=$((OFFSET / 9))
    WITHIN_LOSS_MODE=$((OFFSET % 9))
    BUDGET_INDEX=$((WITHIN_LOSS_MODE / 3))
    SEED=$((WITHIN_LOSS_MODE % 3))

    LOSS_MODE="${LOSS_MODES[$LOSS_INDEX]}"
    REMOVAL_PERCENT="${REMOVAL_PERCENTS[$BUDGET_INDEX]}"
    RUN_DIR="runs/strong_teacher_grid/ogbn_arxiv_strong_teacher_${LOSS_MODE}_remove${REMOVAL_PERCENT}_seed${SEED}"
fi

nvidia-smi

python scripts/measure_inference.py \
    --root data/ogbn-arxiv \
    --checkpoint "$RUN_DIR/checkpoint.pt" \
    --output "$RUN_DIR/inference_metrics.json" \
    --warmup-runs 10 \
    --measured-runs 30
