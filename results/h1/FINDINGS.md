# H1 findings: teacher-guided edge selection

**H1:** Teacher-guided edge selection beats random, degree-based, and feature-similarity pruning at the same edge budget.

**Status (2026-11-02):** Cora supports H1. The ogbn-arxiv result is a one-seed check under undertrained settings, so it does not yet support or refute H1.

## Setup

- **Model:** Two-layer PyG GCN, 128 hidden channels, dropout 0.5, self-loops and symmetric normalization (`configs/teacher.yaml`).
- **Training:** Full batch, Adam, learning rate 0.01, weight decay 5e-4, at most 300 epochs, early-stopping patience 50, checkpoint selected by validation accuracy. Each pruned graph is trained from scratch with the same seed as its teacher.
- **Edge budget:** Counted in undirected connections, excluding self-loops (GCNConv adds its own). Every method keeps exactly `round((1 - removal) * M)` connections. Ties are broken by a seeded random permutation.
- **Methods** (keep the highest scores):

  | Method | Score of connection (u, v) |
  | --- | --- |
  | Random | Seeded uniform random number |
  | Degree | `1 / sqrt(deg(u) * deg(v))`: connections between two high-degree nodes go first |
  | Feature similarity | Cosine similarity of input features |
  | Teacher gradient | First-order loss increase from removing the connection, `-(dL/dw_uv + dL/dw_vu)`. `L` is the full-graph teacher's cross-entropy against its own predictions on all nodes, so no validation or test labels are used |

- **Timing:** Median of 30 warm full-graph forward passes after 10 warm-up passes, data already on the device.
- **Hardware and software:** Apple M3 CPU (no GPU, so peak GPU memory was not measured), Python 3.12.15, PyTorch 2.15.0, PyG 2.8.1, OGB 1.3.6.

## Cora (3 seeds: 0, 1, 2)

Command: `PYTHONPATH=src python scripts/run_h1.py --dataset cora`

Data: [cora_summary.csv](cora_summary.csv), [cora_results.csv](cora_results.csv), [cora_run_info.json](cora_run_info.json). 5,278 undirected connections (10,556 directed edges); 140 / 500 / 1,000 train / val / test nodes.

Test accuracy, mean ± standard deviation over 3 seeds (best per budget in bold):

| Removed | Connections kept | Random | Degree | Feature similarity | Teacher gradient |
| ---: | ---: | :---: | :---: | :---: | :---: |
| 0% (full graph) | 5,278 | 0.805 ± 0.007 | | | |
| 20% | 4,222 | 0.790 ± 0.006 | 0.786 ± 0.001 | 0.773 ± 0.006 | **0.810 ± 0.006** |
| 40% | 3,167 | 0.773 ± 0.008 | 0.783 ± 0.011 | 0.748 ± 0.011 | **0.786 ± 0.003** |
| 60% | 2,111 | 0.736 ± 0.004 | 0.735 ± 0.004 | 0.705 ± 0.007 | **0.756 ± 0.010** |

Validation accuracy, which is what a method would be selected on:

| Removed | Random | Degree | Feature similarity | Teacher gradient |
| ---: | :---: | :---: | :---: | :---: |
| 20% | 0.777 ± 0.004 | 0.783 ± 0.003 | 0.762 ± 0.003 | **0.807 ± 0.008** |
| 40% | 0.775 ± 0.018 | 0.767 ± 0.006 | 0.721 ± 0.002 | **0.796 ± 0.007** |
| 60% | 0.738 ± 0.018 | 0.726 ± 0.005 | 0.687 ± 0.005 | **0.757 ± 0.006** |

Full-graph validation accuracy is 0.798 ± 0.009. Inference latency fell from 3.0 ms (full graph) to about 2.8, 2.7, and 2.5 ms at 20%, 40%, and 60% removal for every method. Scoring took under 10 ms for every method.

## ogbn-arxiv (1 seed, 40% removal: preliminary)

