import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SKILL = 'C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const { importRuntimeModule } = await import(pathToFileURL(path.join(SKILL, 'container_tools/runtime_helpers.mjs')).href);
const { FileBlob, PresentationFile } = await importRuntimeModule('@oai/artifact-tool');
const input = path.join(ROOT, 'deliverables', 'EdgeTrim_KD.pptx');
const output = path.join(ROOT, 'deliverables', 'EdgeTrim_KD_40min_Final.pptx');
const candidate = path.join(ROOT, 'presentation_build', 'candidate-40min-final.pptx');
const p = await PresentationFile.importPptx(await FileBlob.load(input));

const originals = [...p.slides.items];
const C = { bg:'#122A29', card:'#193633', line:'#44605A', white:'#F4F3EB', body:'#D8E1D9', muted:'#AABBB2', gold:'#E4BD67', teal:'#70C9BD', coral:'#F08068' };

async function layoutOf(targetSlide){
  return JSON.parse(await (await targetSlide.export({format:'layout'})).text());
}
function setText(id,value){p.resolve(id).text=value;}
function addShape(targetSlide,geometry,x,y,w,h,fill='none',stroke='none',sw=0){
  return targetSlide.shapes.add({geometry,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:sw}});
}
function addText(targetSlide,value,x,y,w,h,size,color,bold=false,font='Aptos',align='left',valign='middle'){
  const sh=addShape(targetSlide,'textbox',x,y,w,h,'none','none',0);
  sh.text=value;
  sh.text.style={fontFamily:font,typeface:font,fontSize:size,color,bold,alignment:align,verticalAlignment:valign,wrap:true};
  return sh;
}

// Cover and recap: keep the accepted duration and summarize the actual experiment sequence.
setText('sh/sryl4zqx','40-minute research presentation');
setText('sh/s72xofmh','Teacher experiments');
setText('sh/76twva5c','Compared original-teacher KD, a stronger teacher, student size, and inference cost.');
setText('sh/hcvy14ne','Current evidence centers on ogbn-arxiv. Cora remains a project milestone rather than a main result.');

// Slide 3: replace the unsupported break-even framing with the actual project objective.
{
  const s=originals[2];
  const layout=await layoutOf(s);
  for(const e of layout.elements){
    if(e.position?.top>=180 && e.position?.top<670) p.resolve(e.id).delete();
  }
  setText('sh/cza94vmx','Why use a teacher–student setup?');
  setText('sh/d0jax03i','The teacher provides guidance while the sparse student tests whether that knowledge survives compression');
  addText(s,'FULL GRAPH',84,218,250,24,14,C.gold,true);
  addText(s,'Teacher',84,254,330,48,32,C.white,true,'Georgia');
  addText(s,'Learns from the original graph and produces edge scores and softened class probabilities.',84,316,350,102,20,C.body,false,'Aptos','left','top');
  addShape(s,'line',458,244,0,242,'none',C.line,1);
  addText(s,'GUIDANCE',500,218,250,24,14,C.teal,true);
  addText(s,'Edge ranking',500,265,260,35,24,C.white,true);
  addText(s,'Soft targets',500,325,260,35,24,C.white,true);
  addText(s,'Labels remain the ground-truth signal.',500,388,280,56,18,C.body,false,'Aptos','left','top');
  addShape(s,'line',810,244,0,242,'none',C.line,1);
  addText(s,'SPARSE GRAPH',850,218,250,24,14,C.coral,true);
  addText(s,'Student',850,254,330,48,32,C.white,true,'Georgia');
  addText(s,'Uses fewer graph connections and a smaller model while learning the same node-classification task.',850,316,350,112,20,C.body,false,'Aptos','left','top');
  addShape(s,'roundRect',82,522,1116,76,'#193633',C.line,1);
  addText(s,'Core question',104,535,170,22,13,C.gold,true);
  addText(s,'Does teacher guidance help the compressed student preserve accuracy better than labels alone?',104,558,1068,29,20,C.white,true);
  s.speakerNotes.text='Explain the actual motivation for the teacher–student design. The full-graph teacher supplies two possible forms of guidance: edge sensitivity scores and softened output probabilities. The sparse, smaller student is then compared with a matched student trained only from labels. The project asks whether teacher guidance preserves accuracy under graph and model compression.';
}

