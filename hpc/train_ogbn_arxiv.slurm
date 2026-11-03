#!/bin/bash
#SBATCH --job-name=edgetrim-ogbn
#SBATCH --output=runs/ogbn-%A_%a.out
#SBATCH --error=runs/ogbn-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu
#SBATCH --qos=gpu
#SBATCH --gres=gpu:a100:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=06:00:00
#SBATCH --array=0-8%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"
module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim
export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"

METHODS=(unpruned random degree)
SEEDS_PER_METHOD=3
METHOD_INDEX=$((SLURM_ARRAY_TASK_ID / SEEDS_PER_METHOD))
SEED=$((SLURM_ARRAY_TASK_ID % SEEDS_PER_METHOD))
METHOD="${METHODS[$METHOD_INDEX]}"

nvidia-smi
python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --method "$METHOD" \
    --removal-fraction 0.4 \
    --seed "$SEED" \
    --run-dir "runs/ogbn_arxiv_${METHOD}_seed${SEED}"
