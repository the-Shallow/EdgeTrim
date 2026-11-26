import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SKILL_DIR = "C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/Presentations";
const RUNTIME_PYTHON = "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe";
const TOOL = "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";
const { Presentation, PresentationFile } = await import(pathToFileURL(TOOL).href);

const ROOT = "D:/NCSU/SEM3/MLG/EdgeTrim";
const BUILD = path.join(ROOT, ".presentation_build");
const FINAL = path.join(ROOT, "deliverables/EdgeTrim_Research_Update_40min.pptx");
await fs.mkdir(BUILD, { recursive: true });
await fs.mkdir(path.dirname(FINAL), { recursive: true });

const W = 1280, H = 720;
const C = {
  bg: "#122A29", bg2: "#1B3937", bg3: "#244542", white: "#F4F3EB",
  soft: "#D8E1D9", muted: "#AABBB2", teal: "#72C8BE", gold: "#E4BD67",
  coral: "#E47E67", blue: "#7EAED0", line: "#44605A", ink: "#183330",
  paper: "#F4F1E7", paper2: "#E8E6DB", darkText: "#233D38", grayText: "#556A63",
};
const HEAD = "Georgia";
const BODY = "Aptos";
const p = Presentation.create({ slideSize: { width: W, height: H } });

function txt(slide, text, x, y, w, h, opts = {}) {
  const s = slide.shapes.add({
    geometry: "textbox", name: opts.name || undefined,
    position: { left: x, top: y, width: w, height: h },
    fill: "none", line: { style: "solid", fill: "none", width: 0 },
  });
  s.text = text;
  s.text.style = {
    typeface: opts.font || BODY,
    fontSize: opts.size || 22,
    color: opts.color || C.white,
    bold: !!opts.bold,
    italic: !!opts.italic,
    alignment: opts.align || "left",
    verticalAlignment: opts.valign || "top",
    wrap: opts.wrap || "square",
    autoFit: opts.autofit || "shrinkText",
    lineSpacing: opts.lineSpacing || 1.05,
    insets: opts.insets === undefined ? 0 : opts.insets,
  };
  return s;
}
function rect(slide, x, y, w, h, fill, line = C.line, radius = 12, name) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line || "none", width: line ? 1 : 0 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}
function line(slide, x1, y1, x2, y2, color = C.line, width = 2, dash = "solid") {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x1, top: y1, width: x2 - x1, height: y2 - y1 },
    fill: "none",
    line: { style: dash, fill: color, width },
  });
}
function ellipse(slide, x, y, d, fill, stroke = C.paper, sw = 2) {
  return slide.shapes.add({
    geometry: "ellipse", position: { left: x, top: y, width: d, height: d },
    fill, line: { style: "solid", fill: stroke, width: sw },
  });
}
const TALK_TIMES = [1, 1, 2, 2, 3, 2, 2, 2, 1, 2, 2, 1, 3, 2, 2, 2, 2, 3, 2, 1, 0];
function notes(slide, text) {
  const idx = p.slides.items.length - 1;
  const timeText = TALK_TIMES[idx] ? "Target duration: about " + TALK_TIMES[idx] + " minute(s).\n\n" : "Q&A after the 40-minute talk.\n\n";
  const sourceText = idx >= 9 && idx <= 17
    ? "\n\nSources: PROJECT_PLAN.md and experiment artifacts under runs/ (main grid, strong_teacher_grid, and kd_sweep40_seed0 as relevant)."
    : "";
  slide.speakerNotes.text = timeText + text + sourceText;
}
function chrome(slide, n, kicker, title, subtitle = "") {
  slide.background.fill = C.bg;
  txt(slide, String(n).padStart(2, "0") + "  /  " + kicker.toUpperCase(), 64, 28, 560, 22,
    { size: 13, color: C.gold, bold: true });
  txt(slide, title, 64, 66, 1152, 62, { font: HEAD, size: 42, bold: true });
  if (subtitle) txt(slide, subtitle, 66, 132, 1110, 42, { size: 20, color: C.soft });
  line(slide, 64, 680, 1216, 680, C.line, 1);
  txt(slide, "EdgeTrim-KD  |  Research update", 64, 689, 620, 18, { size: 12, color: C.muted });
  txt(slide, String(n).padStart(2, "0"), 1164, 689, 52, 18, { size: 12, color: C.muted, align: "right" });
}
function badge(slide, label, x, y, w, color = C.teal) {
  txt(slide, label.toUpperCase(), x, y, w, 20, { size: 13, bold: true, color });
}
function bullet(slide, text, x, y, w, size = 21, color = C.white, dot = C.teal, h = 56) {
  ellipse(slide, x, y + 8, 10, dot, dot, 0);
  txt(slide, text, x + 23, y, w - 23, h, { size, color });
}
function addTable(slide, data, x, y, w, h, widths, fontSize = 17) {
  const t = slide.tables.add({ rows: data.length, columns: data[0].length, left: x, top: y, width: w, height: h, values: data, columnWidths: widths });
  t.styleOptions = { headerRow: true, bandedRows: true };
  t.borders.assign({ style: "solid", fill: C.line, width: 1 });
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const cell = t.getCell(r, c);
      cell.fill = r === 0 ? C.bg3 : (r % 2 === 0 ? "#203E3B" : "#183532");
      cell.text.style = {
        typeface: BODY, fontSize: r === 0 ? fontSize - 1 : fontSize,
        color: r === 0 ? C.gold : C.white, bold: r === 0,
        verticalAlignment: "middle", alignment: c === 0 ? "left" : "center",
        autoFit: "shrinkText", insets: { left: 10, right: 8, top: 4, bottom: 4 },
      };
    }
  }
  return t;
}
function addChart(slide, type, cfg) {
  const base = {
    chartFill: C.paper, chartLine: { style: "solid", fill: "#D0D4C9", width: 1 },
    plotAreaFill: C.paper, plotAreaLine: { style: "solid", fill: "none", width: 0 },
    xAxis: { textStyle: { typeface: BODY, fontSize: 14, fill: C.darkText }, line: { style: "solid", fill: "#899990", width: 1 }, majorGridlines: null },
    yAxis: { textStyle: { typeface: BODY, fontSize: 13, fill: C.grayText }, line: { style: "solid", fill: "#899990", width: 1 }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
    titleTextStyle: { typeface: BODY, fontSize: 15, bold: true, fill: C.darkText },
    legend: { position: "bottom", overlay: false, textStyle: { typeface: BODY, fontSize: 13, fill: C.darkText } },
  };
  return slide.charts.add(type, { ...base, ...cfg });
}

// 1. Cover
{
  const s = p.slides.add(); s.background.fill = C.bg;
  txt(s, "EDGE TRIM  /  RESEARCH UPDATE", 72, 54, 520, 24, { size: 14, color: C.gold, bold: true });
  line(s, 72, 96, 1208, 96, C.line, 1);
  txt(s, "Teacher-guided graph\nsparsification and distillation", 72, 164, 1050, 178,
    { font: HEAD, size: 58, color: C.white, bold: true, lineSpacing: 0.98 });
  txt(s, "What do our experiments say about accuracy, model size, and inference cost?", 76, 374, 940, 60,
    { size: 26, color: C.soft });
  rect(s, 72, 500, 4, 66, C.teal, null, 0);
  txt(s, "Machine Learning for Graphs", 94, 500, 640, 30, { size: 20, color: C.white, bold: true });
  txt(s, "40-minute research presentation", 94, 536, 640, 24, { size: 17, color: C.muted });
  line(s, 72, 680, 1208, 680, C.line, 1);
  txt(s, "EdgeTrim-KD  |  ogbn-arxiv", 72, 689, 650, 18, { size: 12, color: C.muted });
  notes(s, "Open with the central question. This talk reports completed experiments and the limits of what they show. The Cora run was an early implementation check; the main comparisons now use ogbn-arxiv.");
}

// 2. Recap
{
  const s = p.slides.add(); chrome(s, 2, "Project recap", "What changed since the proposal", "A brief reset before the results");
  const steps = [
    { x: 78, label: "PIPELINE CHECK", title: "Cora", body: "Validated the initial training workflow." },
    { x: 465, label: "BASELINES", title: "ogbn-arxiv", body: "Built three-seed full-graph, random, and degree references." },
    { x: 852, label: "FOLLOW-UP STUDY", title: "Teacher + student", body: "Compared edge selection, teacher strength, KD, and inference cost." },
  ];
  line(s, 112, 260, 1157, 260, C.line, 3);
  for (const [i, a] of steps.entries()) {
    ellipse(s, a.x, 238, 44, i === 2 ? C.gold : C.teal, C.bg, 2);
    txt(s, String(i + 1), a.x, 248, 44, 20, { size: 18, color: C.bg, bold: true, align: "center" });
    badge(s, a.label, a.x - 20, 322, 240, C.gold);
    txt(s, a.title, a.x - 20, 350, 315, 48, { font: HEAD, size: 34, bold: true });
    txt(s, a.body, a.x - 20, 408, 305, 88, { size: 21, color: C.soft });
  }
  rect(s, 72, 555, 1136, 62, C.bg2, C.line, 10);
  txt(s, "Current evidence is centered on ogbn-arxiv; Cora remains a project milestone, not a main result.", 96, 573, 1080, 32,
    { size: 19, color: C.gold, bold: true, align: "center" });
  notes(s, "This slide reorients listeners who saw the earlier proposal. We used Cora to check the pipeline, then moved to ogbn-arxiv for the experimental comparisons. Since then, we completed old-teacher and larger-teacher student experiments, and measured sparse-model inference.");
}

// 3. Motivation and purpose
{
  const s = p.slides.add(); chrome(s, 3, "Motivation", "Why train a full teacher first?", "The purpose depends on repeated use after preparation");
  txt(s, "ONE-TIME PREPARATION", 84, 222, 430, 24, { size: 15, color: C.gold, bold: true });
  txt(s, "Teacher training\n+ edge scoring\n+ student training", 84, 264, 390, 150, { font: HEAD, size: 36, bold: true, lineSpacing: 1.05 });
  line(s, 502, 245, 502, 493, C.line, 2);
  txt(s, "REPEATED DEPLOYMENT", 566, 222, 500, 24, { size: 15, color: C.teal, bold: true });
  txt(s, "Sparse student inference\nfor each request", 566, 264, 590, 112, { font: HEAD, size: 36, bold: true });
  txt(s, "The proposal is useful only if cumulative inference savings can repay the upfront cost.", 566, 402, 572, 76, { size: 22, color: C.soft });
  rect(s, 82, 535, 1116, 70, C.bg2, C.line, 10);
  txt(s, "Research question: when, if ever, does that break-even point arrive?", 106, 556, 1066, 32,
    { size: 23, color: C.gold, bold: true, align: "center" });
  notes(s, "This addresses the professor's question directly. We are not claiming that training a teacher reduces the initial training cost. The idea is an offline preparation cost in exchange for lower recurring inference cost. If the graph changes frequently or the model is used only a few times, the tradeoff may not pay off. The later break-even estimate makes that assumption explicit.");
}

// 4. Research questions
{
  const s = p.slides.add(); chrome(s, 4, "Research questions", "Five questions organize the experiments", "Each result will map back to one question");
  const items = [
    ["RQ1", "How much accuracy can we retain as we remove graph edges?"],
    ["RQ2", "Does teacher-guided edge selection beat simple selectors?"],
    ["RQ3", "Does knowledge distillation help the sparse student?"],
    ["RQ4", "Do sparsity and a smaller model reduce measured inference cost?"],
    ["RQ5", "How many requests are needed to recover the upfront cost?"],
  ];
  items.forEach((it, i) => {
    const y = 213 + i * 78;
    txt(s, it[0], 90, y, 78, 38, { font: HEAD, size: 26, color: i === 4 ? C.gold : C.teal, bold: true });
    txt(s, it[1], 188, y + 2, 990, 46, { size: 23, color: C.white });
    if (i < items.length - 1) line(s, 88, y + 54, 1185, y + 54, C.line, 1);
  });
  notes(s, "Introduce these as the map for the talk. RQ1 is about the accuracy cost of sparsity. RQ2 isolates the selection rule. RQ3 compares KD with matched CE training. RQ4 checks measured costs rather than assuming that fewer edges guarantee faster inference. RQ5 includes the professor's concern about amortizing preparation.");
}

// 5. Editable architecture diagram
{
  const s = p.slides.add(); chrome(s, 5, "Proposed architecture", "Teacher scores the graph; student serves predictions", "The graph is the input data, and the student is the deployable model");
  const y = 268;
  const blocks = [
    { x: 66, w: 198, title: "Original graph", sub: "features X\nconnections E", fill: C.bg2, color: C.teal },
    { x: 302, w: 205, title: "Frozen teacher", sub: "trained on (X, E)\noutputs logits pᵀ", fill: C.bg3, color: C.gold },
    { x: 545, w: 210, title: "Edge sensitivity", sub: "one gate per\nundirected edge", fill: C.bg2, color: C.teal },
    { x: 793, w: 174, title: "Sparse graph", sub: "keep top-K\nscored edges", fill: C.bg3, color: C.gold },
    { x: 1005, w: 205, title: "Student GCN", sub: "trained on sparse graph\npredicts node labels", fill: C.bg2, color: C.coral },
  ];
  for (const b of blocks) {
    rect(s, b.x, y, b.w, 126, b.fill, C.line, 14);
    txt(s, b.title, b.x + 12, y + 17, b.w - 24, 38, { font: HEAD, size: 22, color: b.color, bold: true, align: "center" });
    txt(s, b.sub, b.x + 12, y + 61, b.w - 24, 52, { size: 17, color: C.soft, align: "center" });
  }
  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i], b = blocks[i + 1];
    line(s, a.x + a.w + 7, y + 64, b.x - 9, y + 64, C.teal, 3);
    ellipse(s, b.x - 13, y + 57, 14, C.teal, C.teal, 0);
  }
  txt(s, "teacher soft targets guide student KD", 507, 397, 310, 19, { size: 14, color: C.gold, align: "center" });
  line(s, 408, 421, 907, 421, C.gold, 2, "dashed");
  rect(s, 302, 447, 453, 120, "#213F3C", C.line, 10);
  txt(s, "TEACHER-LOSS GATE SCORE", 326, 461, 400, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "sₑ = |mₑ · ∂Lteacher / ∂mₑ|", 326, 488, 400, 34, { font: HEAD, size: 24, bold: true });
  txt(s, "Teacher weights stay frozen. Compute scores once, then rank connections.", 326, 529, 405, 30, { size: 16, color: C.soft });
  rect(s, 793, 447, 417, 120, "#213F3C", C.line, 10);
  txt(s, "STUDENT TRAINING", 817, 461, 360, 20, { size: 14, color: C.coral, bold: true });
  txt(s, "L = (1 − α)LCE + αT² KL(pᵀT || pˢT)", 817, 489, 370, 34, { font: HEAD, size: 20, bold: true });
  txt(s, "Teacher probabilities guide the student alongside labels.", 817, 532, 366, 28, { size: 16, color: C.soft });
  notes(s, "Walk left to right. The teacher sees the original graph. For edge scoring, the implementation adds one scalar gate for each undirected connection, holds teacher parameters fixed, and differentiates the training-node cross-entropy through the edge weights. The absolute gate-times-gradient score ranks connections. We retain the top K to form one sparse graph. The student then trains on that graph. In KD mode, the frozen teacher's softened probabilities are also targets. This score is a one-shot sensitivity calculation, not an edge-gate network trained over epochs.");
}