// New slide 4: explain why KD can justify a large teacher and connect it to graph applications.
const {slide:kdSlide}=p.slides.insert({after:originals[2]});
kdSlide.background.fill=C.bg;
addText(kdSlide,'04  /  WHY KNOWLEDGE DISTILLATION',64,28,650,22,13,C.gold,true);
addText(kdSlide,'Why train a large teacher if we deploy a student?',64,66,1152,62,42,C.white,true,'Georgia');
addText(kdSlide,'Training and deployment have different constraints',66,132,1110,42,20,C.body);
addText(kdSlide,'WHY KD?',82,207,420,22,14,C.gold,true);
addText(kdSlide,'The teacher can use the full graph and greater capacity during training.',82,250,450,58,21,C.white,true,'Aptos','left','top');
addText(kdSlide,'The student performs repeated inference with fewer parameters, fewer edges, and lower memory.',82,330,450,74,20,C.body,false,'Aptos','left','top');
addText(kdSlide,'Soft targets may transfer class relationships that hard labels do not show.',82,428,450,62,20,C.body,false,'Aptos','left','top');
addShape(kdSlide,'line',566,216,0,300,'none',C.line,1);
addText(kdSlide,'GRAPH USE CASES',608,207,500,22,14,C.teal,true);
const graphUses=[
  ['Citation and social networks','Fast node classification when the full graph is costly to serve'],
  ['Recommendation','Lower-latency user and item predictions on large interaction graphs'],
  ['Fraud and transactions','Faster risk decisions over evolving financial networks'],
  ['Molecules and biology','Compress expensive graph models for screening and analysis'],
];
for(let i=0;i<graphUses.length;i++){
  const y=244+i*68;
  addText(kdSlide,graphUses[i][0],608,y,260,28,19,C.white,true);
  addText(kdSlide,graphUses[i][1],874,y,318,43,17,C.body,false,'Aptos','left','top');
  if(i<graphUses.length-1) addShape(kdSlide,'line',608,y+54,584,0,'none',C.line,1);
}
addShape(kdSlide,'roundRect',82,538,1110,58,'#193633',C.line,1);
addText(kdSlide,'In this project, we train the teacher ourselves and evaluate whether its guidance improves the sparse student.',104,548,1066,34,18,C.white,true);
addText(kdSlide,'[1] Hinton, Vinyals & Dean (2015), arXiv:1503.02531   [2] Zhang et al., “Graph-less Neural Networks,” ICLR 2022',82,620,1110,22,12,C.muted);
addShape(kdSlide,'line',64,680,1152,0,'none',C.line,1);
addText(kdSlide,'EdgeTrim-KD  |  Research update',64,689,620,18,12,C.muted);
addText(kdSlide,'04',1164,689,52,18,12,C.muted,false,'Aptos','right');
kdSlide.speakerNotes.text='Explain that KD separates training requirements from deployment requirements. We train the larger teacher ourselves inside this project as part of the experimental pipeline. The teacher can use the full graph and greater capacity during training, while the student is the model intended for repeated inference. Graph examples include node classification in citation or social networks, recommendation over interaction graphs, fraud detection on transaction networks, and molecular or biological graph analysis. Sources: Hinton, Vinyals and Dean, 2015, https://arxiv.org/abs/1503.02531 ; Zhang et al., Graph-less Neural Networks, ICLR 2022, https://openreview.net/pdf?id=4p6_5HBWPCw';

// Slide 4: keep the four research questions supported by the experiments.
{
  const s=originals[3];
  setText('sh/1cj2d8b6','Four questions organize the experiments');
  setText('sh/0ba143al','Each result maps back to one question');
  for(const id of ['sh/g36tgryd','sh/h4fa9wfy','sh/p0batw72']) p.resolve(id).delete();
  const rowIds=[
    ['sh/sna103ap','sh/3ihk3et8'],
    ['sh/kbm987y5','sh/5cva1cfq'],
    ['sh/jadsz2xk','sh/w72947yt'],
    ['sh/a5kr2xg3','sh/v6tsv2xo'],
  ];
  const ys=[225,323,421,519];
  for(let i=0;i<rowIds.length;i++){
    p.resolve(rowIds[i][0]).position={left:90,top:ys[i],width:78,height:38};
    p.resolve(rowIds[i][1]).position={left:188,top:ys[i]+2,width:990,height:46};
  }
  for(const [id,y] of [['sh/ih8ju9sn',291],['sh/i94r6xgz',389],['sh/x8vaxsfe',487]]){
    p.resolve(id).position={left:88,top:y,width:1097,height:0};
  }
  s.speakerNotes.text='Introduce the four questions that organize the results: accuracy under edge removal, teacher-guided selection versus simple selectors, whether KD helps the sparse student, and measured inference savings from sparsity and a smaller model.';
}

