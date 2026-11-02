# Experiment entry points

Run every script from the repository root with `PYTHONPATH=src`, for example `PYTHONPATH=src python scripts/run_h1.py --dataset cora`.

- `train_teacher.py`: train the full-graph Cora GCN (seed 0), select a checkpoint by validation accuracy, and save it to `runs/cora_teacher_seed0/`.
- `check_checkpoint.py`: reload that checkpoint, report its test accuracy, and measure warm inference latency.
- `train_random_baseline.py` / `check_random_checkpoint.py`: the same for the first random baseline (about 40% of undirected connections removed with `dropout_edge`, so the kept count is approximate).
- `run_h1.py`: the H1 experiment. For each seed it trains the full-graph teacher, scores every undirected connection with each method in `h1.methods`, keeps exactly the same number of connections for every method at each removal fraction, retrains the same GCN on each pruned graph, and records accuracy, latency, peak GPU memory, and scoring time.

## `run_h1.py`

Settings come from `configs/teacher.yaml` (`model`, `training`, `timing`, and `h1`). Command-line flags override the seeds, removal fractions, methods, and output directory:

```text
PYTHONPATH=src python scripts/run_h1.py --dataset ogbn-arxiv --seeds 0 --removal-fractions 0.4 --methods random teacher_gradient
```

Pruning methods (each keeps the highest-scoring connections; ties are broken by a seeded random permutation):

| Method | Score of connection (u, v) |
| --- | --- |
| `random` | Seeded uniform random number |
| `degree` | `1 / sqrt(deg(u) * deg(v))`, so connections between two hubs are removed first |
| `feature_similarity` | Cosine similarity of the two nodes' input features |
| `teacher_gradient` | First-order increase in the teacher's loss if the connection is removed: `-(dL/dw_uv + dL/dw_vu)`, with `L` the teacher's cross-entropy against its own predictions on all nodes (no validation or test labels) |

Output in `runs/h1_<dataset>/`:

- `run_info.json`: effective configuration, graph counts after preprocessing, package versions, and hardware.
- `results.csv`: one row per seed, method, and removal fraction.
- `summary.csv`: mean and standard deviation across seeds for each method and removal fraction.
- `seed<k>/<method>_<percent>/checkpoint.pt`: model weights plus `kept_pairs`, the indices into `undirected_pairs(data.edge_index, num_nodes)` of the connections kept, so the exact pruned graph can be rebuilt with `pairs_to_edge_index(pairs[:, kept_pairs.long()], num_nodes)`.

Do not report a result without its run directory.
