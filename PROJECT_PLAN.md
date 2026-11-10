# EdgeTrim-KD: Project plan and checkpoints

## Project goal

Study whether a GNN teacher trained on the original graph can guide edge removal, and whether knowledge distillation can help a student retain accuracy on the resulting sparse graph. The eventual comparison is accuracy and measured inference cost at the same edge budgets.

The implementation target is now **ogbn-arxiv only**. Cora has served its purpose as an early pipeline check and is not part of the remaining experiment matrix. Finish the pruning, distillation, and profiling code first; then prepare the ARC/Slurm launch scripts; only after that should we submit additional ogbn-arxiv experiments.

**Current execution rule:** do not launch or spend time on toy-graph verification during the coding phase. Complete the production code paths first, prepare the ARC experiment scripts afterward, and then validate the complete pipeline with an initial ogbn-arxiv job before launching the full grid.

## What “full graph” means

The teacher receives the benchmark's original node features and graph connectivity, before any project-specific edge pruning. For transductive node classification, message passing may use features and edges associated with validation and test nodes. Only **training-node labels** contribute to the training loss. Validation labels are used for model selection; test labels are reserved for the final reported result.

Record the exact graph preparation choices (directed versus undirected edges, self-loops, duplicate edges, and normalization) so that later sparse-graph comparisons use the same conventions.

## Dataset and model scope

- **Cora:** Historical implementation check only. Do not include it in new experiments or the final comparison grid.
- **ogbn-arxiv:** The sole experimental benchmark. Use the official OGB split and evaluator, with accuracy as the primary quality metric.
- **Teacher:** Start with a two-layer GCN on the unpruned graph. Fix and record hidden width, dropout, optimizer, learning rate, weight decay, training epochs, early-stopping rule, and random seeds. Add a two-layer GraphSAGE teacher only if the GCN results and baseline measurements are ready.

## Checkpoints before the proposal presentation

### 1. Data and protocol are fixed

- Load Cora and ogbn-arxiv; record node/edge counts after graph preparation, feature dimensions, class counts, and train/validation/test counts.
- Confirm that training uses only training labels and that each method uses the same splits and graph conventions.
- Decide the hardware and timing protocol: warm-up runs, repeated inference runs, synchronization on GPU, and whether data transfer/preprocessing is included.

**Done when:** A short configuration record is sufficient to recreate both datasets and splits.

### 2. Full-graph teacher runs end to end

- Train the two-layer GCN on Cora as a pipeline check, then on ogbn-arxiv.
- Save the best checkpoint selected by validation accuracy. Report train, validation, and test accuracy, training time, full-graph inference latency, and peak GPU memory where available.
- Run multiple fixed seeds if time permits; otherwise label the presentation result clearly as a single run.

**Done when:** The saved teacher reloads and reproduces its reported evaluation result under the recorded setup.

### 3. Establish simple comparison baselines

- **Unpruned teacher:** The 0% edge-removal accuracy and inference-cost reference.
- **Random edge pruning:** At least one nonzero removal level (40% is a useful first point); retrain the same two-layer model on the pruned graph.
- **Degree-based pruning:** Add if the random baseline is complete. Specify the edge score and tie-breaking rule before running it.
- Use the same model capacity, training budget, split, and measurement protocol for these comparisons. Record retained edge count, not just the nominal percentage.

**Done when:** A small table shows accuracy, retained edges, latency, and memory for the unpruned model and at least one pruned baseline, with seed count stated.

### 4. Prepare the presentation evidence

- Show the research question, teacher/student pipeline, dataset and split choices, and why the unpruned teacher is the reference point.
- Show actual baseline results with hardware, seed count, and timing method in the caption. Separate measured findings from planned experiments.
- Close with the next experiments: teacher-guided edge scoring, sparse-student distillation, more edge budgets, and accuracy-versus-latency analysis.

**Done when:** Every number on the slides can be traced to a saved run and configuration.

## Current status