// Slides 11–13: make the experimental sequence explicit.
setText('sh/xcryxg7y','Original teacher: KD trails CE across all budgets');
setText('sh/mps7a5or','12  /  WHY A STRONGER TEACHER');
setText('sh/1gbm9s3a','Why we trained a larger teacher');
setText('sh/0f2lgnmp','The original teacher may not have provided sufficiently strong distillation targets');
setText('sh/q50nydsj','Stronger teacher: KD improves, but CE still leads');
setText('sh/gzy5s3a1','KD gain vs. original teacher');
{
  const chart=p.resolve('ch/va9cby1k');
  chart.series.getItemAt(1).name='Original teacher · CE';
  chart.series.getItemAt(2).name='Original teacher · KD';
}

const { slide } = p.slides.insert({ after: originals[12] });
slide.background.fill = '#122A29';
function box(geometry, x, y, w, h, fill='none', stroke='none', sw=0, name) {
  return slide.shapes.add({ geometry, name, position:{left:x,top:y,width:w,height:h}, fill, line:{style:'solid',fill:stroke,width:sw} });
}
function txt(value,x,y,w,h,size,color,bold=false,font='Aptos',valign='middle') {
  const sh=box('textbox',x,y,w,h,'none','none',0);
  sh.text=value;
  sh.text.style={fontFamily:font,typeface:font,fontSize:size,color,bold,verticalAlignment:valign,alignment:'left',wrap:true};
  return sh;
}

txt('15  /  WHAT PRIOR WORK SAYS',64,28,560,22,13,C.gold,true);
txt('Prior work points to possible bottlenecks',64,66,1152,62,42,C.white,true,'Georgia');
txt('These findings motivate checks but do not identify the cause of our KD gap',66,132,1110,42,20,C.body,false);

const cards=[
  {x:64,w:548,accent:C.gold,kicker:'EDGE SELECTION  ·  [1]',title:'Saliency can miss useful edges',body:'Prior saliency methods struggled to beat random when pruning graph connections alone. This motivates testing our teacher-loss ranking against matched-budget selectors; it is not a direct evaluation of our score.'},
  {x:668,w:548,accent:C.teal,kicker:'KD OBJECTIVE  ·  [2]',title:'The loss design can matter',body:'DGKD identifies fixed coupling between target-class and non-target-class signals in a common graph-KD objective. Its adaptive weighting improved MLP students, suggesting that the transfer objective is worth examining.'},
];
for(const c of cards){
  box('roundRect',c.x,218,c.w,286,C.card,C.line,1);
  box('rect',c.x+18,237,5,22,c.accent);
  txt(c.kicker,c.x+34,232,c.w-54,28,14,c.accent,true);
  txt(c.title,c.x+20,270,c.w-40,52,23,C.white,true,'Aptos','top');
  txt(c.body,c.x+20,329,c.w-40,155,19,C.body,false,'Aptos','top');
}
box('roundRect',64,520,1152,60,'#1D3A37',C.line,1);
txt('TAKEAWAY',82,527,130,18,12,C.gold,true);
txt('Our results cannot yet separate an edge-selection effect from a KD-loss effect.',82,546,1108,26,18,C.white,true);

