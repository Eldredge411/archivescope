import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EnrichmentReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_revision"
  | "applied";

type EnrichmentDraft = Record<string, unknown> & {
  resourceId?: string;
  reviewStatus?: EnrichmentReviewStatus;
};

type ApplyResult = {
  resourceId: string;
  action: "added" | "updated" | "skipped" | "failed";
  message?: string;
};

const enrichmentDraftsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const resourceEnrichmentsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichments.ts",
);
const acceptedResourcesPath = join(
  process.cwd(),
  "src/data/imports/us/acceptedResources.json",
);

const reviewStatuses: EnrichmentReviewStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "needs_revision",
  "applied",
];

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
const editableDraftFields = [
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
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function cleanString(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(cleanString).filter(Boolean))];
}

function normalizeEditableDraftUpdates(updates: unknown) {
  const record =
    updates && typeof updates === "object" ? (updates as Record<string, unknown>) : {};
  const normalizedUpdates: Record<string, unknown> = {};

  for (const field of editableDraftFields) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      continue;
    }

    if (arrayFields.has(field)) {
      normalizedUpdates[field] = cleanStringArray(record[field]);
      continue;
    }

    if (field === "versioningApplicable") {
      normalizedUpdates[field] = Boolean(record[field]);
      continue;
    }

    normalizedUpdates[field] = cleanString(record[field]);
  }

  return normalizedUpdates;
}

async function readJsonArray(filePath: string, optional = false) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("文件内容不是 JSON 数组。");
    }

    return parsed;
  } catch (error) {
    if (
      optional &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw new Error(`${filePath} 读取失败：${getErrorMessage(error)}`);
  }
}

async function writeJsonArray(filePath: string, data: unknown[]) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readTextFile(filePath: string, optional = false) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (
      optional &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return "";
    }

    throw new Error(`${filePath} 读取失败：${getErrorMessage(error)}`);
  }
}

function extractArrayLiteral(sourceText: string) {
  const exportIndex = sourceText.indexOf("export const resourceEnrichments");

  if (exportIndex === -1) {
    return "";
  }

  const start = sourceText.indexOf("[", exportIndex);

  if (start === -1) {
    return "";
  }

  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = start; index < sourceText.length; index += 1) {
    const char = sourceText[index];

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
        return sourceText.slice(start, index + 1);
      }
    }
  }

  return "";
}

function parseResourceEnrichments(resourceEnrichmentsText: string) {
  const arrayLiteral = extractArrayLiteral(resourceEnrichmentsText);

  if (!arrayLiteral) {
    return [];
  }

  const parsed = Function(`"use strict"; return (${arrayLiteral});`)() as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("resourceEnrichments 不是数组。");
  }

  return parsed;
}

async function readResourceEnrichments() {
  const fileContent = await readTextFile(resourceEnrichmentsPath, true);

  if (!fileContent) {
    return {
      text: "export const resourceEnrichments = [];\n",
      enrichments: [] as unknown[],
      error: "",
    };
  }

  try {
    return {
      text: fileContent,
      enrichments: parseResourceEnrichments(fileContent),
      error: "",
    };
  } catch (error) {
    return {
      text: fileContent,
      enrichments: [] as unknown[],
      error: `${resourceEnrichmentsPath} 解析失败：${getErrorMessage(error)}`,
    };
  }
}

function getResourceId(item: unknown) {
  const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};

  return stringValue(record.id || record.resourceId);
}

function buildMapByResourceId(items: unknown[]) {
  const map = new Map<string, unknown>();

  for (const item of items) {
    const resourceId = getResourceId(item);

    if (resourceId && !map.has(resourceId)) {
      map.set(resourceId, item);
    }
  }

  return map;
}

function toResourceInfo(resource: unknown) {
  const record =
    resource && typeof resource === "object" ? (resource as Record<string, unknown>) : {};

  return {
    id: stringValue(record.id),
    slug: stringValue(record.slug),
    titleEn: stringValue(record.titleEn),
    titleZh: stringValue(record.titleZh),
    sourceUrl: stringValue(record.sourceUrl),
    sourceDomain: stringValue(record.sourceDomain),
    resourceType: stringValue(record.resourceType),
    primaryTopicId: stringValue(record.primaryTopicId),
    topicIds: cleanStringArray(record.topicIds),
    tags: cleanStringArray(record.tags),
  };
}

