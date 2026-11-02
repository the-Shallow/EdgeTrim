#!/bin/bash
#SBATCH --job-name=edgetrim-cora
#SBATCH --output=edgetrim-%j.out
#SBATCH --error=edgetrim-%j.err
#SBATCH --partition=gpu
#SBATCH --gres=gpu:a100:1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --time=02:00:00

set -euo pipefail

cd "$SLURM_SUBMIT_DIR"
source ~/.bashrc
module load conda
module load cuda
conda activate /usr/local/usrapps/GROUP/kpatel53/edgetrim
export PYTHONPATH="$SLURM_SUBMIT_DIR/src${PYTHONPATH:+:$PYTHONPATH}"

python -c "import torch; print('torch', torch.__version__, 'cuda available', torch.cuda.is_available())"
python scripts/train_teacher.py
