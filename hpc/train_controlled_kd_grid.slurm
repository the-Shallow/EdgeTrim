#!/bin/bash
#SBATCH --job-name=edgetrim-controlled-kd
#SBATCH --output=runs/controlled-kd-%A_%a.out
#SBATCH --error=runs/controlled-kd-%A_%a.err
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

: "${KD_ALPHA:?KD_ALPHA must be exported by the submission helper}"
: "${TEMPERATURE:?TEMPERATURE must be exported by the submission helper}"
: "${EXPERIMENT_TAG:?EXPERIMENT_TAG must be exported by the submission helper}"

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

SELECTORS=(degree teacher)
REMOVAL_FRACTIONS=(0.2 0.4 0.6)
TASKS_PER_SELECTOR=9
SEEDS_PER_BUDGET=3

SELECTOR_INDEX=$((SLURM_ARRAY_TASK_ID / TASKS_PER_SELECTOR))
WITHIN_SELECTOR=$((SLURM_ARRAY_TASK_ID % TASKS_PER_SELECTOR))
BUDGET_INDEX=$((WITHIN_SELECTOR / SEEDS_PER_BUDGET))
SEED=$((WITHIN_SELECTOR % SEEDS_PER_BUDGET))

SELECTOR="${SELECTORS[$SELECTOR_INDEX]}"
REMOVAL_FRACTION="${REMOVAL_FRACTIONS[$BUDGET_INDEX]}"
REMOVAL_PERCENT=$(python -c "print(round($REMOVAL_FRACTION * 100))")

TEACHER_CHECKPOINT="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${SEED}/checkpoint.pt"

if [[ "$SELECTOR" == "degree" ]]; then
    SELECTED_GRAPH="runs/final600/ogbn_arxiv_degree_remove${REMOVAL_PERCENT}_seed${SEED}/selected_graph.pt"
else
    SELECTED_GRAPH="runs/strong_teacher_grid/teacher_graph_remove${REMOVAL_PERCENT}_teacher_seed${SEED}/selected_graph.pt"
fi

RUN_DIR="runs/${EXPERIMENT_TAG}/ogbn_arxiv_${SELECTOR}_kd_remove${REMOVAL_PERCENT}_seed${SEED}"

nvidia-smi

python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --method "$SELECTOR" \
    --selected-graph "$SELECTED_GRAPH" \
    --loss-mode kd \
    --teacher-checkpoint "$TEACHER_CHECKPOINT" \
    --kd-alpha "$KD_ALPHA" \
    --temperature "$TEMPERATURE" \
    --model-architecture gcn_2layer \
    --hidden-channels 128 \
    --max-epochs 600 \
    --patience 100 \
    --seed "$SEED" \
    --run-dir "$RUN_DIR"
