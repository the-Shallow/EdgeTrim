import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const SKILL='C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const {importRuntimeModule}=await import(pathToFileURL(path.join(SKILL,'container_tools/runtime_helpers.mjs')).href);
const {FileBlob,PresentationFile}=await importRuntimeModule('@oai/artifact-tool');
const root=process.cwd();
const p=await PresentationFile.importPptx(await FileBlob.load(path.join(root,'deliverables','EdgeTrim_KD.pptx')));
const out=path.join(root,'presentation_build','revision_targets');
await fs.mkdir(out,{recursive:true});
for(const n of [1,2,3,4,11,12,13,17,18,19]){
 const s=p.slides.items[n-1];
 const layout=await s.export({format:'layout'});
 await fs.writeFile(path.join(out,`slide-${n}.json`),await layout.text());
 const png=await p.export({slide:s,format:'png',scale:1});
 await fs.writeFile(path.join(out,`slide-${n}.png`),new Uint8Array(await png.arrayBuffer()));
}
console.log(out);
