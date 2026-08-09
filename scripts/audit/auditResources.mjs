import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const resourceEnrichmentsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichments.ts",
);
const resourceSnapshotFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceSnapshotFiles.json",
);
const resourceOfficialFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceOfficialFiles.ts",
);
const resourceCurationDecisionsTsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceCurationDecisions.ts",
);
const resourceCurationDecisionsJsonPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceCurationDecisions.json",
);
const reportPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityReport.json",
);

const requiredSnapshotFileTypes = ["pdf", "screenshot"];
const irrelevantTerms = [
  "appointment",
  "appointments",
  "personnel",
  "nomination",
  "meeting notice",
  "information collection activities",
  "generic clearance",
  "agency information collection",
  "renewal of collection",
  "comment request",
  "advisory committee nomination",
  "solicitation of nominations",
];
const protectedTerms = [
  "foia",
  "records management",
  "federal records",
  "electronic records",
];
const institutionTerms = [
  "Center",
  "Library",
  "Museum",
  "Association",
  "Office",
  "Institute",
  "Institution",
  "图书馆",
  "博物馆",
  "协会",
  "中心",
  "机构",
];

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function cleanStringArray(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : [];
}

function slugify(value) {
  const slug = cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "resource";
}

async function readJsonArray(filePath, options = {}) {
  const { optional = false } = options;

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error("文件内容不是 JSON 数组。");
    }

    return parsed;
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return [];
    }

    throw new Error(`${filePath} 读取失败：${getErrorMessage(error)}`);
  }
}

async function readTsArrayExport(filePath, exportName, options = {}) {
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

    console.warn(`${filePath} 读取失败：${getErrorMessage(error)}`);
    return [];
  }
}

function buildLatestDecisionMap(decisions) {
  const decisionMap = new Map();

  for (const decision of decisions) {
    const resourceId = cleanString(decision?.resourceId);

    if (resourceId) {
      decisionMap.set(resourceId, decision);
    }
  }

  return decisionMap;
}

function isHiddenOrExcludedDecision(decision) {
  return (
    decision?.hiddenFromLibrary === true ||
    decision?.decision === "exclude" ||
    decision?.decision === "hidden"
  );
}

function isInstitutionRoutedResource(resource) {
  const sourceUrl = cleanString(resource.sourceUrl);
  const id = cleanString(resource.id);

  return (
    resource.targetEntityType === "institution" ||
    cleanString(resource.resourceType) === "institution_resource" ||
    ["nara-web-alic", "nara-web-presidential-libraries", "nara-web-about-nara"].includes(
      id,
    ) ||
    [
      "https://www.archives.gov/research/alic",
      "https://www.archives.gov/presidential-libraries",
      "https://www.archives.gov/about",
    ].includes(sourceUrl)
  );
}

function makeBaseItem(resource, effectiveResource = resource) {
  const resourceId = cleanString(resource.id);
  const titleEn = cleanString(effectiveResource.titleEn || resource.titleEn);
  const titleZh = cleanString(effectiveResource.titleZh || resource.titleZh);
  const slug = cleanString(resource.slug) || slugify(titleEn || resourceId);

  return {
    resourceId,
    slug,
    titleEn,
    titleZh,
    sourceDomain: cleanString(resource.sourceDomain),
    sourceUrl: cleanString(resource.sourceUrl),
    detailUrl: `/resources/${slug}`,
  };
}

function mergeEffectiveResource(resource, enrichment) {
  if (!enrichment) {
    return {
      ...resource,
      keyPoints: cleanStringArray(resource.keyPoints),
      tags: cleanStringArray(resource.tags),
    };
  }

  return {
    ...resource,
    titleZh: cleanString(enrichment.titleZh) || cleanString(resource.titleZh),
    summaryShort:
      cleanString(enrichment.summaryShort) || cleanString(resource.summaryShort),
    summaryZh: cleanString(enrichment.summaryZh) || cleanString(resource.summaryZh),
    keyPoints: cleanStringArray(enrichment.keyPoints).length
      ? cleanStringArray(enrichment.keyPoints)
      : cleanStringArray(resource.keyPoints),
    researchValue:
      cleanString(enrichment.researchValue) || cleanString(resource.researchValue),
    tags: cleanStringArray(enrichment.tags).length
      ? [...new Set([...cleanStringArray(resource.tags), ...cleanStringArray(enrichment.tags)])]
      : cleanStringArray(resource.tags),
  };
}

function getMissingFields(effectiveResource) {
  const missingFields = [];

  if (!cleanString(effectiveResource.titleZh)) {
    missingFields.push("titleZh");
  }

  if (!cleanString(effectiveResource.summaryShort)) {
    missingFields.push("summaryShort");
  }

  if (!cleanString(effectiveResource.summaryZh)) {
    missingFields.push("summaryZh");
  }

  if (cleanStringArray(effectiveResource.keyPoints).length === 0) {
    missingFields.push("keyPoints");
  }

  if (!cleanString(effectiveResource.researchValue)) {
    missingFields.push("researchValue");
  }

  return missingFields;
}

