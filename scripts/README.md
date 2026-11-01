# Experiment entry points

Put runnable commands here as the teacher and baselines are implemented:

- `train_teacher.py`: load a dataset, train the full-graph GCN, select a checkpoint by validation accuracy, and save metrics.
- `measure_inference.py`: reload a checkpoint and measure warm inference latency and peak GPU memory.
- `run_random_baseline.py`: remove undirected connections at a fixed budget, retrain the same GCN, and save a comparable run.

All scripts should use `configs/teacher.yaml`, write their effective configuration to `runs/`, and accept a seed explicitly. Do not report a result without its run directory.
