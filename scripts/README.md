# Experiment entry points

Experiment entry points:

- `prepare_ogbn_arxiv.py`: download/load ogbn-arxiv and print dataset/split dimensions. Run through the `xfer` partition before a compute job because compute nodes lack outside network access.
- `train_ogbn_arxiv.py`: train the full-graph GCN on the official OGB splits, selecting the checkpoint by validation accuracy.
- `train_teacher.py`: Cora pipeline check.
- `measure_inference.py`: reload a checkpoint and measure warm inference latency and peak GPU memory.
- `run_random_baseline.py`: remove undirected connections at a fixed budget, retrain the same GCN, and save a comparable run.

The ogbn-arxiv entry point accepts a seed and writes its effective configuration, metrics, and checkpoint under `runs/`. Do not report a result without its run directory.
