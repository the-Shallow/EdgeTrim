# Results

Committed copies of experiment outputs. Raw runs (checkpoints and per-run files) are written to `runs/`, which is not tracked by git; this folder keeps the small tables and run records needed to trace every reported number.

Each experiment gets a subfolder:

- `h1/`: teacher-guided edge selection against random, degree-based, and feature-similarity pruning. See [h1/FINDINGS.md](h1/FINDINGS.md).

For every run, the subfolder contains:

| File | Contents |
| --- | --- |
| `<dataset>_summary.csv` | Mean and standard deviation across seeds for each method and removal fraction |
| `<dataset>_results.csv` | One row per seed, method, and removal fraction |
| `<dataset>_run_info.json` | Effective configuration, graph counts after preprocessing, package versions, and hardware |

To regenerate a table, rerun the command listed in the findings file and copy `summary.csv`, `results.csv`, and `run_info.json` from the run directory.
