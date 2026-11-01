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

## Experiment conventions

- Use training labels for optimization, validation labels for checkpoint selection, and test labels only for reporting.
- Convert ogbn-arxiv citation edges to undirected connections and coalesce duplicates. Record edge counts before and after conversion.
- Keep GCN self-loops independent of the pruning budget. Later pruning methods should select an undirected connection as one unit.
- Record package versions, hardware, graph preprocessing, seed, and timing method with every run.
- Measure warm inference with graph data already on the target device. Keep loading and preprocessing time separate.

PyTorch and PyG installation depends on the local CUDA/PyTorch combination; use the [official PyG installation guide](https://pytorch-geometric.readthedocs.io/en/latest/install/installation.html) when implementation begins.
