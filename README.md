# EdgeTrim-KD

Teacher-guided graph sparsification for efficient GNN inference. The [project plan](PROJECT_PLAN.md) defines the research question and checkpoints. The first implementation milestone is a two-layer GCN teacher on the original graph, followed by simple pruning baselines for the proposal presentation.

## Layout

```text
EdgeTrim/
├── MLG_PROJECT_PROPOSAL.pdf   # Original proposal
├── PROJECT_PLAN.md            # Goals, checkpoints, and results log
├── configs/
│   └── teacher.yaml           # Initial experiment choices
├── data/                      # Downloaded datasets; ignored
├── runs/                      # Checkpoints, metrics, and timing; ignored
├── scripts/                   # Experiment entry points
└── src/edgetrim/              # Shared data, model, and experiment code
```

## First milestone

1. Implement dataset loading with the standard Cora split and the official OGB ogbn-arxiv split.
2. Implement and train the two-layer PyTorch Geometric GCN in `configs/teacher.yaml`.
3. Save configuration, seed, best checkpoint, train/validation/test accuracy, training time, and inference measurements under `runs/`.
4. Add random edge pruning and retrain the same model at 40% edge removal. Compare it with the unpruned teacher using the same evaluation protocol.

The repository currently contains the layout and experiment specification. Training code and measured results are the next checkpoint; no performance numbers have been produced yet.

## Run on NC State Hazel HPC

Hazel requires an authorized HPC project/account. Once access is active, connect with `ssh kpatel53@login.hpc.ncsu.edu` (or use Open OnDemand), then clone this repository into your project scratch space. The cluster quick start shows how to find the group scratch path and create your personal directory:

```bash
cd /share/$(groups | awk '{print $1}')
mkdir -p "$USER"
cd "$USER"
git clone https://github.com/the-Shallow/EdgeTrim.git
cd EdgeTrim
```

The login banner says `/share` is not backed up and files not accessed for 30 days are automatically deleted. Keep important results elsewhere.

Hazel recommends Conda environments. Initialize Conda once per account if needed (`module load conda`, `conda init bash`, then log out and back in). On a login node, create the environment and install the project dependencies:

```bash
module load conda
conda create --prefix /usr/local/usrapps/GROUP/kpatel53/edgetrim python=3.11 pip -y
conda activate /usr/local/usrapps/GROUP/kpatel53/edgetrim
python -m pip install -r requirements.txt
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"
```

Replace `GROUP` in the environment path with your project group. PyTorch/PyG packaging depends on the selected Python and CUDA stack; check `python -c "import torch; print(torch.__version__, torch.cuda.is_available())"` in an allocated GPU job. If installation selects a CPU-only PyTorch wheel, install the CUDA-compatible PyTorch/PyG builds following the [PyG installation guide](https://pytorch-geometric.readthedocs.io/en/latest/install/installation.html).

Edit the environment path in the job file to match your project, then submit from the repository root with `sbatch hpc/train_cora_teacher.slurm`. The starter script requests one A100; change the typed GPU request to a GPU model available to your project, or use a CPU Slurm job if you do not have GPU access. Do not run training on the login node. Check jobs with `squeue -u "$USER"`; Slurm writes logs in the checkout and checkpoints under `runs/`.

The current training entry points are standalone Cora scripts (`scripts/train_teacher.py`, `scripts/train_random_baseline.py`, and `scripts/train_degree_baseline.py`). They do not yet accept dataset, seed, or run-directory arguments, and the ogbn-arxiv experiment described above is not implemented. The job file below launches the existing Cora teacher script; the experiment interface should be generalized before scheduling a multi-seed or ogbn-arxiv sweep.

## Experiment conventions

- Use training labels for optimization, validation labels for checkpoint selection, and test labels only for reporting.
- Convert ogbn-arxiv citation edges to undirected connections and coalesce duplicates. Record edge counts before and after conversion.
- Keep GCN self-loops independent of the pruning budget. Later pruning methods should select an undirected connection as one unit.
- Record package versions, hardware, graph preprocessing, seed, and timing method with every run.
- Measure warm inference with graph data already on the target device. Keep loading and preprocessing time separate.

PyTorch and PyG installation depends on the local CUDA/PyTorch combination; use the [official PyG installation guide](https://pytorch-geometric.readthedocs.io/en/latest/install/installation.html) when implementation begins.
