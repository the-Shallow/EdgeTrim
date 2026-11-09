# ARC experiment workflow

Do not submit the full grid until the implementation review is complete and the three full-graph teacher checkpoints exist under `runs/ogbn_arxiv_unpruned_seed{0,1,2}/checkpoint.pt`.

All final timing and memory measurements use the same hardware protocol as the existing baselines: the `gpu_partners` partition, `short_gpu` QOS, and one NVIDIA A30. Each array task is capped at 1 hour 50 minutes. An A30 validation job completed successfully on `gpu05` on November 9, 2026, with CUDA 13.2.

## Job files

- `stage_ogbn_arxiv.slurm`: stage the dataset through the transfer partition.
- `score_teacher_edges.slurm`: create nine teacher-selected graphs for three budgets and three teacher seeds.
- `train_pruned_grid.slurm`: train random, degree, and feature baselines for three budgets and three seeds (27 jobs).
- `train_teacher_students.slurm`: train paired CE and KD students on the nine teacher-selected graphs (18 jobs).
- `train_teacher_students_long600.slurm`: run the two-task, seed-0, 40%-removal CE/KD sensitivity check with 600 maximum epochs and patience 100. It writes to `_long600` directories and does not replace the validated 300-epoch runs.
- `profile_grid.slurm`: profile the three unpruned checkpoints and all 45 pruned checkpoints (48 jobs).
- `submit_full_grid.sh`: submit the grids with the required dependencies.

The array concurrency is `%1` so only one task from each array runs at a time. The standard-pruning and teacher-scoring arrays may run concurrently; teacher-student training waits for scoring, and profiling waits for all training.

## Initial validation

Before the full submission helper is used, submit individual array tasks with `sbatch --array=INDEX hpc/FILE.slurm`. The first end-to-end validation path is:

1. `score_teacher_edges.slurm` task 3: 40% removal, teacher seed 0.
2. `train_teacher_students.slurm` task 3: CE student on that graph.
3. `train_teacher_students.slurm` task 12: KD student on the same graph.
4. Profile the resulting checkpoints directly with `scripts/measure_inference.py` or the corresponding profiling tasks.

After inspecting all artifacts, submit `bash hpc/submit_full_grid.sh` from the repository root.

## Training-horizon sensitivity

Before the full grid, submit `hpc/train_teacher_students_long600.slurm`. Task 0 is CE and task 1 is KD; both reuse the validated 40%-removal, teacher-seed-0 graph. Compare best validation accuracy and best epoch with the 300-epoch runs. If improvement occurs after epoch 300, update the main grid consistently for every pruning method. Otherwise retain the validated 300-epoch protocol.
