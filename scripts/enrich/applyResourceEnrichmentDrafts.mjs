import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const enrichmentDraftsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const resourceEnrichmentsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichments.ts",
);
const resourceAdminEditsJsonPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceAdminEdits.json",
);
const resourceAdminEditsTsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceAdminEdits.ts",
);

const enrichmentFields = [
  "resourceId",
  "titleZh",
  "summaryShort",
  "summaryZh",
  "keyPoints",
  "researchValue",
  "resourceType",
  "primaryTopicId",
  "topicIds",
  "tags",
  "status",
  "versioningApplicable",
  "versionNote",
  "sourceBasis",
];

const updateFields = enrichmentFields.filter((field) => field !== "resourceId");
const arrayFields = new Set(["keyPoints", "topicIds", "tags"]);
const optionalStringFields = new Set(["sourceBasis"]);

function parseArgs(argv) {
  const resourceIdIndex = argv.indexOf("--resourceId");
  const resourceIdEqualArg = argv.find((arg) => arg.startsWith("--resourceId="));
  const resourceId =
    resourceIdEqualArg?.slice("--resourceId=".length) ??
    (resourceIdIndex >= 0 ? argv[resourceIdIndex + 1] : "");

  return {
    updateExisting: argv.includes("--update-existing"),
    repairApplied: argv.includes("--repair-applied"),
    resourceId: cleanString(resourceId),
  };
}

async function readJsonArray(filePath, options = {}) {
  const { optional = false } = options;

  try {
    const content = await readFile(filePath, "utf8");
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error("文件内容不是 JSON 数组。");
    }

    return data;
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return null;
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

async function readTextFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

function extractExistingResourceIds(resourceEnrichmentsText) {
  const ids = new Set();
  const matcher =
    /(?:resourceId|["']resourceId["'])\s*:\s*["']([^"']+)["']/g;

  for (const match of resourceEnrichmentsText.matchAll(matcher)) {
    ids.add(match[1]);
  }

  return ids;
}

function findResourceEnrichmentsArrayRange(resourceEnrichmentsText) {
  const exportIndex = resourceEnrichmentsText.indexOf(
    "export const resourceEnrichments",
  );

  if (exportIndex === -1) {
    throw new Error(
      "resourceEnrichments.ts 格式异常：未找到 resourceEnrichments 导出。",
    );
  }

  const start = resourceEnrichmentsText.indexOf("[", exportIndex);

  if (start === -1) {
    throw new Error(
      "resourceEnrichments.ts 格式异常：未找到 resourceEnrichments 数组起点。",
    );
  }

  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = start; index < resourceEnrichmentsText.length; index += 1) {
    const char = resourceEnrichmentsText[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return {
          start,
          end: index + 1,
        };
      }
    }
  }

  throw new Error(
    "resourceEnrichments.ts 格式异常：未找到 resourceEnrichments 数组结尾。",
  );
}

function findTopLevelObjectRanges(resourceEnrichmentsText) {
  const arrayRange = findResourceEnrichmentsArrayRange(resourceEnrichmentsText);
  const ranges = [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  let objectStart = -1;

  for (let index = arrayRange.start + 1; index < arrayRange.end - 1; index += 1) {
    const char = resourceEnrichmentsText[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }

      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0 && objectStart >= 0) {
        ranges.push({
          start: objectStart,
          end: index + 1,
          text: resourceEnrichmentsText.slice(objectStart, index + 1),
        });
        objectStart = -1;
      }
    }
  }

  return ranges;
}

function parseEnrichmentObject(objectText) {
  return Function(`"use strict"; return (${objectText});`)();
}

function extractResourceIdFromObjectText(objectText) {
  const match = objectText.match(
    /(?:resourceId|["']resourceId["'])\s*:\s*["']([^"']+)["']/,
  );

  return cleanString(match?.[1]);
}

function formatEnrichmentObjectWithoutLeadingIndent(enrichment) {
  const lines = JSON.stringify(enrichment, null, 2).split("\n");

  if (lines.length <= 1) {
    return lines[0] ?? "{}";
  }

  return [
    lines[0],
    ...lines.slice(1, -1).map((line) => `  ${line}`),
    "  }",
  ].join("\n");
}

function cleanString(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(cleanString).filter(Boolean))];
}

function toEnrichment(draft) {
  const enrichment = {};

  for (const field of enrichmentFields) {
    if (arrayFields.has(field)) {
      enrichment[field] = cleanStringArray(draft[field]);
      continue;
    }

    if (field === "versioningApplicable") {
      enrichment[field] =
        typeof draft[field] === "boolean" ? draft[field] : false;
      continue;
    }

    const cleanedValue = cleanString(draft[field]);

    if (optionalStringFields.has(field) && !cleanedValue) {
      continue;
    }

    enrichment[field] = cleanedValue;
  }

  if (!enrichment.status) {
    enrichment.status = "published_draft";
  }

  return enrichment;
}

function getNonEmptyDraftFieldValue(draft, field) {
  if (arrayFields.has(field)) {
    const value = cleanStringArray(draft[field]);

    return value.length > 0 ? value : undefined;
  }

  if (field === "versioningApplicable") {
    return typeof draft[field] === "boolean" ? draft[field] : undefined;
  }

  const value = cleanString(draft[field]);

  return value ? value : undefined;
}

function mergeExistingEnrichment(existingEnrichment, draft) {
  const updatedEnrichment = { ...existingEnrichment };
  let changed = false;

  for (const field of updateFields) {
    const draftValue = getNonEmptyDraftFieldValue(draft, field);

    if (draftValue === undefined) {
      continue;
    }

    const existingValue = updatedEnrichment[field];
    const valuesAreEqual =
      JSON.stringify(existingValue) === JSON.stringify(draftValue);

    if (!valuesAreEqual) {
      updatedEnrichment[field] = draftValue;
      changed = true;
    }
  }

  return {
    enrichment: updatedEnrichment,
    changed,
  };
}

function updateExistingEnrichments(resourceEnrichmentsText, draftsByResourceId) {
  if (draftsByResourceId.size === 0) {
    return {
      text: resourceEnrichmentsText,
      updatedResourceIds: new Set(),
      skippedNoChangeResourceIds: new Set(),
    };
  }

  const ranges = findTopLevelObjectRanges(resourceEnrichmentsText);
  const replacements = [];
  const updatedResourceIds = new Set();
  const skippedNoChangeResourceIds = new Set();

  for (const range of ranges) {
    const resourceId = extractResourceIdFromObjectText(range.text);

    if (!resourceId || !draftsByResourceId.has(resourceId)) {
      continue;
    }

    const draft = draftsByResourceId.get(resourceId);
    const existingEnrichment = parseEnrichmentObject(range.text);
    const { enrichment, changed } = mergeExistingEnrichment(
      existingEnrichment,
      draft,
    );

    if (!changed) {
      skippedNoChangeResourceIds.add(resourceId);
      continue;
    }

    replacements.push({
      start: range.start,
      end: range.end,
      text: formatEnrichmentObjectWithoutLeadingIndent(enrichment),
    });
    updatedResourceIds.add(resourceId);
  }

  let updatedText = resourceEnrichmentsText;

  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    updatedText =
      updatedText.slice(0, replacement.start) +
      replacement.text +
      updatedText.slice(replacement.end);
  }

  return {
    text: updatedText,
    updatedResourceIds,
    skippedNoChangeResourceIds,
  };
}

function formatEnrichmentObject(enrichment) {
  const json = JSON.stringify(enrichment, null, 2);

  return `  ${json.replace(/\n/g, "\n  ")},`;
}

function appendEnrichments(resourceEnrichmentsText, enrichments) {
  if (enrichments.length === 0) {
    return resourceEnrichmentsText;
  }

  const insertion = enrichments.map(formatEnrichmentObject).join("\n");
  const closingArrayPattern = /\n\];\s*$/;

  if (!closingArrayPattern.test(resourceEnrichmentsText)) {
    throw new Error(
      "resourceEnrichments.ts 格式异常：未找到文件末尾的 `];`。",
    );
  }

  return resourceEnrichmentsText.replace(
    closingArrayPattern,
    `\n${insertion}\n];\n`,
  );
}