// 6. Model sizes
{
  const s = p.slides.add(); chrome(s, 6, "Teacher and student", "The larger teacher creates room for a smaller student", "Model capacity is part of the compression question");
  addTable(s, [
    ["Role", "Architecture", "Parameters", "Test accuracy"],
    ["Original teacher", "2-layer GCN · width 128", "21,672", "67.55%"],
    ["Stronger teacher", "3-layer GCN · width 256 · BatchNorm", "110,120", "71.86%"],
    ["Student", "2-layer GCN · width 128", "21,672", "Varies by graph/loss"],
    ["Smaller ablation", "2-layer GCN · width 64", "10,856", "66.75% unpruned"],
  ], 82, 218, 1118, 264, [180, 476, 190, 272], 17);
  txt(s, "The width-128 student has about 5.1× fewer parameters than the stronger teacher.", 92, 521, 1080, 36,
    { size: 21, color: C.gold, bold: true, align: "center" });
  txt(s, "The width-64 ablation tests whether edge removal is needed when model size itself can shrink.", 92, 568, 1080, 32,
    { size: 18, color: C.soft, align: "center" });
  notes(s, "The student is smaller relative to the stronger teacher, not relative to the original width-128 teacher. That distinction matters. The original teacher has 21,672 parameters and the stronger teacher has 110,120. Our main student remains width 128, while the width-64 ablation tests model-size reduction separately. The 67.55% and 71.86% teacher accuracies are three-seed means from the full graph.");
}