function getSnapshotStatus(resourceId, snapshotFilesByResourceId) {
  const files = snapshotFilesByResourceId.get(resourceId) ?? [];
  const fileTypes = new Set(
    files.map((file) => {
      const fileType = cleanString(file.fileType);

      return fileType === "image" ? "screenshot" : fileType;
    }),
  );
  const missingFileTypes = requiredSnapshotFileTypes.filter(
    (fileType) => !fileTypes.has(fileType),
  );

  if (missingFileTypes.length === 0) {
    return {
      status: "complete",
      fileCount: files.length,
      fileTypes: [...fileTypes].filter(Boolean).sort(),
      missingFileTypes,
    };
  }

  if (files.length > 0) {
    return {
      status: "partial",
      fileCount: files.length,
      fileTypes: [...fileTypes].filter(Boolean).sort(),
      missingFileTypes,
    };
  }

  return {
    status: "none",
    fileCount: 0,
    fileTypes: [],
    missingFileTypes,
  };
}

function findMatchedTerms(text, terms) {
  const normalizedText = text.toLowerCase();

  return terms.filter((term) => normalizedText.includes(term.toLowerCase()));
}

function buildReport({
  acceptedResources,
  resourceEnrichments,
  snapshotFiles,
  officialFiles,
  curationDecisions,
}) {
  const enrichmentByResourceId = new Map(
    resourceEnrichments
      .map((enrichment) => [cleanString(enrichment.resourceId), enrichment])
      .filter(([resourceId]) => Boolean(resourceId)),
  );
  const snapshotFilesByResourceId = new Map();
  const officialFilesByResourceId = new Map();
  const decisionMap = buildLatestDecisionMap(curationDecisions);

  for (const file of snapshotFiles) {
    const resourceId = cleanString(file?.resourceId);

    if (!resourceId) {
      continue;
    }

    if (!snapshotFilesByResourceId.has(resourceId)) {
      snapshotFilesByResourceId.set(resourceId, []);
    }

    snapshotFilesByResourceId.get(resourceId).push(file);
  }

  for (const officialFile of officialFiles) {
    const resourceId = cleanString(officialFile?.resourceId);

    if (!resourceId) {
      continue;
    }

    if (!officialFilesByResourceId.has(resourceId)) {
      officialFilesByResourceId.set(resourceId, []);
    }

    officialFilesByResourceId.get(resourceId).push(officialFile);
  }

  const missingFields = [];
  const suspectIrrelevantResources = [];
  const suspectInstitutionResources = [];
  const snapshotStatuses = [];
  const officialFileStatuses = [];
  const hiddenOrExcludedResources = [];

  const counts = {
    missingTitleZhCount: 0,
    missingSummaryShortCount: 0,
    missingSummaryZhCount: 0,
    missingKeyPointsCount: 0,
    missingResearchValueCount: 0,
    noSnapshotCount: 0,
    partialSnapshotCount: 0,
    noOfficialFilesCount: 0,
  };

  let hiddenOrExcludedCount = 0;
  let institutionRoutedCount = 0;

  for (const resource of acceptedResources) {
    const resourceId = cleanString(resource.id);
    const enrichment = enrichmentByResourceId.get(resourceId);
    const effectiveResource = mergeEffectiveResource(resource, enrichment);
    const baseItem = makeBaseItem(resource, effectiveResource);
    const decision = decisionMap.get(resourceId);
    const hiddenOrExcluded = isHiddenOrExcludedDecision(decision);
    const institutionRouted = isInstitutionRoutedResource(resource);

    if (hiddenOrExcluded) {
      hiddenOrExcludedCount += 1;
      hiddenOrExcludedResources.push({
        ...baseItem,
        decision: cleanString(decision?.decision),
        reason: cleanString(decision?.reason),
      });
    }

    if (institutionRouted) {
      institutionRoutedCount += 1;
    }

    const resourceMissingFields = getMissingFields(effectiveResource);

    if (resourceMissingFields.includes("titleZh")) {
      counts.missingTitleZhCount += 1;
    }

    if (resourceMissingFields.includes("summaryShort")) {
      counts.missingSummaryShortCount += 1;
    }

    if (resourceMissingFields.includes("summaryZh")) {
      counts.missingSummaryZhCount += 1;
    }

    if (resourceMissingFields.includes("keyPoints")) {
      counts.missingKeyPointsCount += 1;
    }

    if (resourceMissingFields.includes("researchValue")) {
      counts.missingResearchValueCount += 1;
    }

    if (resourceMissingFields.length > 0) {
      missingFields.push({
        ...baseItem,
        missingFields: resourceMissingFields,
      });
    }

    const snapshotStatus = getSnapshotStatus(resourceId, snapshotFilesByResourceId);

    if (snapshotStatus.status === "none") {
      counts.noSnapshotCount += 1;
    }

    if (snapshotStatus.status === "partial") {
      counts.partialSnapshotCount += 1;
    }

    snapshotStatuses.push({
      ...baseItem,
      ...snapshotStatus,
    });

    const officialFileCount = officialFilesByResourceId.get(resourceId)?.length ?? 0;
    const hasOfficialFiles = officialFileCount > 0;

    if (!hasOfficialFiles) {
      counts.noOfficialFilesCount += 1;
    }

    officialFileStatuses.push({
      ...baseItem,
      hasOfficialFiles,
      officialFileCount,
    });

    const textForIrrelevance = [
      effectiveResource.titleEn,
      effectiveResource.titleZh,
      ...cleanStringArray(effectiveResource.tags),
    ]
      .join(" ")
      .toLowerCase();
    const matchedIrrelevantTerms = findMatchedTerms(
      textForIrrelevance,
      irrelevantTerms,
    );

    if (matchedIrrelevantTerms.length > 0) {
      const matchedProtectedTerms = findMatchedTerms(
        textForIrrelevance,
        protectedTerms,
      );

      suspectIrrelevantResources.push({
        ...baseItem,
        matchedTerms: matchedIrrelevantTerms,
        protectedTerms: matchedProtectedTerms,
        suggestedDecision:
          matchedProtectedTerms.length > 0 ? "needs_review" : "exclude",
        issueTags:
          matchedProtectedTerms.length > 0
            ? ["疑似弱相关", "含档案治理关键词，需复核"]
            : ["疑似弱相关"],
        reason:
          matchedProtectedTerms.length > 0
            ? "命中一般行政公告关键词，但同时包含 FOIA、records management、federal records 或 electronic records 等关键词，建议人工复核。"
            : "命中官员任命、人员、一般信息收集或提名征集类关键词，可能与档案资源建设关系较弱。",
      });
    }

    const textForInstitution = [effectiveResource.titleEn, effectiveResource.titleZh]
      .join(" ");
    const matchedInstitutionTerms = findMatchedTerms(
      textForInstitution,
      institutionTerms,
    );

    if (matchedInstitutionTerms.length > 0) {
      suspectInstitutionResources.push({
        ...baseItem,
        matchedTerms: matchedInstitutionTerms,
        suggestedDecision: "move_to_institution",
        issueTags: ["疑似机构资料"],
        reason: "标题命中机构、图书馆、中心、协会、办公室等机构类关键词，可能更适合进入机构模块。",
      });
    }
  }

  const noSnapshotResources = snapshotStatuses.filter(
    (item) => item.status === "none",
  );
  const partialSnapshotResources = snapshotStatuses.filter(
    (item) => item.status === "partial",
  );
  const noOfficialFileResources = officialFileStatuses.filter(
    (item) => !item.hasOfficialFiles,
  );

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      acceptedResourcesTotal: acceptedResources.length,
      hiddenOrExcludedCount,
      excludedByEntityRoutingCount: institutionRoutedCount,
      visibleCount: acceptedResources.filter((resource) => {
        const resourceId = cleanString(resource.id);

        return (
          !isInstitutionRoutedResource(resource) &&
          !isHiddenOrExcludedDecision(decisionMap.get(resourceId))
        );
      }).length,
      ...counts,
      suspectIrrelevantCount: suspectIrrelevantResources.length,
      suspectInstitutionCount: suspectInstitutionResources.length,
    },
    missingFields,
    suspectIrrelevantResources,
    suspectInstitutionResources,
    snapshotStatuses,
    officialFileStatuses,
    noSnapshotResources,
    partialSnapshotResources,
    noOfficialFileResources,
    hiddenOrExcludedResources,
  };
}

