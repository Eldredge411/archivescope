import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DraftSource = {
  sourceKey: string;
  filePath: string;
  labelZh: string;
};

type ReadResult<T> = {
  data: T;
  error?: string;
  missing?: boolean;
};

const draftSources: DraftSource[] = [
  {
    sourceKey: "federal-register",
    filePath: join(
      process.cwd(),
      "src/data/drafts/us/federalRegisterDrafts.json",
    ),
    labelZh: "Federal Register",
  },
  {
    sourceKey: "nara-web",
    filePath: join(process.cwd(), "src/data/drafts/us/naraWebDrafts.json"),
    labelZh: "NARA 官网",
  },
  {
    sourceKey: "nara-catalog",
    filePath: join(process.cwd(), "src/data/drafts/us/naraCatalogDrafts.json"),
    labelZh: "NARA Catalog",
  },
  {
    sourceKey: "manual-url",
    filePath: join(process.cwd(), "src/data/drafts/us/manualUrlDrafts.json"),
    labelZh: "手动网址",
  },
];

const acceptedResourcesPath = join(
  process.cwd(),
  "src/data/imports/us/acceptedResources.json",
);
const acceptedInstitutionsPath = join(
  process.cwd(),
  "src/data/imports/us/acceptedInstitutions.json",
);
const resourceEnrichmentsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichments.ts",
);
const resourceAdminEditsJsonPath = join(
  process.cwd(),
  "src/data/imports/us/resourceAdminEdits.json",
);
const resourceAdminEditsTsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceAdminEdits.ts",
);
const enrichmentDraftsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const snapshotFilesPath = join(
  process.cwd(),
  "src/data/imports/us/resourceSnapshotFiles.json",
);
const snapshotAuditReportPath = join(
  process.cwd(),
  "src/data/imports/us/snapshotAuditReport.json",
);
const institutionAuditReportPath = join(
  process.cwd(),
  "src/data/imports/us/institutionAuditReport.json",
);