// 7. Training and loss
{
  const s = p.slides.add(); chrome(s, 7, "Training process", "Scoring and student optimization happen in separate stages", "Only student parameters change during the KD training stage");
  const x0 = 86, y0 = 250, ww = 280;
  const stages = [
    ["1  Score edges", "Freeze teacher weights.\nDifferentiate loss w.r.t. edge gates."],
    ["2  Select graph", "Rank undirected edges.\nKeep the fixed edge budget."],
    ["3  Train student", "Update student weights with labels and teacher targets."],
  ];
  stages.forEach((a, i) => {
    const x = x0 + i * 380;
    rect(s, x, y0, ww, 136, i === 2 ? "#3B3731" : C.bg2, C.line, 14);
    txt(s, a[0], x + 18, y0 + 20, ww - 36, 34, { font: HEAD, size: 24, color: i === 2 ? C.coral : C.teal, bold: true });
    txt(s, a[1], x + 18, y0 + 66, ww - 36, 52, { size: 18, color: C.soft });
    if (i < 2) {
      line(s, x + ww + 18, y0 + 67, x + 350, y0 + 67, C.gold, 3);
      ellipse(s, x + 343, y0 + 60, 14, C.gold, C.gold, 0);
    }
  });
  txt(s, "Ltotal = (1 − α) · LCE(y, pS)  +  α · T² · KL(pT(T) || pS(T))", 84, 458, 1110, 52,
    { font: HEAD, size: 31, color: C.white, bold: true, align: "center" });
  txt(s, "α balances label supervision and teacher matching     |     T softens both output distributions", 108, 526, 1064, 30,
    { size: 18, color: C.soft, align: "center" });
  txt(s, "Teacher parameters are frozen; the student is optimized by backpropagation.", 105, 579, 1070, 28,
    { size: 19, color: C.gold, bold: true, align: "center" });
  notes(s, "Explain the separation carefully. First, compute edge sensitivity once from the frozen teacher. This produces scores; we do not optimize every gate repeatedly. Second, select the fixed budget. Third, train the student. In CE mode the student uses labels only. In KD mode it combines cross-entropy with temperature-scaled KL divergence. The teacher's predictions are precomputed, and the optimizer updates only student weights.");
}

