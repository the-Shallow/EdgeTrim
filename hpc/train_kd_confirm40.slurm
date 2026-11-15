#!/bin/bash
#SBATCH --job-name=edgetrim-kd-confirm
#SBATCH --output=runs/kd-confirm-%A_%a.out
#SBATCH --error=runs/kd-confirm-%A_%a.err
#SBATCH --account=csc591038f26_gpu
#SBATCH --partition=gpu_partners
#SBATCH --qos=short_gpu
#SBATCH --gres=gpu:a30:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=01:50:00
#SBATCH --array=0-3%1

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"

module load conda
module load cuda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim

export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export OMP_NUM_THREADS="$SLURM_CPUS_PER_TASK"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

ALPHAS=(0.75 0.5)
TEMPERATURE=2.0
SEEDS_PER_CONFIGURATION=2

CONFIGURATION_INDEX=$((SLURM_ARRAY_TASK_ID / SEEDS_PER_CONFIGURATION))
SEED=$((SLURM_ARRAY_TASK_ID % SEEDS_PER_CONFIGURATION + 1))

KD_ALPHA="${ALPHAS[$CONFIGURATION_INDEX]}"
ALPHA_TAG="${KD_ALPHA//./p}"
TEMPERATURE_TAG="${TEMPERATURE//./p}"

TEACHER_CHECKPOINT="runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed${SEED}/checkpoint.pt"
SELECTED_GRAPH="runs/strong_teacher_grid/teacher_graph_remove40_teacher_seed${SEED}/selected_graph.pt"
RUN_DIR="runs/kd_confirm40/alpha${ALPHA_TAG}_temp${TEMPERATURE_TAG}_seed${SEED}"

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
    --seed "$SEED" \
    --run-dir "$RUN_DIR"