async function readOptionalJsonArray(filePath: string): Promise<ReadResult<unknown[]>> {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      return {
        data: [],
        error: `${filePath} 内容不是 JSON 数组。`,
      };
    }

    return { data: parsed };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { data: [], missing: true };
    }

    return {
      data: [],
      error: `${filePath} 读取失败：${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function readOptionalJsonObject(
  filePath: string,
): Promise<ReadResult<Record<string, unknown>>> {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        data: {},
        error: `${filePath} 内容不是 JSON 对象。`,
      };
    }

    return { data: parsed as Record<string, unknown> };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { data: {}, missing: true };
    }

    return {
      data: {},
      error: `${filePath} 读取失败：${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

function extractArrayLiteral(sourceText: string, exportName: string) {
  const exportIndex = sourceText.indexOf(`export const ${exportName}`);

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

async function readOptionalTsArray(
  filePath: string,
  exportName: string,
): Promise<ReadResult<unknown[]>> {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const arrayLiteral = extractArrayLiteral(fileContent, exportName);

    if (!arrayLiteral) {
      return {
        data: [],
        error: `${filePath} 中未找到 ${exportName} 数组导出。`,
      };
    }

    const parsed = Function(`"use strict"; return (${arrayLiteral});`)() as unknown;

    if (!Array.isArray(parsed)) {
      return {
        data: [],
        error: `${filePath} 中的 ${exportName} 不是数组。`,
      };
    }

    return { data: parsed };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { data: [], missing: true };
    }

    return {
      data: [],
      error: `${filePath} 读取失败：${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function getReviewStatus(item: unknown) {
  const itemRecord =
    item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const status = stringValue(itemRecord.reviewStatus);

  return status || "pending";
}

function countStatus(items: unknown[], status: string) {
  return items.filter((item) => getReviewStatus(item) === status).length;
}

function getResourceId(item: unknown) {
  const itemRecord =
    item && typeof item === "object" ? (item as Record<string, unknown>) : {};

  return stringValue(itemRecord.id || itemRecord.resourceId);
}

function buildLatestByResourceId(items: unknown[]) {
  const map = new Map<string, Record<string, unknown>>();

  for (const item of items) {
    const itemRecord =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const resourceId = getResourceId(itemRecord);

    if (resourceId) {
      map.set(resourceId, itemRecord);
    }
  }

  return map;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function applyResourcePatch(
  resource: Record<string, unknown>,
  patch: Record<string, unknown> | undefined,
) {
  if (!patch) {
    return resource;
  }

  const nextResource = { ...resource };
  const stringFields = [
    "titleZh",
    "summaryShort",
    "summaryZh",
    "researchValue",
    "resourceType",
    "primaryTopicId",
    "status",
    "versionNote",
  ];
  const arrayFields = ["keyPoints", "topicIds", "tags"];

  for (const field of stringFields) {
    const value = stringValue(patch[field]);

    if (value) {
      nextResource[field] = value;
    }
  }

  for (const field of arrayFields) {
    const value = stringArrayValue(patch[field]);

    if (value.length > 0) {
      nextResource[field] = value;
    }
  }

  if (typeof patch.versioningApplicable === "boolean") {
    nextResource.versioningApplicable = patch.versioningApplicable;
  }

  return nextResource;
}

function hasCompleteEnrichmentContent(resource: Record<string, unknown>) {
  return (
    Boolean(stringValue(resource.titleZh)) &&
    Boolean(stringValue(resource.summaryShort)) &&
    Boolean(stringValue(resource.summaryZh)) &&
    stringArrayValue(resource.keyPoints).length > 0 &&
    Boolean(stringValue(resource.researchValue))
  );
}

function getEnrichmentCoverageStats({
  acceptedResources,
  resourceEnrichments,
  resourceAdminEdits,
}: {
  acceptedResources: unknown[];
  resourceEnrichments: unknown[];
  resourceAdminEdits: unknown[];
}) {
  const enrichmentByResourceId = buildLatestByResourceId(resourceEnrichments);
  const adminEditByResourceId = buildLatestByResourceId(resourceAdminEdits);
  let completeResourcesTotal = 0;

  for (const resource of acceptedResources) {
    const resourceRecord =
      resource && typeof resource === "object"
        ? (resource as Record<string, unknown>)
        : {};
    const resourceId = getResourceId(resourceRecord);
    const enrichedResource = applyResourcePatch(
      resourceRecord,
      enrichmentByResourceId.get(resourceId),
    );
    const finalResource = applyResourcePatch(
      enrichedResource,
      adminEditByResourceId.get(resourceId),
    );

    if (hasCompleteEnrichmentContent(finalResource)) {
      completeResourcesTotal += 1;
    }
  }

  return {
    completeResourcesTotal,
    incompleteResourcesTotal: Math.max(
      acceptedResources.length - completeResourcesTotal,
      0,
    ),
    resourceEnrichmentsTotal: enrichmentByResourceId.size,
    resourceAdminEditsTotal: adminEditByResourceId.size,
  };
}

function getResourceSlug(item: unknown) {
  const itemRecord =
    item && typeof item === "object" ? (item as Record<string, unknown>) : {};

  return stringValue(itemRecord.slug);
}

function buildResourceDetailPathById(acceptedResources: unknown[]) {
  const detailPathById = new Map<string, string>();

  for (const resource of acceptedResources) {
    const resourceId = getResourceId(resource);
    const slug = getResourceSlug(resource);

    if (resourceId && slug) {
      detailPathById.set(resourceId, `/resources/${slug}`);
    }
  }

  return detailPathById;
}

function getSnapshotStats(
  acceptedResources: unknown[],
  snapshotFiles: unknown[],
  snapshotAuditReport: Record<string, unknown>,
) {
  const summary =
    snapshotAuditReport.summary &&
    typeof snapshotAuditReport.summary === "object" &&
    !Array.isArray(snapshotAuditReport.summary)
      ? (snapshotAuditReport.summary as Record<string, unknown>)
      : null;

  if (summary) {
    return {
      totalResources: numberValue(
        summary.acceptedResourcesTotal,
        acceptedResources.length,
      ),
      completeSnapshots: numberValue(summary.resourcesWithCompleteSnapshots),
      partialSnapshots: numberValue(summary.resourcesWithPartialSnapshots),
      withoutSnapshots: numberValue(summary.resourcesWithoutSnapshots),
      missingFiles: numberValue(summary.missingFileCount),
      suspiciousSmallFiles: numberValue(summary.suspiciousSmallFileCount),
    };
  }

  const snapshotTypesByResourceId = new Map<string, Set<string>>();

  for (const file of snapshotFiles) {
    const fileRecord =
      file && typeof file === "object" ? (file as Record<string, unknown>) : {};
    const resourceId = stringValue(fileRecord.resourceId);
    const fileType = stringValue(fileRecord.fileType);

    if (!resourceId || (fileType !== "pdf" && fileType !== "screenshot")) {
      continue;
    }

    const fileTypes = snapshotTypesByResourceId.get(resourceId) ?? new Set<string>();
    fileTypes.add(fileType);
    snapshotTypesByResourceId.set(resourceId, fileTypes);
  }

  let completeSnapshots = 0;
  let partialSnapshots = 0;
  let withoutSnapshots = 0;

  for (const resource of acceptedResources) {
    const resourceId = getResourceId(resource);
    const fileTypes = snapshotTypesByResourceId.get(resourceId) ?? new Set<string>();

    if (fileTypes.has("pdf") && fileTypes.has("screenshot")) {
      completeSnapshots += 1;
    } else if (fileTypes.size > 0) {
      partialSnapshots += 1;
    } else {
      withoutSnapshots += 1;
    }
  }

  return {
    totalResources: acceptedResources.length,
    completeSnapshots,
    partialSnapshots,
    withoutSnapshots,
    missingFiles: 0,
    suspiciousSmallFiles: 0,
  };
}

function getReportArray(
  snapshotAuditReport: Record<string, unknown>,
  key: string,
) {
  const value = snapshotAuditReport[key];

  return Array.isArray(value) ? value : [];
}

function buildSnapshotIssues(
  acceptedResources: unknown[],
  snapshotAuditReport: Record<string, unknown>,
) {
  const detailPathById = buildResourceDetailPathById(acceptedResources);
  const normalizeResourceEntry = (entry: unknown) => {
    const entryRecord =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const resourceId = stringValue(entryRecord.resourceId);

    return {
      resourceId,
      title: stringValue(entryRecord.title) || resourceId,
      sourceDomain: stringValue(entryRecord.sourceDomain),
      sourceUrl: stringValue(entryRecord.sourceUrl),
      availableValidFileTypes: stringArrayValue(entryRecord.availableValidFileTypes),
      missingFileTypes: stringArrayValue(entryRecord.missingFileTypes),
      detailPath: detailPathById.get(resourceId) ?? "",
    };
  };

  return {
    partialSnapshotResources: getReportArray(
      snapshotAuditReport,
      "partialSnapshotResources",
    ).map(normalizeResourceEntry),
    missingSnapshotResources: getReportArray(
      snapshotAuditReport,
      "missingSnapshotResources",
    ).map(normalizeResourceEntry),
    suspiciousSmallFiles: getReportArray(
      snapshotAuditReport,
      "suspiciousSmallFiles",
    ).map((entry) => {
      const entryRecord =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const resourceId = stringValue(entryRecord.resourceId);

      return {
        id: stringValue(entryRecord.id),
        resourceId,
        fileType: stringValue(entryRecord.fileType),
        fileUrl: stringValue(entryRecord.fileUrl),
        fileSize: numberValue(entryRecord.fileSize),
        minimumExpectedSize: numberValue(entryRecord.minimumExpectedSize),
        detailPath: detailPathById.get(resourceId) ?? "",
      };
    }),
  };
}

function getReportObject(report: Record<string, unknown>, key: string) {
  const value = report[key];

  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildInstitutionById(acceptedInstitutions: unknown[]) {
  const institutionById = new Map<string, Record<string, unknown>>();

  for (const institution of acceptedInstitutions) {
    const institutionRecord =
      institution && typeof institution === "object"
        ? (institution as Record<string, unknown>)
        : {};
    const institutionId = stringValue(institutionRecord.id);

    if (institutionId) {
      institutionById.set(institutionId, institutionRecord);
    }
  }

  return institutionById;
}

function normalizeManualReviewLink(
  entry: unknown,
  institutionById: Map<string, Record<string, unknown>>,
) {
  const entryRecord =
    entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
  const institutionId = stringValue(entryRecord.institutionId);
  const currentInstitution = institutionById.get(institutionId) ?? {};

  return {
    institutionId,
    nameZh: stringValue(currentInstitution.nameZh) || stringValue(entryRecord.nameZh),
    nameEn: stringValue(currentInstitution.nameEn) || stringValue(entryRecord.nameEn),
    website: stringValue(entryRecord.website),
    status: stringValue(entryRecord.status) || "unknown",
    statusCode: numberValue(entryRecord.statusCode),
    finalUrl: stringValue(entryRecord.finalUrl),
    checkedAt: stringValue(entryRecord.checkedAt),
    errorMessage: stringValue(entryRecord.errorMessage),
    stateCode: stringValue(currentInstitution.stateCode) || stringValue(entryRecord.stateCode),
    stateName: stringValue(currentInstitution.stateName) || stringValue(entryRecord.stateName),
    stateNameZh:
      stringValue(currentInstitution.stateNameZh) || stringValue(entryRecord.stateNameZh),
    currentWebsite:
      stringValue(currentInstitution.website) || stringValue(entryRecord.website),
    currentLinkStatus:
      stringValue(currentInstitution.linkStatus) || stringValue(entryRecord.status),
    linkCheckNote: stringValue(currentInstitution.linkCheckNote),
    lastCheckedAt: stringValue(currentInstitution.lastCheckedAt),
    previousWebsite: stringValue(currentInstitution.previousWebsite),
  };
}

function buildInstitutionLinkAudit(
  institutionAuditReport: Record<string, unknown>,
  hasReport: boolean,
  acceptedInstitutions: unknown[],
) {
  const summary = getReportObject(institutionAuditReport, "summary");
  const institutionById = buildInstitutionById(acceptedInstitutions);
  const manualReviewLinks = Array.isArray(
    institutionAuditReport.manualReviewLinks,
  )
    ? institutionAuditReport.manualReviewLinks.map((entry) =>
        normalizeManualReviewLink(entry, institutionById),
      )
    : [];

  return {
    hasReport,
    generatedAt: stringValue(institutionAuditReport.generatedAt),
    summary: {
      totalInstitutions: numberValue(summary.totalInstitutions),
      okCount: numberValue(summary.okCount),
      redirectedCount: numberValue(summary.redirectedCount),
      blockedCount: numberValue(summary.blockedCount),
      notFoundCount: numberValue(summary.notFoundCount),
      timeoutCount: numberValue(summary.timeoutCount),
      networkErrorCount: numberValue(summary.networkErrorCount),
      needsManualReviewCount: numberValue(summary.needsManualReviewCount),
    },
    manualReviewLinks,
  };
}

function buildTasks({
  pendingDrafts,
  unenrichedResources,
  aiDraftsPending,
  withoutSnapshots,
  partialSnapshots,
  suspiciousSmallFiles,
}: {
  pendingDrafts: number;
  unenrichedResources: number;
  aiDraftsPending: number;
  withoutSnapshots: number;
  partialSnapshots: number;
  suspiciousSmallFiles: number;
}) {
  return [
    {
      id: "pending-drafts",
      label:
        pendingDrafts > 0
          ? `还有 ${pendingDrafts} 条草稿待审核`
          : "草稿审核已完成",
      count: pendingDrafts,
      status: pendingDrafts > 0 ? "todo" : "done",
    },
    {
      id: "unenriched-resources",
      label:
        unenrichedResources > 0
          ? `还有 ${unenrichedResources} 条资料未完善 enrichment`
          : "资料完善覆盖层已覆盖全部资料",
      count: unenrichedResources,
      status: unenrichedResources > 0 ? "todo" : "done",
    },
    {
      id: "ai-drafts-pending",
      label:
        aiDraftsPending > 0
          ? `还有 ${aiDraftsPending} 条 AI enrichment 草稿待审核`
          : "AI enrichment 草稿审核已完成",
      count: aiDraftsPending,
      status: aiDraftsPending > 0 ? "todo" : "done",
    },
    {
      id: "missing-snapshots",
      label:
        withoutSnapshots > 0
          ? `还有 ${withoutSnapshots} 条资料没有快照`
          : "所有资料都有可用快照记录",
      count: withoutSnapshots,
      status: withoutSnapshots > 0 ? "todo" : "done",
    },
    {
      id: "partial-snapshots",
      label:
        partialSnapshots > 0
          ? `有 ${partialSnapshots} 条资料只有部分快照`
          : "没有部分快照资料",
      count: partialSnapshots,
      status: partialSnapshots > 0 ? "todo" : "done",
    },
    {
      id: "suspicious-files",
      label:
        suspiciousSmallFiles > 0
          ? `有 ${suspiciousSmallFiles} 个快照文件疑似异常`
          : "没有疑似异常快照文件",
      count: suspiciousSmallFiles,
      status: suspiciousSmallFiles > 0 ? "todo" : "done",
    },
  ];
}

export async function GET() {
  const [
    acceptedResourcesResult,
    acceptedInstitutionsResult,
    enrichmentDraftsResult,
    snapshotFilesResult,
    snapshotAuditReportResult,
    institutionAuditReportResult,
    resourceEnrichmentsResult,
    resourceAdminEditsJsonResult,
    resourceAdminEditsTsResult,
    ...draftSourceResults
  ] = await Promise.all([
    readOptionalJsonArray(acceptedResourcesPath),
    readOptionalJsonArray(acceptedInstitutionsPath),
    readOptionalJsonArray(enrichmentDraftsPath),
    readOptionalJsonArray(snapshotFilesPath),
    readOptionalJsonObject(snapshotAuditReportPath),
    readOptionalJsonObject(institutionAuditReportPath),
    readOptionalTsArray(resourceEnrichmentsPath, "resourceEnrichments"),
    readOptionalJsonArray(resourceAdminEditsJsonPath),
    readOptionalTsArray(resourceAdminEditsTsPath, "resourceAdminEdits"),
    ...draftSources.map((source) => readOptionalJsonArray(source.filePath)),
  ]);
  const errors = [
    acceptedResourcesResult.error,
    acceptedInstitutionsResult.error,
    enrichmentDraftsResult.error,
    snapshotFilesResult.error,
    snapshotAuditReportResult.error,
    institutionAuditReportResult.error,
    resourceEnrichmentsResult.error,
    resourceAdminEditsJsonResult.error,
    resourceAdminEditsTsResult.error,
    ...draftSourceResults.map((result) => result.error),
  ].filter((error): error is string => Boolean(error));
  const draftSourceStats = draftSources.map((source, index) => {
    const drafts = draftSourceResults[index]?.data ?? [];

    return {
      sourceKey: source.sourceKey,
      labelZh: source.labelZh,
      draftCount: drafts.length,
      accepted: countStatus(drafts, "accepted"),
      pending: countStatus(drafts, "pending"),
      rejected: countStatus(drafts, "rejected"),
      needsReview: countStatus(drafts, "needs_review"),
      published: countStatus(drafts, "published"),
      readError: draftSourceResults[index]?.error ?? "",
    };
  });
  const allDrafts = draftSourceResults.flatMap((result) => result.data);
  const acceptedResources = acceptedResourcesResult.data;
  const resourceAdminEdits = [
    ...resourceAdminEditsJsonResult.data,
    ...resourceAdminEditsTsResult.data,
  ];
  const enrichmentCoverage = getEnrichmentCoverageStats({
    acceptedResources,
    resourceEnrichments: resourceEnrichmentsResult.data,
    resourceAdminEdits,
  });
  const enrichmentDrafts = enrichmentDraftsResult.data;
  const snapshotStats = getSnapshotStats(
    acceptedResources,
    snapshotFilesResult.data,
    snapshotAuditReportResult.data,
  );
  const snapshotIssues = buildSnapshotIssues(
    acceptedResources,
    snapshotAuditReportResult.data,
  );
  const institutionLinkAudit = buildInstitutionLinkAudit(
    institutionAuditReportResult.data,
    !institutionAuditReportResult.missing && !institutionAuditReportResult.error,
    acceptedInstitutionsResult.data,
  );
  const overview = {
    acceptedResourcesTotal: acceptedResources.length,
    draftsTotal: allDrafts.length,
    pendingDrafts: countStatus(allDrafts, "pending"),
    acceptedDrafts: countStatus(allDrafts, "accepted"),
    rejectedDrafts: countStatus(allDrafts, "rejected"),
    needsReviewDrafts: countStatus(allDrafts, "needs_review"),
  };
  const enrichment = {
    enrichedResourcesTotal: enrichmentCoverage.completeResourcesTotal,
    unenrichedResourcesTotal: enrichmentCoverage.incompleteResourcesTotal,
    resourceEnrichmentsTotal: enrichmentCoverage.resourceEnrichmentsTotal,
    resourceAdminEditsTotal: enrichmentCoverage.resourceAdminEditsTotal,
    aiDraftsTotal: enrichmentDrafts.length,
    aiDraftsPending: countStatus(enrichmentDrafts, "pending"),
    aiDraftsAccepted: countStatus(enrichmentDrafts, "accepted"),
    aiDraftsApplied: countStatus(enrichmentDrafts, "applied"),
  };

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    errors,
    overview,
    enrichment,
    snapshots: snapshotStats,
    snapshotIssues,
    institutionLinkAudit,
    bySource: draftSourceStats,
    tasks: buildTasks({
      pendingDrafts: overview.pendingDrafts,
      unenrichedResources: enrichment.unenrichedResourcesTotal,
      aiDraftsPending: enrichment.aiDraftsPending,
      withoutSnapshots: snapshotStats.withoutSnapshots,
      partialSnapshots: snapshotStats.partialSnapshots,
      suspiciousSmallFiles: snapshotStats.suspiciousSmallFiles,
    }),
  });
}
