#!/bin/bash
#SBATCH --job-name=edgetrim-profile
#SBATCH --output=runs/profile-%A_%a.out
#SBATCH --error=runs/profile-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:00:00
#SBATCH --array=0-50%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

REMOVAL_PERCENTS=(20 40 60)
VARIANTS=(random degree feature teacher_ce teacher_kd)

if ((SLURM_ARRAY_TASK_ID < 3)); then
    SEED="$SLURM_ARRAY_TASK_ID"
    RUN_DIR="runs/final600/ogbn_arxiv_unpruned_seed${SEED}"
elif ((SLURM_ARRAY_TASK_ID < 48)); then
    OFFSET=$((SLURM_ARRAY_TASK_ID - 3))
    VARIANT_INDEX=$((OFFSET / 9))
    WITHIN_VARIANT=$((OFFSET % 9))
    BUDGET_INDEX=$((WITHIN_VARIANT / 3))
    SEED=$((WITHIN_VARIANT % 3))

    VARIANT="${VARIANTS[$VARIANT_INDEX]}"
    REMOVAL_PERCENT="${REMOVAL_PERCENTS[$BUDGET_INDEX]}"
    RUN_DIR="runs/final600/ogbn_arxiv_${VARIANT}_remove${REMOVAL_PERCENT}_seed${SEED}"
else
    case "$SLURM_ARRAY_TASK_ID" in
        48)
            RUN_DIR="runs/final600/ogbn_arxiv_unpruned_width64_seed0"
            ;;
        49)
            RUN_DIR="runs/final600/ogbn_arxiv_teacher_ce_width64_remove40_seed0"
            ;;
        50)
            RUN_DIR="runs/final600/ogbn_arxiv_teacher_kd_width64_remove40_seed0"
            ;;
    esac
fi

nvidia-smi

python scripts/measure_inference.py \
    --root data/ogbn-arxiv \
    --checkpoint "$RUN_DIR/checkpoint.pt" \
    --output "$RUN_DIR/inference_metrics.json" \
    --warmup-runs 10 \
    --measured-runs 30
