import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const SKILL='C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const {importRuntimeModule}=await import(pathToFileURL(path.join(SKILL,'container_tools/runtime_helpers.mjs')).href);
const {FileBlob,PresentationFile}=await importRuntimeModule('@oai/artifact-tool');
const p=await PresentationFile.importPptx(await FileBlob.load(path.join(process.cwd(),'deliverables','EdgeTrim_KD.pptx')));
console.log('slides',p.slides.items.length,'size',p.slideSize);
for(let i=0;i<p.slides.items.length;i++){
 const s=p.slides.items[i];
 const layout=await s.export({format:'layout'});
 const json=JSON.parse(await layout.text());
 console.log('\nSLIDE',i+1,JSON.stringify(json).slice(0,1300));
}
