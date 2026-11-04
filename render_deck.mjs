import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const SKILL="C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations";
const {importRuntimeModule}=await import(pathToFileURL(path.join(SKILL,"container_tools/runtime_helpers.mjs")).href);
const {FileBlob,PresentationFile}=await importRuntimeModule("@oai/artifact-tool");
const file=path.join(process.cwd(),"deliverables","EdgeTrim_KD_Proposal_v9.pptx");
const out=path.join(process.cwd(),"presentation_build","renders");
await fs.mkdir(out,{recursive:true});
const p=await PresentationFile.importPptx(await FileBlob.load(file));
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:"png",scale:1});
 await fs.writeFile(path.join(out,"slide-"+String(i+1).padStart(2,"0")+".png"),new Uint8Array(await blob.arrayBuffer()));
}
console.log("Rendered "+p.slides.items.length+" slides to "+out);
