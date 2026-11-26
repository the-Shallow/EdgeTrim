import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const SKILL='C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations';
const {importRuntimeModule}=await import(pathToFileURL(path.join(SKILL,'container_tools/runtime_helpers.mjs')).href);
const {FileBlob,PresentationFile}=await importRuntimeModule('@oai/artifact-tool');
const root=process.cwd();
const deck=path.join(root,'deliverables','EdgeTrim_KD_40min_Final.pptx');
const out=path.join(root,'presentation_build','final_40min_renders');
await fs.mkdir(out,{recursive:true});
const p=await PresentationFile.importPptx(await FileBlob.load(deck));
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(out,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const montage=await p.export({format:'webp',montage:true,scale:0.35});
await fs.writeFile(path.join(out,'montage.webp'),new Uint8Array(await montage.arrayBuffer()));
console.log(JSON.stringify({slides:p.slides.items.length,out}));
