import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const base='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const { FileBlob, PresentationFile } = await import(pathToFileURL(base).href);
const p = await PresentationFile.importPptx(await FileBlob.load('D:/NCSU/SEM3/MLG/PRESENTATIONS/SRGNN_18slide_20min.pptx'));
console.log('slides',p.slides.items.length);
for (let i=0;i<Math.min(4,p.slides.items.length);i++) {
  const slide=p.slides.items[i];
  const png=await p.export({slide,format:'png',scale:0.5});
  await fs.writeFile(`.presentation_build/reference-${i+1}.png`,new Uint8Array(await png.arrayBuffer()));
}
const layout=await p.inspect({kind:'layout',maxChars:10000});
console.log(layout.ndjson.slice(0,10000));