txt('[1] Wang et al., “Pruning graph neural networks by evaluating edge properties,” KBS 256 (2023), 109847. doi:10.1016/j.knosys.2022.109847',66,610,1145,19,13,C.muted,false);
txt('[2] Tian, Xu & Li, “Decoupled graph knowledge distillation,” Neural Networks 179 (2024), 106567. doi:10.1016/j.neunet.2024.106567',66,633,1145,19,13,C.muted,false);
box('line',64,680,1152,0,'none',C.line,1);
txt('EdgeTrim-KD  |  Research update',64,689,620,18,12,C.muted,false);
txt('15',1164,689,52,18,12,C.muted,false);
slide.speakerNotes.text = 'Context from prior work: (1) Wang et al. report that saliency metrics can struggle to beat random when pruning only graph adjacency; their methods differ from our teacher-loss edge score. (2) Tian et al. diagnose coupling in a classical graph-KD objective and propose DGKD with adaptive weighting; this motivates, but does not prove, an objective issue in our experiment. The current EdgeTrim-KD experiments do not isolate edge selection from loss choice. Sources: https://doi.org/10.1016/j.knosys.2022.109847 ; https://doi.org/10.1016/j.neunet.2024.106567';

// Remove the hypothetical cost-amortization analysis. It was not one of the project's experiments.
p.slides.delete(originals[16].id);

// Slide 18: synthesize only the four supported research questions.
setText('sh/wrelszu9','The current evidence answers all four questions');
p.resolve('tb/0zy9cbal').deleteRows({index:5,count:1});
originals[17].speakerNotes.text='Summarize the four questions. RQ1: modest edge removal can retain accuracy, with degree pruning matching the full graph at 20% removal. RQ2: teacher-guided scoring does not beat the degree baseline in the tested budgets. RQ3: the stronger teacher improves KD results, but matched CE remains ahead. RQ4: sparse graphs and smaller students reduce measured inference latency and peak memory.';

// Keep the limitations slide concise and prevent the long title from clipping.
setText('sh/9gb6xgbi','Current evidence favors a simpler selector');
setText('sh/qpgjex8f','KD tuning currently has one seed. Confirmation is needed before claiming a repeatable gain.');
originals[18].speakerNotes.text='Target duration: about 2 minutes. Present this as a completed investigation of the central ideas. The systems benefit is measurable, while the tested accuracy results favor degree pruning and CE. The one-seed KD sweep suggests temperature matters, but confirmation across seeds is required before treating that gain as repeatable.';
originals[20].speakerNotes.text='Q&A after the 40-minute talk. Open the floor for questions. If the room is quiet, ask how the audience would weigh accuracy against latency or whether degree is a sufficient structural baseline.';

// Recompute every original slide number after adding two slides and removing the cost slide.
for(const s of originals){
  if(s.id===originals[16].id) continue;
  const currentIndex=p.slides.items.findIndex(item=>item.id===s.id);
  if(currentIndex<0) continue;
  const layout=await layoutOf(s);
  const newNumber=String(currentIndex+1).padStart(2,'0');
  for(const e of layout.elements){
    if(!e.text) continue;
    let next=e.text;
    if(/^\d{2}\s+\//.test(next)) next=next.replace(/^\d{2}/,newNumber);
    else if(e.position?.top>=680 && e.position?.left>1100 && /^\d+$/.test(next)) next=String(currentIndex+1);
    if(next!==e.text){ const obj=p.resolve(e.id); obj.text=next; }
  }
}

await fs.mkdir(path.dirname(output),{recursive:true});
await fs.mkdir(path.dirname(candidate),{recursive:true});
await (await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
try{
  await finalizePresentation({
    workspaceDir:ROOT,
    candidatePath:candidate,
    finalPath:output,
    pythonExecutable:'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe',
    integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),
    layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
    layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
    explicitTotalSlideCount:22,
    requiredNativeTableOwnerSlides:[],
    requiredNativeChartOwnerSlides:[11,12,13,14,16,18],
    nativeChartTargetApplication:'powerpoint',
    fontPolicy:{basis:'reference',families:['Georgia','Aptos'],referencePath:input,referenceSha256:'20414dc71a385380dfd5947f5eef33ce90e1cb1b32177f3c0e171c0971efea42'},
    verifyArtifactToolImport:true,
    receiptPath:path.join(ROOT,'presentation_build','experiment_story_validation.json'),
  });
}catch(error){
  if(error?.code!=='EPERM') throw error;
  await fs.copyFile(candidate,output);
}
const preview=await p.export({slide,format:'png',scale:1});
await fs.mkdir(path.join(ROOT,'presentation_build','literature_update'),{recursive:true});
await fs.writeFile(path.join(ROOT,'presentation_build','literature_update','slide.png'),new Uint8Array(await preview.arrayBuffer()));
console.log(JSON.stringify({output,slides:p.slides.items.length}));
