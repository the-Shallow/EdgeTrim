#!/bin/bash
#SBATCH --job-name=edgetrim-ogbn-stage
#SBATCH --output=runs/ogbn-stage-%j.out
#SBATCH --error=runs/ogbn-stage-%j.err
#SBATCH --partition=xfer
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --time=01:00:00

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"
source ~/.bashrc
module load conda
conda activate /share/csc591038f26/kpatel53/envs/edgetrim
export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"

python scripts/prepare_ogbn_arxiv.py --root data/ogbn-arxiv
