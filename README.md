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

The repository has standalone training entry points for the Cora pipeline check and the ogbn-arxiv main benchmark. No performance numbers should be reported until a run has completed and its artifacts under `runs/` have been reviewed.

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

Hazel recommends Conda environments. Initialize Conda once per account if needed (`module load conda`, `conda init bash`, then log out and back in). For this project, the environment and package cache are in scratch:

```bash
module load conda
mkdir -p /share/csc591038f26/kpatel53/conda/pkgs /share/csc591038f26/kpatel53/envs
export CONDA_PKGS_DIRS=/share/csc591038f26/kpatel53/conda/pkgs
conda create --prefix /share/csc591038f26/kpatel53/envs/edgetrim python=3.11 pip -y
conda activate /share/csc591038f26/kpatel53/envs/edgetrim
python -m pip install -r requirements.txt
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"
```

The current environment reports PyTorch `2.15.0+cu132`, matching Hazel's CUDA 13.2 module. `torch.cuda.is_available()` is expected to be false on a login node; verify it from a GPU job. Scratch is not backed up and inactive files can be deleted, so keep important results elsewhere.

## Run ogbn-arxiv on Hazel

The compute nodes do not have outside network access, so stage ogbn-arxiv first through Hazel's `xfer` partition, then make the training array depend on successful staging:

```bash
cd /share/csc591038f26/kpatel53/EdgeTrim
STAGE_JOB=$(sbatch --parsable hpc/stage_ogbn_arxiv.slurm)
sbatch --dependency=afterok:$STAGE_JOB hpc/train_ogbn_arxiv.slurm
```

The training script runs seeds 0, 1, and 2 as a Slurm array, one task at a time, requesting one A100 in `gpu_partners` with `short_gpu`. That QOS has a two-hour limit. Submit production work with `sbatch`, not on a login node. Monitor it with `squeue -u "$USER"` or `sq --pend` / `sq --run`; use `sj JOBID`, `sjs JOBID`, and `seff JOBID` for job details and resource use. Logs, configs, metrics, and checkpoints are written under `runs/`.

Hazel currently reports a Slurm topology error for interactive A100 allocations (`Requested topology configuration is not available`) despite free A100s on `gpu26`. Resolve that with HPC support before relying on a GPU allocation.

## Experiment conventions

- Use training labels for optimization, validation labels for checkpoint selection, and test labels only for reporting.
- Convert ogbn-arxiv citation edges to undirected connections and coalesce duplicates. Record edge counts before and after conversion.
- Keep GCN self-loops independent of the pruning budget. Later pruning methods should select an undirected connection as one unit.
- Record package versions, hardware, graph preprocessing, seed, and timing method with every run.
- Measure warm inference with graph data already on the target device. Keep loading and preprocessing time separate.

For current resource and job syntax, see Hazel's [Slurm job guide](https://hpc.ncsu.edu/RunningJobs/RunningJobs.php), [GPU guide](https://hpc.ncsu.edu/RunningJobs/Gpu.php), and [data staging guide](https://hpc.ncsu.edu/RunningJobs/DataStaging.php).
