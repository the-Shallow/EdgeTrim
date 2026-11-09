#!/bin/bash
#SBATCH --job-name=edgetrim-width64
#SBATCH --output=runs/width64-%A_%a.out
#SBATCH --error=runs/width64-%A_%a.err
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

SEED=0
REMOVAL_PERCENT=40
TEACHER_CHECKPOINT="runs/final600/ogbn_arxiv_unpruned_seed${SEED}/checkpoint.pt"
SELECTED_GRAPH="runs/final600/teacher_graph_remove${REMOVAL_PERCENT}_teacher_seed${SEED}/selected_graph.pt"

case "$SLURM_ARRAY_TASK_ID" in
    0)
        METHOD=unpruned
        LOSS_MODE=ce
        RUN_DIR="runs/final600/ogbn_arxiv_unpruned_width64_seed${SEED}"
        ;;
    1)
        METHOD=teacher
        LOSS_MODE=ce
        RUN_DIR="runs/final600/ogbn_arxiv_teacher_ce_width64_remove${REMOVAL_PERCENT}_seed${SEED}"
        ;;
    2)
        METHOD=teacher
        LOSS_MODE=kd
        RUN_DIR="runs/final600/ogbn_arxiv_teacher_kd_width64_remove${REMOVAL_PERCENT}_seed${SEED}"
        ;;
esac

nvidia-smi

if [[ "$METHOD" == "unpruned" ]]; then
    python scripts/train_ogbn_arxiv.py \
        --root data/ogbn-arxiv \
        --method unpruned \
        --loss-mode ce \
        --hidden-channels 64 \
        --max-epochs 600 \
        --patience 100 \
        --seed "$SEED" \
        --run-dir "$RUN_DIR"
else
    python scripts/train_ogbn_arxiv.py \
        --root data/ogbn-arxiv \
        --method teacher \
        --selected-graph "$SELECTED_GRAPH" \
        --loss-mode "$LOSS_MODE" \
        --teacher-checkpoint "$TEACHER_CHECKPOINT" \
        --kd-alpha 0.5 \
        --temperature 4.0 \
        --hidden-channels 64 \
        --max-epochs 600 \
        --patience 100 \
        --seed "$SEED" \
        --run-dir "$RUN_DIR"
fi
