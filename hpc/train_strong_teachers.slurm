#!/bin/bash
#SBATCH --job-name=edgetrim-strong-teacher
#SBATCH --output=runs/strong-teacher-%A_%a.out
#SBATCH --error=runs/strong-teacher-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:50:00
#SBATCH --array=0-2%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

SEED="$SLURM_ARRAY_TASK_ID"
RUN_DIR="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${SEED}"

nvidia-smi

python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --method unpruned \
    --loss-mode ce \
    --model-architecture ogb_gcn \
    --num-layers 3 \
    --hidden-channels 256 \
    --dropout 0.5 \
    --learning-rate 0.01 \
    --weight-decay 0.0 \
    --max-epochs 500 \
    --patience 500 \
    --seed "$SEED" \
    --run-dir "$RUN_DIR"
