import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRecordTerminology } from "./normalizeRecordTerminology.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const defaultTargets = [
  "src/data/imports/us/acceptedResources.json",
  "src/data/imports/us/acceptedInstitutions.json",
  "src/data/imports/us/resourceEnrichmentDrafts.json",
];

async function normalizeFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const data = JSON.parse(content);
  const normalized = normalizeRecordTerminology(data);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return { filePath, changed: JSON.stringify(data) !== JSON.stringify(normalized) };
}

async function main() {
  const targets = process.argv.slice(2).length
    ? process.argv.slice(2)
    : defaultTargets;

  for (const target of targets) {
    const filePath = path.isAbsolute(target) ? target : path.join(projectRoot, target);
    const result = await normalizeFile(filePath);
    console.log(
      `${result.changed ? "已规范化" : "无需要修改"}：${path.relative(projectRoot, result.filePath)}`,
    );
  }
}

main().catch((error) => {
  console.error(`术语规范化失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
