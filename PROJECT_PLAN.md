# EdgeTrim-KD: Project plan and checkpoints

## Project goal

Study whether a GNN teacher trained on the original graph can guide edge removal, and whether knowledge distillation can help a student retain accuracy on the resulting sparse graph. The eventual comparison is accuracy and measured inference cost at the same edge budgets.

The immediate goal is narrower: **have a reproducible full-graph teacher and credible baseline results for the proposal presentation next week**. Teacher-guided edge scoring and distillation come after that presentation.

## What “full graph” means

The teacher receives the benchmark's original node features and graph connectivity, before any project-specific edge pruning. For transductive node classification, message passing may use features and edges associated with validation and test nodes. Only **training-node labels** contribute to the training loss. Validation labels are used for model selection; test labels are reserved for the final reported result.

Record the exact graph preparation choices (directed versus undirected edges, self-loops, duplicate edges, and normalization) so that later sparse-graph comparisons use the same conventions.

## Datasets and first model

- **Cora:** Small implementation check. Use its standard split and record which version/source supplies that split.
- **ogbn-arxiv:** Main benchmark. Use the official OGB split and evaluator, with accuracy as the primary quality metric.
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

## Later project checkpoints

1. Implement teacher-guided edge scoring with a precisely defined score, edge budget, and graph-preparation policy.
2. Compare random, degree-based, feature-similarity, and teacher-guided pruning at matched retained-edge counts.
3. Train sparse-graph students with and without distillation so its contribution can be measured separately.
4. Repeat key runs across seeds and edge budgets; report accuracy, inference latency, peak memory, and the one-time cost of scoring edges.
5. Analyze when the scoring cost is recovered by repeated inference, and write the final report with limitations.

## Results log template

| Dataset | Method | Edges kept | Seed(s) | Val accuracy | Test accuracy | Inference latency | Peak GPU memory | Notes |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Cora | Full-graph GCN | TBD | TBD | TBD | TBD | TBD | TBD | Pipeline check |
| ogbn-arxiv | Full-graph GCN | TBD | TBD | TBD | TBD | TBD | TBD | Main reference |
| ogbn-arxiv | Random pruning | TBD | TBD | TBD | TBD | TBD | TBD | Same model and protocol |
| ogbn-arxiv | Degree-based pruning | TBD | TBD | TBD | TBD | TBD | TBD | If ready for presentation |

## Open implementation choices to settle before comparing methods

- Graph library and exact GCN implementation.
- Edge handling for ogbn-arxiv (direction, reciprocal edges, self-loops, and duplicates).
- Whether latency measures full-batch inference or a specified batched inference workload.
- Number of seeds and edge budgets feasible on the available hardware.

Source proposal: `MLG_PROJECT_PROPOSAL.pdf`.
