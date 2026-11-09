#!/bin/bash
#SBATCH --job-name=edgetrim-student
#SBATCH --output=runs/student-%A_%a.out
#SBATCH --error=runs/student-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:50:00
#SBATCH --array=0-17%1

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
REMOVAL_FRACTIONS=(0.2 0.4 0.6)
SEEDS_PER_BUDGET=3
TASKS_PER_LOSS_MODE=9

LOSS_INDEX=$((SLURM_ARRAY_TASK_ID / TASKS_PER_LOSS_MODE))
WITHIN_LOSS_MODE=$((SLURM_ARRAY_TASK_ID % TASKS_PER_LOSS_MODE))
BUDGET_INDEX=$((WITHIN_LOSS_MODE / SEEDS_PER_BUDGET))
SEED=$((WITHIN_LOSS_MODE % SEEDS_PER_BUDGET))

LOSS_MODE="${LOSS_MODES[$LOSS_INDEX]}"
REMOVAL_FRACTION="${REMOVAL_FRACTIONS[$BUDGET_INDEX]}"
REMOVAL_PERCENT=$(python -c "print(round($REMOVAL_FRACTION * 100))")

TEACHER_CHECKPOINT="runs/ogbn_arxiv_unpruned_seed${SEED}/checkpoint.pt"
SELECTED_GRAPH="runs/teacher_graph_remove${REMOVAL_PERCENT}_teacher_seed${SEED}/selected_graph.pt"
RUN_DIR="runs/ogbn_arxiv_teacher_${LOSS_MODE}_remove${REMOVAL_PERCENT}_seed${SEED}"

nvidia-smi

python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --method teacher \
    --selected-graph "$SELECTED_GRAPH" \
    --loss-mode "$LOSS_MODE" \
    --teacher-checkpoint "$TEACHER_CHECKPOINT" \
    --kd-alpha 0.5 \
    --temperature 4.0 \
    --seed "$SEED" \
    --run-dir "$RUN_DIR"
