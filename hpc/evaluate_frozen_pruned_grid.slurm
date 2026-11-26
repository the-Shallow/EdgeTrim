#!/bin/bash
#SBATCH --job-name=edgetrim-frozen-pruned
#SBATCH --output=runs/frozen-pruned-%A_%a.out
#SBATCH --error=runs/frozen-pruned-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=00:30:00
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

SELECTORS=(degree random feature)
REMOVAL_PERCENTS=(20 40 60)
TASKS_PER_SELECTOR=9

SELECTOR_INDEX=$((SLURM_ARRAY_TASK_ID / TASKS_PER_SELECTOR))
WITHIN_SELECTOR=$((SLURM_ARRAY_TASK_ID % TASKS_PER_SELECTOR))
BUDGET_INDEX=$((WITHIN_SELECTOR / 3))
SEED=$((WITHIN_SELECTOR % 3))

SELECTOR="${SELECTORS[$SELECTOR_INDEX]}"
REMOVAL_PERCENT="${REMOVAL_PERCENTS[$BUDGET_INDEX]}"

CHECKPOINT="runs/final600/ogbn_arxiv_unpruned_seed${SEED}/checkpoint.pt"
GRAPH_PATH="runs/final600/ogbn_arxiv_${SELECTOR}_remove${REMOVAL_PERCENT}_seed${SEED}/selected_graph.pt"
RUN_DIR="runs/frozen_pruned_baselines/ogbn_arxiv_${SELECTOR}_remove${REMOVAL_PERCENT}_seed${SEED}"

mkdir -p "$RUN_DIR"

nvidia-smi

python scripts/measure_inference.py \
    --root data/ogbn-arxiv \
    --checkpoint "$CHECKPOINT" \
    --graph-path "$GRAPH_PATH" \
    --evaluation-method "$SELECTOR" \
    --output "$RUN_DIR/evaluation_metrics.json" \
    --warmup-runs 10 \
    --measured-runs 30
