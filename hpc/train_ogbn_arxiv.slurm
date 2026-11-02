#!/bin/bash
#SBATCH --job-name=edgetrim-ogbn
#SBATCH --output=runs/ogbn-%A_%a.out
#SBATCH --error=runs/ogbn-%A_%a.err
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a100:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:50:00
#SBATCH --array=0-2%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"
source ~/.bashrc
module load conda
module load cuda
conda activate /share/csc591038f26/kpatel53/envs/edgetrim
export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"

nvidia-smi
python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --seed "$SLURM_ARRAY_TASK_ID" \
    --run-dir "runs/ogbn_arxiv_seed${SLURM_ARRAY_TASK_ID}"