Command: `PYTHONPATH=src python scripts/run_h1.py --dataset ogbn-arxiv --seeds 0 --removal-fractions 0.4 --out runs/h1_ogbn-arxiv_smoke`

Data: [arxiv_smoke_summary.csv](arxiv_smoke_summary.csv), [arxiv_smoke_results.csv](arxiv_smoke_results.csv), [arxiv_smoke_run_info.json](arxiv_smoke_run_info.json). The 1,166,243 directed citations become 1,157,799 undirected connections (2,315,598 directed edges) after symmetrizing and removing duplicates; 90,941 / 29,799 / 48,603 train / val / test nodes.

| Method | Connections kept | Val | Test | Train | Best epoch | Latency | Scoring time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Full graph (0%) | 1,157,799 | 0.680 | 0.673 | 0.678 | 280 | 317 ms | |
| Random | 694,679 | 0.658 | 0.650 | 0.653 | 299 | 213 ms | 0.002 s |
| **Degree** | 694,679 | **0.683** | **0.677** | 0.678 | 255 | 213 ms | 0.007 s |
| Feature similarity | 694,679 | 0.640 | 0.630 | 0.632 | 288 | 213 ms | 0.44 s |
| Teacher gradient | 694,679 | 0.676 | 0.667 | 0.671 | 256 | 219 ms | 1.2 s |

Training took about 3.5 minutes per pruned graph and 5 minutes for the full graph on the M3 CPU.

## Insights

1. **On Cora, teacher-guided selection is the best method at every budget, on both validation and test accuracy.** At 20% removal it matches the full graph (0.810 vs. 0.805 test). At 60% it leads the next-best method by about 2 points. At 40% its test lead over degree (0.786 vs. 0.783) is within seed noise, though its validation lead is clearer.
2. **The teacher-gradient score measures what it claims to.** In a separate check on the seed-0 Cora teacher, actually removing 300 random connections one at a time changed the loss in close agreement with the first-order estimate (correlation 0.88, same sign 86% of the time).
3. **On arxiv, degree-based pruning beat teacher-guided pruning by 1 point and slightly beat the full graph**, while teacher-guided pruning still beat random by 1.7 points. This should not be read as evidence against H1 yet:
   - Every arxiv model ran all 300 epochs, with best epochs between 255 and 299, so all of them were still improving.
   - Training accuracy is about equal to validation accuracy (about 0.68), which indicates underfitting rather than overfitting. Weight decay 5e-4 and 300 epochs are likely too restrictive for arxiv. Published GCN baselines on arxiv reach about 0.71–0.72 test accuracy, though with deeper models and longer training.
   - It is a single seed. On Cora the method gaps at 40% were of similar size to the seed spread.
4. **Feature-similarity pruning is consistently the worst**, below random on both datasets. One possible explanation, not yet tested, is that keeping only connections between nodes with similar input features removes the neighbors that add the most new information.
5. **Edge count matters for latency on arxiv but not on Cora.** Removing 40% of arxiv connections cut CPU inference latency by about a third (317 → 213 ms). On Cora the whole forward pass takes about 3 ms, so the change is small.
6. **Scoring is cheap relative to training.** Teacher-gradient scoring took 1.2 s on arxiv (one forward and backward pass) against about 3.5 minutes to train one model. This is relevant to H3.

## Limitations

- CPU only: GPU latency and peak memory, which the proposal reports, are not measured yet.
- arxiv: one seed, one budget, and undertrained settings.
- Cora: three seeds, so the standard deviations are rough.
- Results come from a temporary environment with unpinned package versions (listed above).

## Next steps

1. Choose arxiv training settings using the full-graph teacher's validation accuracy: more epochs (for example 500–1000) and lower or zero weight decay.
2. Run the full arxiv comparison (3 seeds × 20/40/60% removal) on a GPU to get latency and peak memory, then replace the arxiv section above.
3. If degree-based pruning still matches or beats teacher-guided pruning on arxiv, report it, and consider combining the teacher score with degree information.