// 8. Experiment setup
{
  const s = p.slides.add(); chrome(s, 8, "Experiment setup", "Matched graph budgets isolate the selector and loss", "The main comparison uses ogbn-arxiv and the official split");
  const left = 86;
  txt(s, "BENCHMARK", left, 222, 200, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "ogbn-arxiv", left, 250, 330, 40, { font: HEAD, size: 30, bold: true });
  txt(s, "Three seeds: 0, 1, 2", left, 298, 355, 28, { size: 19, color: C.soft });
  txt(s, "EDGE REMOVAL", 485, 222, 240, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "20%   40%   60%", 485, 250, 360, 40, { font: HEAD, size: 29, bold: true });
  txt(s, "Matched retained connection counts", 485, 298, 460, 28, { size: 19, color: C.soft });
  txt(s, "METHODS", 886, 222, 180, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "Random · degree\nFeature similarity\nTeacher-gradient", 886, 250, 310, 100, { size: 20, color: C.soft });
  line(s, 86, 385, 1194, 385, C.line, 2);
  txt(s, "For each teacher-guided graph", 88, 420, 480, 34, { font: HEAD, size: 25, color: C.teal, bold: true });
  txt(s, "Same selected graph and student architecture", 88, 472, 475, 30, { size: 19, color: C.soft });
  txt(s, "CE-only  vs  CE + KD", 660, 420, 450, 34, { font: HEAD, size: 25, color: C.coral, bold: true });
  txt(s, "Compare whether teacher targets add value", 660, 472, 485, 30, { size: 19, color: C.soft });
  rect(s, 86, 548, 1108, 58, C.bg2, C.line, 10);
  txt(s, "Width-64 control and seed-0 KD tuning are focused ablations, not part of the full three-seed grid.", 105, 566, 1070, 28,
    { size: 18, color: C.gold, align: "center" });
  notes(s, "Every main pruning method uses the same graph budget and split. The full grid uses three seeds and three edge-removal levels for the major methods. For teacher-guided pruning, CE and KD students share the exact selected connectivity. The width-64 control and the KD hyperparameter sweep answer narrower questions and should not be mistaken for full three-seed results.");
}

// 9. Measures and controls
{
  const s = p.slides.add(); chrome(s, 9, "Evaluation protocol", "Quality, runtime, and memory answer different questions", "Report model quality and system cost together");
  const cols = [
    { x: 92, title: "QUALITY", color: C.teal, lines: ["Test accuracy", "Three-seed means for main comparisons", "Test labels used only for final reporting"] },
    { x: 477, title: "SYSTEM COST", color: C.gold, lines: ["Median inference latency", "Peak inference memory", "A30 · 10 warm-ups + 30 measured runs"] },
    { x: 862, title: "FAIRNESS", color: C.coral, lines: ["Matched edge counts", "CE/KD use same graph and width", "Validation guides model selection"] },
  ];
  cols.forEach(c => {
    txt(s, c.title, c.x, 235, 300, 24, { size: 14, color: c.color, bold: true });
    line(s, c.x, 273, c.x + 300, 273, c.color, 3);
    c.lines.forEach((v, i) => bullet(s, v, c.x, 304 + i * 72, 310, 18, C.soft, c.color, 56));
  });
  rect(s, 90, 557, 1100, 56, C.bg2, C.line, 10);
  txt(s, "Timing uses warm inference with graph data already on the GPU; setup and preprocessing are separate.", 110, 574, 1060, 26,
    { size: 17, color: C.gold, align: "center" });
  notes(s, "Accuracy answers whether the model predicts well. Latency and memory answer whether inference becomes cheaper on the measured hardware. We used an NVIDIA A30, with ten warm-up runs and thirty measured runs, with graph data already on the device. Validation supports model selection; test accuracy is reserved for reporting. This is a controlled benchmark, not a claim about every deployment system.");
}