async function main() {
  const acceptedResources = await readJsonArray(acceptedResourcesPath);
  const resourceEnrichments = await readTsArrayExport(
    resourceEnrichmentsPath,
    "resourceEnrichments",
    { optional: true },
  );
  const snapshotFiles = await readJsonArray(resourceSnapshotFilesPath, {
    optional: true,
  });
  const officialFiles = await readTsArrayExport(
    resourceOfficialFilesPath,
    "resourceOfficialFiles",
    { optional: true },
  );
  const curationDecisions = [
    ...(await readTsArrayExport(
      resourceCurationDecisionsTsPath,
      "resourceCurationDecisions",
      { optional: true },
    )),
    ...(await readJsonArray(resourceCurationDecisionsJsonPath, {
      optional: true,
    })),
  ];
  const report = buildReport({
    acceptedResources,
    resourceEnrichments,
    snapshotFiles,
    officialFiles,
    curationDecisions,
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`acceptedResources 总数：${report.summary.acceptedResourcesTotal}`);
  console.log(`前台可见数量：${report.summary.visibleCount}`);
  console.log(`已隐藏 / 排除数量：${report.summary.hiddenOrExcludedCount}`);
  console.log(`缺失字段资料数量：${report.missingFields.length}`);
  console.log(`疑似无关资料数量：${report.summary.suspectIrrelevantCount}`);
  console.log(`疑似机构资料数量：${report.summary.suspectInstitutionCount}`);
  console.log(`无快照数量：${report.summary.noSnapshotCount}`);
  console.log(`部分快照数量：${report.summary.partialSnapshotCount}`);
  console.log(`无 officialFiles 数量：${report.summary.noOfficialFilesCount}`);
  console.log(`报告写入路径：${reportPath}`);
}

main().catch((error) => {
  console.error(`资源质量审计失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
