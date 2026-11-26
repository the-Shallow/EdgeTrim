import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const TOOL = "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";
const { FileBlob, PresentationFile } = await import(pathToFileURL(TOOL).href);
const ROOT = "D:/NCSU/SEM3/MLG/EdgeTrim";
const OUTPUT = path.join(ROOT, ".presentation_build/final_render");
await fs.mkdir(OUTPUT, { recursive: true });
const p = await PresentationFile.importPptx(await FileBlob.load(path.join(ROOT, "deliverables/EdgeTrim_Research_Update_40min.pptx")));
let notes = 0, chartCount = 0, tableCount = 0;
for (let i = 0; i < p.slides.items.length; i++) {
  const slide = p.slides.items[i];
  if ((slide.speakerNotes?.text || "").length) notes++;
  chartCount += slide.charts.items.length;
  tableCount += slide.tables.items.length;
  const png = await p.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(OUTPUT, "slide-" + String(i + 1).padStart(2, "0") + ".png"), new Uint8Array(await png.arrayBuffer()));
}
const montage = await p.export({ format: "webp", montage: true });
await fs.writeFile(path.join(OUTPUT, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
const inspect = await p.inspect({ kind: "slide,notes,table,chart", maxChars: 18000 });
await fs.writeFile(path.join(OUTPUT, "inspect.ndjson"), inspect.ndjson, "utf8");
console.log(JSON.stringify({ slides: p.slides.items.length, notes, charts: chartCount, tables: tableCount, renderDir: OUTPUT }));
