import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCriminalDetectionProjectDocument,
  documentToPersistedJson,
} from "../src/apps/project-planning/project-planning-document.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = join(root, "Orbit_API/data/project_planning/_templates");
const outFile = join(outDir, "criminal-detection-python-flutter.json");

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, documentToPersistedJson(buildCriminalDetectionProjectDocument()), "utf-8");
console.log(`Wrote ${outFile}`);
