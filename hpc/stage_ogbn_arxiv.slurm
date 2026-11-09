#!/bin/bash
#SBATCH --job-name=edgetrim-ogbn-stage
#SBATCH --output=runs/ogbn-stage-%j.out
#SBATCH --error=runs/ogbn-stage-%j.err
#SBATCH --account=csc591038f26_cpu
#SBATCH --partition=xfer
#SBATCH --qos=xfer
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --time=01:00:00

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"
module load conda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate /share/csc591038f26/kpatel53/envs/edgetrim
export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

python scripts/prepare_ogbn_arxiv.py --root data/ogbn-arxiv