- Completed on ogbn-arxiv: unpruned, random 40% removal, and degree-based 40% removal, each with seeds 0, 1, and 2.
- Coding complete, pending ARC execution: feature-similarity pruning, teacher-gradient edge scoring, reusable sparse-graph artifacts, controlled CE/KD student training, and dedicated inference profiling.
- ARC/Slurm workflow prepared: standard pruning grid, teacher scoring, paired CE/KD students, inference profiling, and dependency-aware submission.
- Final hardware fixed to NVIDIA A30 on `gpu_partners` / `short_gpu`, matching the existing nine ogbn-arxiv baseline runs. A live A30 allocation check completed successfully on November 9, 2026.
- Seed-0, 40%-removal validation completed on A30 for feature pruning, teacher scoring, teacher-guided CE, teacher-guided KD, and sparse-model inference profiling. Every job completed with exit code 0. CE and KD used byte-equivalent connectivity tensors from the same teacher-selected graph.
- Preliminary seed-0 test accuracy: feature 63.04%, teacher-guided CE 64.56%, and teacher-guided KD 63.04%. These are validation findings, not final multi-seed conclusions.
- The copied unpruned seed-0 inference reference has median latency 18.85 ms and peak memory 2.72 GiB. The 40%-removal sparse runs have median latency about 12.62-12.68 ms and peak memory 1.81 GiB, corresponding to approximately 33% latency and 33.6% inference-memory reductions on A30.
- A separate 600-epoch sensitivity array is prepared for teacher-guided CE and KD at 40% removal, seed 0, with patience 100. Its results determine whether the final grid retains 300 epochs or adopts a longer common training horizon.
- The 600-epoch sensitivity completed successfully. CE selected epoch 458, stopped at 558, and improved validation/test accuracy from 66.37%/64.56% to 66.56%/65.14%. KD selected epoch 387, stopped at 487, and improved validation/test accuracy from 64.66%/63.04% to 64.78%/63.13%. Because both best epochs exceed 300, the final fair-comparison grid should use the longer common horizon for every method; KD still underperforms CE at this configuration.
- The production grid now uses 600 maximum epochs and patience 100 for every width-128 method, retrains all three full-graph teachers before scoring, stores final artifacts under `runs/final600`, and adds a focused width-64 seed-0 ablation at 40% removal (unpruned CE, teacher-selected CE, and teacher-selected KD). Final profiling covers 51 checkpoints.
- The final grid completed successfully: 51 checkpoints, 51 training metric files, 51 inference profiles, and 9 teacher-scoring records, with no invalid JSON artifacts. Across three seeds, degree pruning is the strongest selector: 67.62%, 67.22%, and 64.57% mean test accuracy at 20%, 40%, and 60% removal versus 67.55% unpruned. Teacher-guided CE reaches 66.95%, 65.05%, and 60.49%; KD is lower at every budget (65.38%, 63.42%, and 58.95%).
- On A30, mean median inference latency scales from 18.91 ms unpruned to about 15.8, 12.6, and 9.6 ms at 20%, 40%, and 60% removal; peak inference memory scales from 2.72 GiB to 2.26, 1.81, and 1.35 GiB. The width-64 seed-0 control has 10,856 parameters versus 21,672 and shows that unpruned width-64 (66.75%, 11.86 ms, 1.46 GiB) dominates teacher-guided width-128 at 40% removal (65.05%, 12.61 ms, 1.81 GiB).
- Approximate teacher-CE break-even counts from mean A30 wall times are 10,349/22,545 inferences at 20% removal, 4,146/10,263 at 40%, and 2,129/6,229 at 60% for pretrained-teacher/from-scratch scenarios. These calculations exclude the still-unrecorded KD teacher-logit preparation cost; KD is not Pareto-competitive at the tested hyperparameters.
- Before the full grid: measure KD teacher-logit preparation cost, profile the unpruned seed-0 reference, and strengthen inference warm-up because validation timings showed an early high-latency regime.
- Deferred until the ARC workflow and final implementation review are complete: all new ogbn-arxiv training and profiling runs.

## Next implementation checkpoints

Complete these in order. Method implementation comes first; ARC scripts and experiment execution come afterward.

### 1. Complete and integrate feature-similarity pruning — coded

- Add `feature` as a supported method in `scripts/train_ogbn_arxiv.py`.
- Pass `data.x` into the selector and retain exactly the same connection budget as random and degree pruning.
- Record the selector name, retained connection count, requested/actual removal fraction, and feature-scoring time in the run configuration.

**Done when:** the production training entry point contains the complete feature-similarity path and required metadata fields. Runtime experiment validation is deferred to the ARC phase.

### 2. Implement teacher-guided edge scoring — coded

- Load the saved full-graph teacher and keep its parameters fixed.
- Define one gate per graph connection and compute the teacher-loss gradient with respect to the gates.
- Convert directional values into one deterministic score per undirected connection.
- Select an exact connection budget and save the selected sparse graph for reuse.
- Record edge-scoring wall time and peak memory separately from student training.

