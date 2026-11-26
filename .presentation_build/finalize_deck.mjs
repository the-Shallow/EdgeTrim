import path from "node:path";
import { pathToFileURL } from "node:url";

const SKILL_DIR = "C:/Users/khush/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/Presentations";
const ROOT = "D:/NCSU/SEM3/MLG/EdgeTrim";
const BUILD = path.join(ROOT, ".presentation_build");
const FINAL = path.join(ROOT, "deliverables/EdgeTrim_Research_Update_40min.pptx");
const RUNTIME_PYTHON = "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe";
const { finalizePresentation } = await import(pathToFileURL(
  path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs"),
).href);
const result = await finalizePresentation({
  explicitTotalSlideCount: 21,
  requiredNativeTableOwnerSlides: [6, 15, 18],
  requiredNativeChartOwnerSlides: [10, 11, 12, 13, 14, 16, 17],
  materializeLiteralChartWorkbooks: true,
  nativeChartTargetApplication: "powerpoint",
  workspaceDir: ROOT,
  candidatePath: path.join(BUILD, "candidate.pptx"),
  finalPath: FINAL,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    "--require-native-table-slide", "6",
    "--require-native-table-slide", "15",
    "--require-native-table-slide", "18",
  ],
  fontPolicy: {
    basis: "reference",
    families: ["Georgia", "Aptos"],
    referencePath: "D:/NCSU/SEM3/MLG/PRESENTATIONS/SRGNN_18slide_20min.pptx",
    referenceSha256: "24bce9c040311c7397cfa3978ae6757d6a2db5ed30f77bb119e063d7aa862ade",
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(BUILD, "EdgeTrim_Research_Update_40min.validation.json"),
});
console.log(JSON.stringify(result, null, 2));