// 10. Baseline results
{
  const s = p.slides.add(); chrome(s, 10, "Baseline results", "Degree pruning keeps accuracy close at 20% removal", "Three-seed mean test accuracy on ogbn-arxiv");
  addChart(s, "line", {
    position: { left: 70, top: 204, width: 815, height: 412 },
    title: "Three-seed mean test accuracy by selector",
    categories: ["20% removed", "40% removed", "60% removed"],
    series: [
      { name: "Degree", values: [67.62, 67.22, 64.57], line: { style: "solid", fill: C.gold, width: 4 }, marker: { symbol: "circle", size: 9, fill: C.gold } },
      { name: "Random", values: [66.51, 65.34, 63.49], line: { style: "solid", fill: C.blue, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.blue } },
      { name: "Feature similarity", values: [65.60, 63.02, 60.42], line: { style: "solid", fill: C.coral, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.coral } },
    ],
    hasLegend: true,
    yAxis: { min: 59, max: 69, majorUnit: 2, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 13, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "Full graph", 925, 252, 250, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "67.55%", 925, 281, 255, 50, { font: HEAD, size: 40, bold: true });
  txt(s, "At 20% removal, degree is +0.07 pp above full graph.", 925, 343, 260, 62, { size: 18, color: C.teal, bold: true });
  line(s, 925, 423, 1185, 423, C.line, 1);
  txt(s, "At 60% removal", 925, 447, 250, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "−2.98 pp", 925, 478, 250, 42, { font: HEAD, size: 33, color: C.coral, bold: true });
  txt(s, "for degree vs. full graph", 925, 526, 250, 28, { size: 17, color: C.soft });
  notes(s, "At 20% edge removal, degree pruning retains essentially the full-graph accuracy in this three-seed mean: 67.62% versus 67.55%. At 60% removal, the model loses about 2.98 percentage points. This answers the first question with a tradeoff curve, rather than claiming edge removal is free. The random baseline is part of the comparison grid; the current strongest reference is degree pruning.");
}

// 11. Original teacher
{
  const s = p.slides.add(); chrome(s, 11, "Original teacher", "KD trails matched CE at every edge budget", "Teacher-guided students · 2-layer width-128 student · three-seed mean test accuracy");
  addChart(s, "line", {
    position: { left: 70, top: 206, width: 790, height: 408 },
    title: "Test accuracy by edge-removal budget",
    categories: ["20%", "40%", "60%"],
    series: [
      { name: "Degree baseline", values: [67.62, 67.22, 64.57], line: { style: "solid", fill: C.gold, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.gold } },
      { name: "Teacher-guided CE", values: [66.95, 65.05, 60.49], line: { style: "solid", fill: C.teal, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.teal } },
      { name: "Teacher-guided KD", values: [65.38, 63.42, 58.95], line: { style: "solid", fill: C.coral, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.coral } },
    ],
    hasLegend: true, yAxis: { min: 58, max: 69, majorUnit: 2, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 13, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "Matched CE − KD", 900, 257, 280, 24, { size: 15, color: C.gold, bold: true });
  txt(s, "1.5–1.6 pp", 900, 294, 290, 45, { font: HEAD, size: 35, bold: true });
  txt(s, "KD underperforms the same student trained with labels alone.", 900, 350, 270, 70, { size: 19, color: C.soft });
  rect(s, 894, 465, 294, 82, C.bg2, C.line, 10);
  txt(s, "Degree remains the strongest selector in the tested grid.", 914, 486, 254, 48, { size: 18, color: C.gold, bold: true, align: "center" });
  notes(s, "This is the first teacher-guided result. Both student objectives use the same teacher-selected graph and the same width-128 architecture. With the original teacher, KD is lower than CE by about 1.5 to 1.6 percentage points across the three budgets. Degree-based pruning also remains stronger than teacher-guided CE. This motivates asking whether teacher quality explains the weak KD transfer.");
}

// 12. Bigger teacher motivation and comparison
{
  const s = p.slides.add(); chrome(s, 12, "Teacher-strength follow-up", "A larger teacher improved its own predictions", "We tested whether the original teacher provided weak distillation targets");
  addChart(s, "bar", {
    position: { left: 78, top: 222, width: 610, height: 356 },
    title: "Full-graph teacher test accuracy",
    categories: ["Original\n2-layer · 128", "Stronger\n3-layer · 256"],
    series: [{ name: "Three-seed mean (%)", values: [67.55, 71.86], fill: C.teal }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 110 },
    hasLegend: false,
    dataLabels: { showValue: true, position: "outEnd", numberFormatCode: "0.00", textStyle: { typeface: BODY, fontSize: 14, fill: C.darkText, bold: true } },
    yAxis: { min: 62, max: 75, majorUnit: 2, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 13, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "+4.31 pp", 765, 238, 340, 54, { font: HEAD, size: 38, color: C.gold, bold: true });
  txt(s, "mean test-accuracy gain", 768, 292, 390, 25, { size: 17, color: C.soft });
  line(s, 768, 341, 1174, 341, C.line, 1);
  txt(s, "5.1×", 765, 367, 160, 48, { font: HEAD, size: 34, color: C.teal, bold: true });
  txt(s, "more parameters", 906, 382, 255, 24, { size: 17, color: C.soft });
  txt(s, "3.2×", 765, 432, 160, 48, { font: HEAD, size: 34, color: C.coral, bold: true });
  txt(s, "teacher inference latency", 906, 447, 300, 24, { size: 17, color: C.soft });
  txt(s, "A stronger source may help KD, but its offline and inference costs also rise.", 765, 522, 408, 62, { size: 19, color: C.gold, bold: true });
  notes(s, "The original two-layer width-128 full-graph teacher averaged 67.55% test accuracy. The larger three-layer width-256 BatchNorm teacher averaged 71.86%, a 4.31 point increase. It also has about 5.1 times as many parameters and 3.2 times the median inference latency. We ran the follow-up because the original teacher's KD student lagged behind CE, and teacher quality could be one reason. The experiment tests that explanation; it does not assume the larger model will solve KD.");
}

// 13. Stronger teacher results
{
  const s = p.slides.add(); chrome(s, 13, "Stronger-teacher results", "Stronger teacher improves KD but CE still leads", "Three-seed mean test accuracy on teacher-guided sparse graphs");
  addChart(s, "line", {
    position: { left: 68, top: 202, width: 818, height: 418 },
    title: "Accuracy by removal level",
    categories: ["20%", "40%", "60%"],
    series: [
      { name: "Degree", values: [67.62, 67.22, 64.57], line: { style: "solid", fill: C.gold, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.gold } },
      { name: "Old teacher · CE", values: [66.95, 65.05, 60.49], line: { style: "solid", fill: C.blue, width: 2 }, marker: { symbol: "square", size: 7, fill: C.blue } },
      { name: "Old teacher · KD", values: [65.38, 63.42, 58.95], line: { style: "solid", fill: "#B37D74", width: 2 }, marker: { symbol: "square", size: 7, fill: "#B37D74" } },
      { name: "Strong teacher · CE", values: [67.21, 65.29, 60.82], line: { style: "solid", fill: C.teal, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.teal } },
      { name: "Strong teacher · KD", values: [66.88, 64.89, 60.11], line: { style: "solid", fill: C.coral, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.coral } },
    ],
    hasLegend: true,
    yAxis: { min: 58, max: 69, majorUnit: 2, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 13, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "KD gain vs. old teacher", 915, 238, 270, 22, { size: 15, color: C.gold, bold: true });
  txt(s, "+1.15 to\n+1.50 pp", 915, 271, 260, 88, { font: HEAD, size: 34, color: C.teal, bold: true });
  txt(s, "Yet strong-teacher KD remains 0.33–0.71 pp below matched CE.", 915, 380, 250, 74, { size: 18, color: C.soft });
  rect(s, 910, 487, 284, 84, C.bg2, C.line, 10);
  txt(s, "RQ3 answer so far: a better teacher helps, but KD still does not beat CE.", 928, 503, 248, 54, { size: 17, color: C.gold, bold: true, align: "center" });
  notes(s, "The stronger teacher improves teacher-guided KD over the old-teacher KD by 1.50, 1.47, and 1.15 percentage points at 20, 40, and 60 percent removal. This supports the idea that teacher quality mattered. However, KD remains below its matched CE student by 0.33, 0.39, and 0.71 points, and degree pruning remains the strongest selector. We should therefore say stronger teachers help transfer but do not establish that KD improves this sparse student.");
}

// 14. KD tuning
{
  const s = p.slides.add(); chrome(s, 14, "KD tuning", "Temperature 2 led the seed-0 validation sweep", "40% removal · only alpha and temperature changed · one seed");
  addChart(s, "line", {
    position: { left: 72, top: 209, width: 800, height: 404 },
    title: "Validation accuracy (%) by KD alpha",
    categories: ["0.10", "0.25", "0.50", "0.75"],
    series: [
      { name: "T = 1", values: [66.68, 66.70, 66.78, 66.85], line: { style: "solid", fill: C.blue, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.blue } },
      { name: "T = 2", values: [66.77, 66.84, 66.86, 66.90], line: { style: "solid", fill: C.teal, width: 4 }, marker: { symbol: "circle", size: 9, fill: C.teal } },
      { name: "T = 4", values: [66.65, 66.47, 66.39, 66.32], line: { style: "solid", fill: C.coral, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.coral } },
    ],
    hasLegend: true,
    yAxis: { min: 66, max: 67.1, majorUnit: 0.2, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 13, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "Best validation setting", 906, 250, 280, 22, { size: 15, color: C.gold, bold: true });
  txt(s, "α = 0.75\nT = 2", 906, 284, 260, 86, { font: HEAD, size: 34, color: C.teal, bold: true });
  txt(s, "66.90% validation\n66.61% CE control", 906, 391, 260, 52, { size: 19, color: C.soft });
  rect(s, 900, 475, 298, 108, C.bg2, C.line, 10);
  txt(s, "Exploratory only: validation gain is small, and the top settings still need confirmation across seeds.", 919, 493, 260, 72,
    { size: 17, color: C.gold, bold: true, align: "center" });
  notes(s, "This is a 12-run seed-0 sweep at 40 percent removal. Temperature 2 gave the best validation result at each tested alpha, and temperature 4 was consistently weaker. The top validation setting was alpha 0.75, T 2 at 66.90%, versus 66.61% for the seed-0 CE control. The difference is small and this is one seed; do not treat it as a final KD win. The test score is not used for tuning.");
}

// 15. Smaller student comparison
{
  const s = p.slides.add(); chrome(s, 15, "Student-size ablation", "A smaller unpruned model beat the pruned width-128 student", "A direct reminder that edge count and model capacity both matter");
  addTable(s, [
    ["Configuration", "Test acc.", "Latency", "Peak memory", "Params"],
    ["Unpruned · width 128", "67.55%", "18.91 ms", "2.72 GiB", "21,672"],
    ["Unpruned · width 64", "66.75%", "11.86 ms", "1.46 GiB", "10,856"],
    ["Teacher graph · 40% · width 64 CE", "64.32%", "8.34 ms", "0.98 GiB", "10,856"],
    ["Teacher graph · 40% · width 64 KD", "62.78%", "9.77 ms", "0.98 GiB", "10,856"],
    ["Teacher graph · 40% · width 128 CE", "65.05%", "12.61 ms", "1.81 GiB", "21,672"],
  ], 73, 208, 1135, 300, [438, 150, 180, 190, 177], 15);
  rect(s, 105, 535, 1070, 60, C.bg2, C.line, 10);
  txt(s, "Width-64 KD is 1.54 pp below CE; unpruned width 64 also beats the width-128, 40%-pruned CE result.", 126, 552, 1028, 31,
    { size: 17, color: C.gold, bold: true, align: "center" });
  notes(s, "This focused width-64 ablation uses seed 0, so do not treat it as a three-seed result. Unpruned width 64 has 66.75% accuracy, 11.86 ms latency, and 1.46 GiB memory. The width-64 teacher-graph CE student has 64.32%, 8.34 ms, and 0.98 GiB. The width-64 KD version drops to 62.78% and is slower at 9.77 ms, with the same memory. The width-64 unpruned model also exceeds the width-128 40%-pruned CE result in accuracy while using less latency and memory. This makes model capacity a key control.");
}

// 16. Efficiency results
{
  const s = p.slides.add(); chrome(s, 16, "Measured efficiency", "More edge removal reduces latency and memory", "Sparse student profiles on the A30 · mean across CE and KD runs and three seeds");
  addChart(s, "line", {
    position: { left: 66, top: 214, width: 552, height: 374 },
    title: "Median inference latency (ms)",
    categories: ["Full graph", "20%", "40%", "60%"],
    series: [{ name: "Latency", values: [18.91, 15.73, 12.61, 9.68], line: { style: "solid", fill: C.teal, width: 4 }, marker: { symbol: "circle", size: 9, fill: C.teal } }],
    hasLegend: false,
    yAxis: { min: 8, max: 20, majorUnit: 2, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 12, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  addChart(s, "line", {
    position: { left: 657, top: 214, width: 552, height: 374 },
    title: "Peak inference memory (GiB)",
    categories: ["Full graph", "20%", "40%", "60%"],
    series: [{ name: "Memory", values: [2.72, 2.26, 1.81, 1.35], line: { style: "solid", fill: C.gold, width: 4 }, marker: { symbol: "circle", size: 9, fill: C.gold } }],
    hasLegend: false,
    yAxis: { min: 1, max: 3, majorUnit: 0.5, numberFormatCode: "0.0", textStyle: { typeface: BODY, fontSize: 12, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "60% removal: about 49% lower latency and 50% lower peak inference memory than the full-graph reference.", 83, 604, 1110, 30,
    { size: 17, color: C.gold, bold: true, align: "center" });
  notes(s, "These measurements show actual hardware behavior, not an assumption that fewer edges always means proportional speedup. The full-graph reference is 18.91 milliseconds and 2.72 GiB. Sparse-student averages are 15.73, 12.61, and 9.68 milliseconds at 20, 40, and 60 percent removal, with memory of 2.26, 1.81, and 1.35 GiB. One 60-percent KD run is a timing outlier, so describe the 60-percent average as approximate. Results are from an A30 full-batch workload with data already on-device.");
}

// 17. Break-even
{
  const s = p.slides.add(); chrome(s, 17, "Cost amortization", "Break-even depends on whether the teacher already exists", "Estimated inference requests needed to recover preparation cost");
  addChart(s, "bar", {
    position: { left: 74, top: 209, width: 800, height: 403 },
    title: "Approximate break-even request count",
    categories: ["20% removed", "40% removed", "60% removed"],
    series: [
      { name: "Teacher already available", values: [10349, 4146, 2129], fill: C.teal },
      { name: "Train teacher for this pipeline", values: [22545, 10263, 6229], fill: C.coral },
    ],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 75 },
    hasLegend: true,
    dataLabels: { showValue: true, position: "outEnd", numberFormatCode: "#,##0", textStyle: { typeface: BODY, fontSize: 12, fill: C.darkText, bold: true } },
    yAxis: { min: 0, max: 25000, majorUnit: 5000, numberFormatCode: "#,##0", textStyle: { typeface: BODY, fontSize: 12, fill: C.grayText }, majorGridlines: { style: "solid", fill: "#D9DDD3", width: 1 } },
  });
  txt(s, "60% removal", 918, 255, 256, 20, { size: 14, color: C.gold, bold: true });
  txt(s, "2.1k / 6.2k", 918, 290, 260, 41, { font: HEAD, size: 29, bold: true });
  txt(s, "pretrained / from-scratch", 918, 335, 265, 23, { size: 16, color: C.soft });
  rect(s, 908, 397, 284, 116, C.bg2, C.line, 10);
  txt(s, "Approximate model based on mean A30 wall times. KD logit-preparation cost is not included.", 926, 416, 248, 76,
    { size: 17, color: C.gold, bold: true, align: "center" });
  txt(s, "Teacher edge scoring: about 0.45–0.52 s; the model-training costs dominate this estimate.", 911, 533, 280, 55,
    { size: 16, color: C.soft, align: "center" });
  notes(s, "These approximate break-even counts answer the purpose question directly. If the teacher already exists, the estimated request counts are 10,349, 4,146, and 2,129 at 20, 40, and 60 percent removal. If the project must train the teacher from scratch, estimates rise to 22,545, 10,263, and 6,229. They depend on measured mean training and inference times. They do not include KD teacher-logit preparation, so the KD scenario is incomplete and should not be presented as a final economic claim.");
}

// 18. Research question answers
{
  const s = p.slides.add(); chrome(s, 18, "Research question synthesis", "The current evidence answers all five questions", "Answers are limited to the models, budgets, seeds, and hardware we tested");
  addTable(s, [
    ["Research question", "Answer from the current evidence"],
    ["RQ1 · Can we remove edges without much accuracy loss?", "At 20% removal, degree reaches 67.62% vs 67.55% full graph."],
    ["RQ2 · Does teacher-guided scoring win?", "No overall win. Degree is strongest across the tested budgets."],
    ["RQ3 · Does KD help the sparse student?", "Not in the tested settings. Strong-teacher KD trails matched CE."],
    ["RQ4 · Do sparse graphs reduce inference cost?", "Yes. At 60% removal, latency is about 49% lower and memory 50% lower."],
    ["RQ5 · Does the saving recover preparation cost?", "Estimated threshold: about 2.1k–22.5k requests, by cost scenario."],
  ], 70, 214, 1140, 344, [440, 700], 17);
  txt(s, "The tested pipeline improves efficiency, but it does not outperform the simple degree baseline on accuracy.", 86, 587, 1110, 38,
    { size: 19, color: C.gold, bold: true, align: "center" });
  notes(s, "Use this slide to answer the stated research questions explicitly. RQ1: modest edge removal can preserve accuracy with degree pruning, though higher removal costs accuracy. RQ2: teacher-guided selection did not beat degree in this grid. RQ3: a stronger teacher improved KD, but KD still trailed matched CE. RQ4: on the A30, sparsity lowered measured inference latency and memory. RQ5: break-even is possible under repeated use, but the estimate depends on deployment volume and excludes KD logit preparation.");
}

// 19. Limitations and takeaways
{
  const s = p.slides.add(); chrome(s, 19, "Limitations and takeaways", "The evidence favors a simpler selector so far", "A research result can be useful even when the proposed component does not win");
  bullet(s, "Degree pruning has the best accuracy among the tested selectors.", 96, 235, 1050, 23, C.white, C.gold, 54);
  bullet(s, "The stronger teacher improves KD, but matched CE remains ahead.", 96, 322, 1050, 23, C.white, C.teal, 54);
  bullet(s, "KD tuning is still seed-0 evidence; confirmation is needed before claiming a repeatable gain.", 96, 409, 1050, 22, C.white, C.coral, 64);
  line(s, 96, 510, 1180, 510, C.line, 2);
  txt(s, "Takeaway", 96, 538, 180, 23, { size: 14, color: C.gold, bold: true });
  txt(s, "We measured real inference savings, but current results do not show teacher-guided KD beating degree pruning or matched CE.", 96, 571, 1080, 54,
    { font: HEAD, size: 24, color: C.white, bold: true });
  notes(s, "Do not frame this as a failed project. We tested the central ideas and found where they do and do not help. The systems benefit is measurable. The accuracy results favor degree pruning and CE in the tested settings. The seed-0 KD sweep suggests temperature matters, but the improvement needs confirmation across seeds before we interpret it as repeatable. Also keep the break-even estimate qualified.");
}

// 20. Conclusion bridge into Q&A
{
  const s = p.slides.add(); chrome(s, 20, "Conclusion", "What the experiments establish", "");
  txt(s, "Fewer edges can reduce inference cost.", 102, 220, 1080, 52, { font: HEAD, size: 38, color: C.teal, bold: true, align: "center" });
  txt(s, "Teacher quality changes KD transfer.", 102, 318, 1080, 52, { font: HEAD, size: 38, color: C.gold, bold: true, align: "center" });
  txt(s, "But in our tested settings, simple degree pruning and CE remain stronger accuracy references.", 130, 425, 1020, 80,
    { font: HEAD, size: 30, color: C.white, bold: true, align: "center" });
  notes(s, "Close the talk in three statements. Edge removal reduced measured inference cost. The larger teacher improved KD transfer over the original teacher. Yet degree pruning and matched CE remained stronger in accuracy under our tested settings. Invite questions on methodology, cost assumptions, and which tradeoff should guide the next experiments.");
}

// 21. Dedicated Q&A
{
  const s = p.slides.add(); s.background.fill = C.bg;
  txt(s, "DISCUSSION", 72, 90, 320, 24, { size: 14, color: C.gold, bold: true });
  line(s, 72, 128, 1208, 128, C.line, 1);
  txt(s, "Questions?", 72, 256, 1136, 96, { font: HEAD, size: 76, color: C.white, bold: true, align: "center" });
  txt(s, "EdgeTrim-KD  |  Research update", 72, 689, 650, 18, { size: 12, color: C.muted });
  notes(s, "Open the floor for Q&A. Suggested prompts if the room is quiet: Is the degree baseline a fair enough comparator? How should we weigh accuracy against latency? Which costs belong in the break-even calculation?");
}

const notesCount = p.slides.items.filter(s => (s.speakerNotes?.text || "").length > 0).length;
const deck = await PresentationFile.exportPptx(p);
const draft = path.join(BUILD, "candidate.pptx");
await deck.save(draft);
const montage = await p.export({ format: "webp", montage: true });
await fs.writeFile(path.join(BUILD, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
for (let i = 0; i < p.slides.items.length; i++) {
  const png = await p.export({ slide: p.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(path.join(BUILD, "slide-" + String(i + 1).padStart(2, "0") + ".png"), new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({ draft, final: FINAL, slideCount: p.slides.items.length, notesCount }));
