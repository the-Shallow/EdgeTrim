# ARC experiment workflow

Do not submit the full grid until the implementation review is complete and the three full-graph teacher checkpoints exist under `runs/ogbn_arxiv_unpruned_seed{0,1,2}/checkpoint.pt`.

All final timing and memory measurements use the same hardware protocol as the existing baselines: the `gpu_partners` partition, `short_gpu` QOS, and one NVIDIA A30. Each array task is capped at 1 hour 50 minutes. An A30 validation job completed successfully on `gpu05` on November 9, 2026, with CUDA 13.2.

## Job files

- `stage_ogbn_arxiv.slurm`: stage the dataset through the transfer partition.
- `train_final_teachers.slurm`: retrain the three width-128 full-graph teachers with 600 maximum epochs and patience 100.
- `train_strong_teachers.slurm`: train the three OGB-style teachers (3 layers, width 256, BatchNorm) for 500 epochs without effective early stopping. Outputs are isolated under `runs/strong_teacher` and do not replace the completed final-grid teachers.
- `score_strong_teacher_edges.slurm`: create nine strong-teacher-selected graphs for 20%, 40%, and 60% removal over three matched seeds.
- `train_strong_teacher_students.slurm`: train paired width-128 CE and KD students on the nine strong-teacher-selected graphs (18 jobs) with the final 600-epoch protocol.
- `profile_strong_teacher_grid.slurm`: profile the three strong teachers and all 18 strong-teacher sparse students.
- `submit_strong_teacher_grid.sh`: verify all three strong checkpoints and submit scoring, student training, and profiling with `afterok` dependencies.
- `train_kd_sweep40_seed0.slurm`: run the focused seed-0 KD sweep on the fixed strong-teacher 40%-removal graph for alpha in `{0.1, 0.25, 0.5, 0.75}` and temperature in `{1, 2, 4}`.
- `submit_kd_sweep40.sh`: verify the seed-0 strong teacher and selected graph, then submit the 12-task KD sweep.
- `train_kd_confirm40.slurm`: confirm the two seed-0 sweep finalists (`alpha=0.75, T=2` and `alpha=0.5, T=2`) on matched teachers and selected graphs for seeds 1 and 2.
- `submit_kd_confirm40.sh`: verify the required seed-1/2 teacher and graph artifacts, then submit the four confirmation jobs.
- `score_teacher_edges.slurm`: create nine teacher-selected graphs from the final long-horizon teachers.
- `train_pruned_grid.slurm`: train random, degree, and feature baselines for three budgets and three seeds with the final long-horizon protocol (27 jobs).
- `train_teacher_students.slurm`: train paired width-128 CE and KD students on the nine teacher-selected graphs with the final long-horizon protocol (18 jobs).
- `train_small_student_ablation.slurm`: train the focused seed-0 width-64 controls at 40% removal: unpruned CE, teacher-selected CE, and teacher-selected KD.
- `train_teacher_students_long600.slurm`: run the two-task, seed-0, 40%-removal CE/KD sensitivity check with 600 maximum epochs and patience 100. It writes to `_long600` directories and does not replace the validated 300-epoch runs.
- `profile_grid.slurm`: profile 51 final checkpoints: three width-128 unpruned models, 45 width-128 pruned models, and the three width-64 ablation models.
- `submit_full_grid.sh`: submit the grids with the required dependencies.

The array concurrency is `%1` so only one task from each array runs at a time. Final teachers and standard pruning may run concurrently. Teacher scoring waits for final teachers; both student arrays wait for scoring; profiling waits for every training array.

## Initial validation

Before the full submission helper is used, submit individual array tasks with `sbatch --array=INDEX hpc/FILE.slurm`. The first end-to-end validation path is:

1. `score_teacher_edges.slurm` task 3: 40% removal, teacher seed 0.
2. `train_teacher_students.slurm` task 3: CE student on that graph.
3. `train_teacher_students.slurm` task 12: KD student on the same graph.
4. Profile the resulting checkpoints directly with `scripts/measure_inference.py` or the corresponding profiling tasks.

After inspecting all artifacts, submit `bash hpc/submit_full_grid.sh` from the repository root.

## Strong-teacher follow-up

Validate the stronger architecture with seed 0 before generating new teacher-selected graphs:

```bash
mkdir -p runs/strong_teacher
sbatch --array=0 hpc/train_strong_teachers.slurm
```

The expected checkpoint is `runs/strong_teacher/ogbn_arxiv_ogb_gcn_seed0/checkpoint.pt`. Inspect its `config.json` and `metrics.json`; continue with seeds 1 and 2 only after confirming that the validation and test results improve materially over the completed two-layer teacher.

After all three strong teachers are complete and inspected, submit the isolated follow-up grid with:

```bash
bash hpc/submit_strong_teacher_grid.sh
```

This follow-up does not rerun random, degree, or feature pruning. Those completed teacher-independent baselines remain the comparison controls.

## Focused KD hyperparameter sweep

The first tuning stage holds the teacher, selected graph, student architecture, optimizer, seed, and training horizon fixed. It varies only KD alpha and temperature at 40% removal:

```bash
bash hpc/submit_kd_sweep40.sh
```

Choose candidates using validation accuracy only. After the seed-0 sweep, confirm the best one or two configurations on seeds 1 and 2 before interpreting their test accuracy. Inference profiling is unnecessary during the sweep because every candidate has identical student architecture and graph connectivity.

The seed-0 sweep selected `alpha=0.75, T=2` and `alpha=0.5, T=2` as the top two validation configurations. Confirm them with:

```bash
bash hpc/submit_kd_confirm40.sh
```

## Training-horizon sensitivity

Before the full grid, submit `hpc/train_teacher_students_long600.slurm`. Task 0 is CE and task 1 is KD; both reuse the validated 40%-removal, teacher-seed-0 graph. Compare best validation accuracy and best epoch with the 300-epoch runs. If improvement occurs after epoch 300, update the main grid consistently for every pruning method. Otherwise retain the validated 300-epoch protocol.
