#!/bin/bash
#SBATCH --job-name=edgetrim-kd-sweep
#SBATCH --output=runs/kd-sweep-%A_%a.out
#SBATCH --error=runs/kd-sweep-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:50:00
#SBATCH --array=0-11%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

ALPHAS=(0.1 0.25 0.5 0.75)
TEMPERATURES=(1.0 2.0 4.0)
TEMPERATURE_COUNT=${#TEMPERATURES[@]}

ALPHA_INDEX=$((SLURM_ARRAY_TASK_ID / TEMPERATURE_COUNT))
TEMPERATURE_INDEX=$((SLURM_ARRAY_TASK_ID % TEMPERATURE_COUNT))

KD_ALPHA="${ALPHAS[$ALPHA_INDEX]}"
TEMPERATURE="${TEMPERATURES[$TEMPERATURE_INDEX]}"
ALPHA_TAG="${KD_ALPHA//./p}"
TEMPERATURE_TAG="${TEMPERATURE//./p}"

TEACHER_CHECKPOINT="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed0/checkpoint.pt"
SELECTED_GRAPH="runs/strong_teacher_grid/teacher_graph_remove40_teacher_seed0/selected_graph.pt"
RUN_DIR="runs/kd_sweep40_seed0/alpha${ALPHA_TAG}_temp${TEMPERATURE_TAG}"

nvidia-smi

python scripts/train_ogbn_arxiv.py \
    --root data/ogbn-arxiv \
    --method teacher \
    --selected-graph "$SELECTED_GRAPH" \
    --loss-mode kd \
    --teacher-checkpoint "$TEACHER_CHECKPOINT" \
    --kd-alpha "$KD_ALPHA" \
    --temperature "$TEMPERATURE" \
    --model-architecture gcn_2layer \
    --hidden-channels 128 \
    --max-epochs 600 \
    --patience 100 \
    --seed 0 \
    --run-dir "$RUN_DIR"