function attachDraftContext(
  draft: unknown,
  enrichmentByResourceId: Map<string, unknown>,
  resourceById: Map<string, unknown>,
) {
  const record = draft && typeof draft === "object" ? (draft as EnrichmentDraft) : {};
  const resourceId = stringValue(record.resourceId);

  return {
    ...record,
    resourceId,
    reviewStatus: reviewStatuses.includes(record.reviewStatus as EnrichmentReviewStatus)
      ? record.reviewStatus
      : "pending",
    currentEnrichment: enrichmentByResourceId.get(resourceId) ?? null,
    resourceInfo: toResourceInfo(resourceById.get(resourceId)),
  };
}

function toEnrichment(draft: Record<string, unknown>) {
  const enrichment: Record<string, unknown> = {};

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

function getNonEmptyDraftFieldValue(draft: Record<string, unknown>, field: string) {
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

function mergeExistingEnrichment(
  existingEnrichment: Record<string, unknown>,
  draft: Record<string, unknown>,
) {
  const updatedEnrichment = { ...existingEnrichment };
  let changed = false;

  for (const field of updateFields) {
    const draftValue = getNonEmptyDraftFieldValue(draft, field);

    if (draftValue === undefined) {
      continue;
    }

    if (JSON.stringify(updatedEnrichment[field]) !== JSON.stringify(draftValue)) {
      updatedEnrichment[field] = draftValue;
      changed = true;
    }
  }

  return {
    enrichment: updatedEnrichment,
    changed,
  };
}

function formatEnrichmentObject(enrichment: Record<string, unknown>) {
  const json = JSON.stringify(enrichment, null, 2);

  return `  ${json.replace(/\n/g, "\n  ")},`;
}

function appendEnrichments(resourceEnrichmentsText: string, enrichments: Record<string, unknown>[]) {
  if (enrichments.length === 0) {
    return resourceEnrichmentsText;
  }

  const insertion = enrichments.map(formatEnrichmentObject).join("\n");
  const closingArrayPattern = /\n\];\s*$/;

  if (!closingArrayPattern.test(resourceEnrichmentsText)) {
    throw new Error("resourceEnrichments.ts 格式异常：未找到文件末尾的 `];`。");
  }

  return resourceEnrichmentsText.replace(
    closingArrayPattern,
    `\n${insertion}\n];\n`,
  );
}

function findTopLevelObjectRanges(resourceEnrichmentsText: string) {
  const arrayLiteral = extractArrayLiteral(resourceEnrichmentsText);

  if (!arrayLiteral) {
    return [];
  }

  const arrayStart = resourceEnrichmentsText.indexOf(arrayLiteral);
  const arrayEnd = arrayStart + arrayLiteral.length;
  const ranges: Array<{ start: number; end: number; text: string }> = [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  let objectStart = -1;

  for (let index = arrayStart + 1; index < arrayEnd - 1; index += 1) {
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

function parseEnrichmentObject(objectText: string) {
  return Function(`"use strict"; return (${objectText});`)() as Record<
    string,
    unknown
  >;
}

function extractResourceIdFromObjectText(objectText: string) {
  const match = objectText.match(
    /(?:resourceId|["']resourceId["'])\s*:\s*["']([^"']+)["']/,
  );

  return cleanString(match?.[1]);
}

function formatUpdatedEnrichmentObject(enrichment: Record<string, unknown>) {
  const lines = JSON.stringify(enrichment, null, 2).split("\n");

  return [lines[0], ...lines.slice(1, -1).map((line) => `  ${line}`), "  }"].join(
    "\n",
  );
}

function updateExistingEnrichments(
  resourceEnrichmentsText: string,
  draftsByResourceId: Map<string, Record<string, unknown>>,
) {
  const ranges = findTopLevelObjectRanges(resourceEnrichmentsText);
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  const updatedResourceIds = new Set<string>();
  const unchangedResourceIds = new Set<string>();

  for (const range of ranges) {
    const resourceId = extractResourceIdFromObjectText(range.text);

    if (!resourceId || !draftsByResourceId.has(resourceId)) {
      continue;
    }

    const existingEnrichment = parseEnrichmentObject(range.text);
    const { enrichment, changed } = mergeExistingEnrichment(
      existingEnrichment,
      draftsByResourceId.get(resourceId) ?? {},
    );

    if (!changed) {
      unchangedResourceIds.add(resourceId);
      updatedResourceIds.add(resourceId);
      continue;
    }

    replacements.push({
      start: range.start,
      end: range.end,
      text: formatUpdatedEnrichmentObject(enrichment),
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
    unchangedResourceIds,
  };
}

export async function GET() {
  try {
    const [drafts, acceptedResources, enrichmentState] = await Promise.all([
      readJsonArray(enrichmentDraftsPath, true),
      readJsonArray(acceptedResourcesPath, true),
      readResourceEnrichments(),
    ]);
    const enrichmentByResourceId = buildMapByResourceId(enrichmentState.enrichments);
    const resourceById = buildMapByResourceId(acceptedResources);
    const enrichedDrafts = drafts.map((draft) =>
      attachDraftContext(draft, enrichmentByResourceId, resourceById),
    );

    if (enrichmentState.error) {
      return NextResponse.json(
        {
          success: false,
          error: enrichmentState.error,
          drafts: enrichedDrafts,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      drafts: enrichedDrafts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `AI enrichment 草稿读取失败：${getErrorMessage(error)}`,
        drafts: [],
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      resourceId?: string;
      reviewStatus?: EnrichmentReviewStatus;
      updates?: Record<string, unknown>;
      items?: Array<{ resourceId?: string }>;
    };

    if (body.action === "updateDraft") {
      const resourceId = stringValue(body.resourceId);

      if (!resourceId) {
        return NextResponse.json(
          { success: false, error: "缺少 resourceId。" },
          { status: 400 },
        );
      }

      const updates = normalizeEditableDraftUpdates(body.updates);
      const drafts = (await readJsonArray(
        enrichmentDraftsPath,
        true,
      )) as EnrichmentDraft[];
      const updatedAt = new Date().toISOString();
      let updatedDraft: EnrichmentDraft | null = null;
      const updatedDrafts = drafts.map((draft) => {
        if (stringValue(draft?.resourceId) !== resourceId) {
          return draft;
        }

        updatedDraft = {
          ...draft,
          ...updates,
          reviewStatus: "pending",
          manuallyEdited: true,
          updatedAt,
        } satisfies EnrichmentDraft;

        return updatedDraft;
      });

      if (!updatedDraft) {
        return NextResponse.json(
          {
            success: false,
            error: "未找到对应 AI enrichment 草稿。",
          },
          { status: 404 },
        );
      }

      await writeJsonArray(enrichmentDraftsPath, updatedDrafts);

      return NextResponse.json({
        success: true,
        draft: updatedDraft,
      });
    }

    if (!body.reviewStatus || !reviewStatuses.includes(body.reviewStatus)) {
      return NextResponse.json(
        { success: false, error: "审核状态不在允许范围内。" },
        { status: 400 },
      );
    }

    if (body.reviewStatus === "applied") {
      return NextResponse.json(
        {
          success: false,
          error:
            "不能直接标记为 applied。请使用“应用草稿”操作写入 resourceEnrichments.ts 后再更新状态。",
        },
        { status: 400 },
      );
    }

    const updateIds = Array.isArray(body.items)
      ? body.items.map((item) => stringValue(item.resourceId)).filter(Boolean)
      : [stringValue(body.resourceId)].filter(Boolean);

    if (updateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "缺少 resourceId。" },
        { status: 400 },
      );
    }

    const targetIds = new Set(updateIds);
    const drafts = (await readJsonArray(enrichmentDraftsPath, true)) as EnrichmentDraft[];
    const updatedAt = new Date().toISOString();
    const updatedItems: EnrichmentDraft[] = [];
    const failedItems: Array<{ resourceId: string; message: string }> = [];
    const updatedDrafts = drafts.map((draft) => {
      const resourceId = stringValue(draft?.resourceId);

      if (!targetIds.has(resourceId)) {
        return draft;
      }

      const updatedDraft = {
        ...draft,
        reviewStatus: body.reviewStatus,
        updatedAt,
      } satisfies EnrichmentDraft;

      updatedItems.push(updatedDraft);
      targetIds.delete(resourceId);
      return updatedDraft;
    });

    for (const resourceId of targetIds) {
      failedItems.push({
        resourceId,
        message: "未找到对应 AI enrichment 草稿。",
      });
    }

    await writeJsonArray(enrichmentDraftsPath, updatedDrafts);

    return NextResponse.json({
      success: true,
      updatedCount: updatedItems.length,
      failedItems,
      updatedItems,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `AI enrichment 草稿状态更新失败：${getErrorMessage(error)}`,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      resourceIds?: string[];
      updateExisting?: boolean;
    };

    if (body.action !== "apply") {
      return NextResponse.json(
        { success: false, error: "不支持的操作。" },
        { status: 400 },
      );
    }

    const requestedResourceIds = cleanStringArray(body.resourceIds);

    if (requestedResourceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "缺少需要应用的 resourceIds。" },
        { status: 400 },
      );
    }

    const requestedIdSet = new Set(requestedResourceIds);
    const drafts = (await readJsonArray(enrichmentDraftsPath, true)) as EnrichmentDraft[];
    const acceptedDrafts = drafts.filter((draft) => {
      const resourceId = stringValue(draft?.resourceId);

      return requestedIdSet.has(resourceId) && draft.reviewStatus === "accepted";
    });
    const acceptedDraftByResourceId = new Map<string, Record<string, unknown>>();

    for (const draft of acceptedDrafts) {
      const resourceId = stringValue(draft.resourceId);

      if (resourceId && !acceptedDraftByResourceId.has(resourceId)) {
        acceptedDraftByResourceId.set(resourceId, draft);
      }
    }

    const enrichmentState = await readResourceEnrichments();

    if (enrichmentState.error) {
      return NextResponse.json(
        { success: false, error: enrichmentState.error },
        { status: 500 },
      );
    }

    const existingResourceIds = new Set(
      enrichmentState.enrichments.map((item) => getResourceId(item)).filter(Boolean),
    );
    const enrichmentsToAppend: Record<string, unknown>[] = [];
    const draftsToUpdate = new Map<string, Record<string, unknown>>();
    const results: ApplyResult[] = [];
    const appliedResourceIds = new Set<string>();

    for (const resourceId of requestedResourceIds) {
      const draft = acceptedDraftByResourceId.get(resourceId);

      if (!draft) {
        results.push({
          resourceId,
          action: "skipped",
          message: "草稿不是 accepted 状态，已跳过。",
        });
        continue;
      }

      if (existingResourceIds.has(resourceId)) {
        if (body.updateExisting) {
          draftsToUpdate.set(resourceId, draft);
        } else {
          results.push({
            resourceId,
            action: "skipped",
            message: "正式 enrichment 已存在，且未启用 updateExisting。",
          });
        }

        continue;
      }

      enrichmentsToAppend.push(toEnrichment(draft));
      appliedResourceIds.add(resourceId);
      existingResourceIds.add(resourceId);
      results.push({
        resourceId,
        action: "added",
      });
    }

    const updateResult = body.updateExisting
      ? updateExistingEnrichments(enrichmentState.text, draftsToUpdate)
      : {
          text: enrichmentState.text,
          updatedResourceIds: new Set<string>(),
          unchangedResourceIds: new Set<string>(),
        };

    for (const resourceId of updateResult.updatedResourceIds) {
      appliedResourceIds.add(resourceId);
      results.push({
        resourceId,
        action: "updated",
        message: updateResult.unchangedResourceIds.has(resourceId)
          ? "已有 enrichment 内容一致，已视为应用完成。"
          : undefined,
      });
    }

    for (const resourceId of draftsToUpdate.keys()) {
      if (!updateResult.updatedResourceIds.has(resourceId)) {
        results.push({
          resourceId,
          action: "failed",
          message: "未能在 resourceEnrichments.ts 中定位对应条目。",
        });
      }
    }

    if (appliedResourceIds.size > 0) {
      const updatedResourceEnrichmentsText = appendEnrichments(
        updateResult.text,
        enrichmentsToAppend,
      );
      await writeFile(resourceEnrichmentsPath, updatedResourceEnrichmentsText, "utf8");

      const updatedAt = new Date().toISOString();
      const updatedDrafts = drafts.map((draft) =>
        appliedResourceIds.has(stringValue(draft?.resourceId))
          ? {
              ...draft,
              reviewStatus: "applied" as EnrichmentReviewStatus,
              updatedAt,
            }
          : draft,
      );

      await writeJsonArray(enrichmentDraftsPath, updatedDrafts);
    }

    return NextResponse.json({
      success: true,
      appliedCount: appliedResourceIds.size,
      addedCount: enrichmentsToAppend.length,
      updatedExistingCount: updateResult.updatedResourceIds.size,
      skippedCount: results.filter((result) => result.action === "skipped").length,
      failedItems: results.filter((result) => result.action === "failed"),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `AI enrichment 草稿应用失败：${getErrorMessage(error)}`,
      },
      { status: 500 },
    );
  }
}