**Done when:** the production code can compute scores, select an exact undirected connection budget, and save the selected graph and scoring metadata for reuse. Runtime validation is deferred to the ARC phase.

### 3. Implement controlled student training with and without KD — coded

- Train the same student on the same saved sparse graph under CE-only and CE+KD conditions.
- Expose and record KD weight `alpha`, temperature `T`, student width, seed, and teacher checkpoint.
- Keep graph, architecture, optimizer, seed, early stopping, and training budget identical within each CE/KD pair.

**Done when:** both loss modes run through the same entry point and differ only in the intended loss configuration.

### 4. Add dedicated inference profiling — coded

- Reload a saved checkpoint independently of training.
- Measure warm full-batch inference latency with GPU synchronization and repeated trials.
- Measure peak inference memory separately from training memory.
- Store raw repetitions or sufficient summary statistics to audit the reported median.

**Done when:** profiling produces reproducible latency and memory fields for any saved method checkpoint.

### 5. Prepare the ARC experiment scripts — coded

- Prepare the ARC environment, data-staging, and Slurm submission paths only after checkpoints 1-4 are coded.
- Support random, degree, feature similarity, teacher-guided CE, and teacher-guided KD.
- Support 20%, 40%, and 60% edge removal and seeds 0, 1, and 2.
- Use unique run directories and prevent accidental overwriting.
- Add a one-job validation path before any array submission.

**Done when:** every planned run maps to one unique, reviewable configuration and output directory.

### 6. Freeze the implementation before experiments

- Review graph preprocessing, exact edge budgets, model settings, split usage, timing boundaries, and saved metadata across all methods.
- Confirm that test labels never affect pruning, training, early stopping, or hyperparameter choices.
- Commit or otherwise record the exact code revision used for the experiment grid.

**Done when:** the comparison protocol is fixed and no method-specific training advantage remains.

## Deferred ogbn-arxiv experiment checkpoints

Run these only after implementation checkpoints 1-6 are complete.

1. Run one seed at 40% removal for feature similarity, teacher-guided CE, and teacher-guided KD; inspect every artifact.
2. Run all five pruned variants at 40% removal for seeds 0, 1, and 2.
3. Expand the validated grid to 20% and 60% removal.
4. Profile inference latency and memory for the unpruned reference and every final sparse checkpoint.
5. Compare methods at matched retained-edge counts and report mean and variability across seeds.
6. Calculate break-even inference counts both with teacher training included and with a pretrained teacher assumed.
7. Produce accuracy-versus-edge-budget and accuracy-versus-latency plots, then write the final report and presentation.

## Results log template

| Dataset | Method | Edges kept | Seed(s) | Val accuracy | Test accuracy | Inference latency | Peak GPU memory | Notes |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| ogbn-arxiv | Full-graph GCN | Recorded in saved runs | 0, 1, 2 | Recorded | Recorded | Pending dedicated profiling | Recorded training peak | Main reference |
| ogbn-arxiv | Random pruning, 40% removal | Recorded in saved runs | 0, 1, 2 | Recorded | Recorded | Pending dedicated profiling | Recorded training peak | Completed baseline |
| ogbn-arxiv | Degree pruning, 40% removal | Recorded in saved runs | 0, 1, 2 | Recorded | Recorded | Pending dedicated profiling | Recorded training peak | Completed baseline |
| ogbn-arxiv | Feature-similarity pruning | Deferred | 0, 1, 2 | Deferred | Deferred | Deferred | Deferred | Implement and validate first |
| ogbn-arxiv | Teacher-guided, CE only | Deferred | 0, 1, 2 | Deferred | Deferred | Deferred | Deferred | Implement and validate first |
| ogbn-arxiv | Teacher-guided, CE + KD | Deferred | 0, 1, 2 | Deferred | Deferred | Deferred | Deferred | Implement and validate first |

## Open implementation choices to settle before comparing methods

- Graph library and exact GCN implementation.
- Edge handling for ogbn-arxiv (direction, reciprocal edges, self-loops, and duplicates).
- Whether latency measures full-batch inference or a specified batched inference workload.
- Final KD hyperparameters and whether the 64-width student remains an additional ablation after the controlled 128-width comparison.

Source proposal: `MLG_PROJECT_PROPOSAL.pdf`.
