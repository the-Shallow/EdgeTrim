# Experiment entry points

Experiment entry points:

- `prepare_ogbn_arxiv.py`: download/load ogbn-arxiv and print dataset/split dimensions. Run through the `xfer` partition before a compute job because compute nodes lack outside network access.
- `train_ogbn_arxiv.py`: train the GCN on the official OGB splits with `unpruned`, exact-budget `random`, or `degree` edge selection, selecting the checkpoint by validation accuracy.
- `train_teacher.py`: Cora pipeline check.
- `measure_inference.py`: reload a checkpoint and measure warm inference latency and peak GPU memory.
- `train_random_baseline.py`: remove Cora connections randomly, retrain the same GCN, and save a comparable run.
- `train_degree_baseline.py`: retain Cora connections using the inverse-endpoint-degree score and retrain the same GCN.

The ogbn-arxiv entry point accepts a method and seed and writes its effective configuration, edge budget, metrics, and checkpoint under `runs/`. Do not report a result without its run directory.