async function writeJsonArray(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readTsExportedArray(filePath, exportName, options = {}) {
  const { optional = false } = options;

  try {
    const content = await readFile(filePath, "utf8");
    const matcher = new RegExp(
      `export\\s+const\\s+${exportName}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`,
    );
    const match = content.match(matcher);

    if (!match) {
      throw new Error(`未找到 ${exportName} 数组导出。`);
    }

    const parsed = Function(`"use strict"; return (${match[1]});`)();

    if (!Array.isArray(parsed)) {
      throw new Error(`${exportName} 不是数组。`);
    }

    return parsed;
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return [];
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

async function readResourceAdminEdits() {
  const jsonEdits = await readJsonArray(resourceAdminEditsJsonPath, {
    optional: true,
  });
  const tsEdits = await readTsExportedArray(
    resourceAdminEditsTsPath,
    "resourceAdminEdits",
    { optional: true },
  );

  return [...(jsonEdits ?? []), ...tsEdits];
}

function buildResourceIdSet(items) {
  return new Set(
    items.map((item) => cleanString(item?.resourceId || item?.id)).filter(Boolean),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log("正在读取 AI enrichment 草稿……");
  const drafts = await readJsonArray(enrichmentDraftsPath, { optional: true });

  if (!drafts) {
    console.log("没有 AI enrichment 草稿可应用。");
    return;
  }

  console.log(`草稿总数：${drafts.length}`);
  console.log(
    `accepted 草稿数量：${
      drafts.filter((draft) => draft?.reviewStatus === "accepted").length
    }`,
  );
  console.log(
    `applied 草稿数量：${
      drafts.filter((draft) => draft?.reviewStatus === "applied").length
    }`,
  );
  console.log(`是否更新已有 enrichment：${options.updateExisting ? "是" : "否"}`);
  console.log(`是否修复 applied 草稿：${options.repairApplied ? "是" : "否"}`);
  console.log(`指定 resourceId：${options.resourceId || "未指定"}`);

  console.log("正在读取 resourceEnrichments.ts……");
  const resourceEnrichmentsText = await readTextFile(resourceEnrichmentsPath);
  const existingResourceIds = extractExistingResourceIds(resourceEnrichmentsText);
  console.log(`resourceEnrichments.ts 已有 resourceId 数量：${existingResourceIds.size}`);
  console.log("正在读取 resourceAdminEdits（如存在）……");
  const resourceAdminEdits = await readResourceAdminEdits();
  const adminEditResourceIds = buildResourceIdSet(resourceAdminEdits);
  console.log(`resourceAdminEdits 已有 resourceId 数量：${adminEditResourceIds.size}`);
  const acceptedDrafts = drafts.filter((draft) => {
    if (draft?.reviewStatus !== "accepted") {
      return false;
    }

    if (options.resourceId) {
      return cleanString(draft?.resourceId) === options.resourceId;
    }

    return true;
  });
  const repairAppliedDrafts = options.repairApplied
    ? drafts.filter((draft) => {
        const resourceId = cleanString(draft?.resourceId);

        if (draft?.reviewStatus !== "applied" || !resourceId) {
          return false;
        }

        if (options.resourceId && resourceId !== options.resourceId) {
          return false;
        }

        return (
          !existingResourceIds.has(resourceId) &&
          !adminEditResourceIds.has(resourceId)
        );
      })
    : [];
  const repairAppliedCount = repairAppliedDrafts.length;
  const targetDrafts = [...acceptedDrafts, ...repairAppliedDrafts];

  if (targetDrafts.length === 0) {
    console.log(
      options.resourceId
        ? `没有找到 resourceId 为 ${options.resourceId} 且需要应用或修复的草稿。`
        : "没有需要应用或修复的 AI enrichment 草稿。",
    );
    console.log("新增 enrichment 数量：0");
    console.log("更新已有 enrichment 数量：0");
    console.log("修复 applied 数量：0");
    console.log("跳过数量：0");
    console.log(`写入路径：${resourceEnrichmentsPath}`);
    return;
  }

  const enrichmentsToAppend = [];
  const draftsToUpdateByResourceId = new Map();
  const appliedResourceIds = new Set();
  const repairedAppliedResourceIds = new Set();
  let skippedCount = 0;

  for (const draft of targetDrafts) {
    const resourceId = cleanString(draft?.resourceId);

    if (!resourceId) {
      console.warn("发现缺少 resourceId 的 AI enrichment 草稿，已跳过。");
      skippedCount += 1;
      continue;
    }

    if (existingResourceIds.has(resourceId)) {
      if (options.updateExisting) {
        draftsToUpdateByResourceId.set(resourceId, draft);
      } else {
        skippedCount += 1;
      }

      continue;
    }

    enrichmentsToAppend.push(toEnrichment(draft));
    appliedResourceIds.add(resourceId);
    if (draft?.reviewStatus === "applied") {
      repairedAppliedResourceIds.add(resourceId);
    }
    existingResourceIds.add(resourceId);
  }

  const updateResult = options.updateExisting
    ? updateExistingEnrichments(resourceEnrichmentsText, draftsToUpdateByResourceId)
    : {
        text: resourceEnrichmentsText,
        updatedResourceIds: new Set(),
        skippedNoChangeResourceIds: new Set(),
      };

  for (const resourceId of updateResult.updatedResourceIds) {
    appliedResourceIds.add(resourceId);
  }

  for (const resourceId of updateResult.skippedNoChangeResourceIds) {
    appliedResourceIds.add(resourceId);
  }

  skippedCount +=
    draftsToUpdateByResourceId.size -
    updateResult.updatedResourceIds.size -
    updateResult.skippedNoChangeResourceIds.size;

  const updatedResourceEnrichmentsText = appendEnrichments(
    updateResult.text,
    enrichmentsToAppend,
  );

  console.log(`新增 enrichment 数量：${enrichmentsToAppend.length}`);
  console.log(`更新已有 enrichment 数量：${updateResult.updatedResourceIds.size}`);
  console.log(`修复 applied 数量：${repairedAppliedResourceIds.size}`);
  console.log(`跳过数量：${skippedCount}`);
  console.log(`写入路径：${resourceEnrichmentsPath}`);

  if (appliedResourceIds.size === 0) {
    console.log("没有 enrichment 需要追加或更新。");
    console.log("应用成功后改为 applied 的数量：0");
    return;
  }

  await writeFile(
    resourceEnrichmentsPath,
    updatedResourceEnrichmentsText,
    "utf8",
  );

  const updatedDrafts = drafts.map((draft) =>
    appliedResourceIds.has(draft?.resourceId)
      ? {
          ...draft,
          reviewStatus: "applied",
          updatedAt: new Date().toISOString(),
        }
      : draft,
  );

  await writeJsonArray(enrichmentDraftsPath, updatedDrafts);

  console.log(`应用成功后改为 applied 的数量：${appliedResourceIds.size}`);
  console.log(`已写入：${resourceEnrichmentsPath}`);
  console.log(`已写入：${enrichmentDraftsPath}`);
}

main().catch((error) => {
  console.error("AI enrichment 草稿应用失败。");
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
