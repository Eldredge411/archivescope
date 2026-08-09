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
const resourceAdminEditsJsonPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceAdminEdits.json",
);
const resourceAdminEditsTsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceAdminEdits.ts",
);
const resourceCurationDecisionsJsonPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceCurationDecisions.json",
);
const resourceCurationDecisionsTsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceCurationDecisions.ts",
);
const resourceSnapshotFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceSnapshotFiles.json",
);
const resourceOfficialFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceOfficialFiles.ts",
);
const mockDataPath = path.join(projectRoot, "src/data/mockData.ts");
const logsPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAgentLogs.json",
);
const reportPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAgentReport.json",
);

const allowedResourceTypes = [
  "law",
  "regulation",
  "policy",
  "strategy",
  "guidance",
  "portal",
  "catalog",
  "database",
  "program",
  "system",
  "report",
];

const allowedTopicIds = [
  "laws-policies-governance",
  "electronic-records-management",
  "digital-resources-preservation",
  "access-outreach-public-participation",
  "ai-emerging-technologies",
  "social-actors-service-ecosystem",
];

const officialFileRecommendedTypes = new Set([
  "law",
  "regulation",
  "strategy",
  "report",
]);

const lowRelevanceTerms = [
  "appointment",
  "personnel",
  "generic clearance",
  "information collection activities",
  "renewal of collection",
  "comment request",
  "solicitation of nominations",
  "solicitation for",
  "committee member nominations",
  "nominations",
  "meeting notice",
];

const protectedTerms = [
  "foia",
  "records management",
  "federal records",
  "electronic records",
  "presidential records",
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

const institutionLikeResourceIds = new Set([
  "nara-web-alic",
  "nara-web-presidential-libraries",
  "nara-web-about-nara",
]);
const institutionLikeSourceUrls = new Set([
  "https://www.archives.gov/research/alic",
  "https://www.archives.gov/presidential-libraries",
  "https://www.archives.gov/about",
]);

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function cleanString(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(cleanString).filter(Boolean))];
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

function getSourceDomain(resource) {
  const sourceDomain = cleanString(resource.sourceDomain);

  if (sourceDomain) {
    return sourceDomain;
  }

  try {
    return new URL(cleanString(resource.sourceUrl)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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

    if (optional) {
      console.warn(`${filePath} 读取失败，按空数组处理：${getErrorMessage(error)}`);
      return [];
    }

    throw new Error(`${filePath} 读取失败：${getErrorMessage(error)}`);
  }
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildLatestByResourceId(records, idField = "resourceId") {
  const recordByResourceId = new Map();

  for (const record of records) {
    const resourceId = cleanString(record?.[idField]);

    if (resourceId) {
      recordByResourceId.set(resourceId, record);
    }
  }

  return recordByResourceId;
}

function groupByResourceId(records) {
  const grouped = new Map();

  for (const record of records) {
    const resourceId = cleanString(record?.resourceId);

    if (!resourceId) {
      continue;
    }

    if (!grouped.has(resourceId)) {
      grouped.set(resourceId, []);
    }

    grouped.get(resourceId).push(record);
  }

  return grouped;
}

function mergeUniqueStrings(...values) {
  return [...new Set(values.flat().map(cleanString).filter(Boolean))];
}

function shouldIncludeAcceptedResource(resource) {
  if (resource?.targetEntityType === "institution") {
    return false;
  }

  if (cleanString(resource?.resourceType) === "institution_resource") {
    return false;
  }

  const id = cleanString(resource?.id);
  const sourceUrl = cleanString(resource?.sourceUrl);

  if (institutionLikeResourceIds.has(id)) {
    return false;
  }

  return !institutionLikeSourceUrls.has(sourceUrl);
}

function isHiddenOrExcludedDecision(decision) {
  return (
    decision?.hiddenFromLibrary === true ||
    decision?.decision === "exclude" ||
    decision?.decision === "hidden"
  );
}

function shouldShowResourceInLibrary(resource, decisionMap) {
  const resourceIds = [
    cleanString(resource.id),
    ...cleanStringArray(resource.sourceResourceIds),
  ];

  return !resourceIds.some((resourceId) =>
    isHiddenOrExcludedDecision(decisionMap.get(resourceId)),
  );
}

function applyResourcePatch(resource, patch) {
  if (!patch) {
    return resource;
  }

  const patchTopicIds = cleanStringArray(patch.topicIds);
  const patchTags = cleanStringArray(patch.tags);
  const patchKeyPoints = cleanStringArray(patch.keyPoints);
  const primaryTopicId =
    cleanString(patch.primaryTopicId) || cleanString(resource.primaryTopicId);

  return {
    ...resource,
    titleZh: cleanString(patch.titleZh) || cleanString(resource.titleZh),
    titleEn: cleanString(patch.titleEn) || cleanString(resource.titleEn),
    summaryShort:
      cleanString(patch.summaryShort) || cleanString(resource.summaryShort),
    summaryZh: cleanString(patch.summaryZh) || cleanString(resource.summaryZh),
    keyPoints: patchKeyPoints.length
      ? patchKeyPoints
      : cleanStringArray(resource.keyPoints),
    researchValue:
      cleanString(patch.researchValue) || cleanString(resource.researchValue),
    resourceType:
      cleanString(patch.resourceType) || cleanString(resource.resourceType),
    primaryTopicId,
    topicIds: patchTopicIds.length
      ? mergeUniqueStrings([primaryTopicId], patchTopicIds)
      : mergeUniqueStrings([primaryTopicId], cleanStringArray(resource.topicIds)),
    tags: patchTags.length
      ? mergeUniqueStrings(cleanStringArray(resource.tags), patchTags)
      : cleanStringArray(resource.tags),
    status: cleanString(patch.status) || cleanString(resource.status),
    versioningApplicable:
      typeof patch.versioningApplicable === "boolean"
        ? patch.versioningApplicable
        : resource.versioningApplicable,
    versionNote:
      cleanString(patch.versionNote) || cleanString(resource.versionNote),
  };
}

function normalizeBaseResource(resource) {
  const primaryTopicId =
    cleanString(resource.primaryTopicId) ||
    cleanStringArray(resource.topicIds)[0] ||
    "";

  return {
    ...resource,
    id: cleanString(resource.id),
    slug: cleanString(resource.slug) || slugify(resource.titleEn || resource.id),
    titleZh: cleanString(resource.titleZh),
    titleEn: cleanString(resource.titleEn),
    countryId: cleanString(resource.countryId),
    institutionId: cleanString(resource.institutionId),
    resourceType: cleanString(resource.resourceType),
    primaryTopicId,
    topicIds: primaryTopicId
      ? mergeUniqueStrings([primaryTopicId], cleanStringArray(resource.topicIds))
      : cleanStringArray(resource.topicIds),
    tags: cleanStringArray(resource.tags),
    summaryShort: cleanString(resource.summaryShort),
    summaryZh: cleanString(resource.summaryZh),
    keyPoints: cleanStringArray(resource.keyPoints),
    researchValue: cleanString(resource.researchValue),
    sourceUrl: cleanString(resource.sourceUrl),
    sourceDomain: cleanString(resource.sourceDomain),
    linkStatus: cleanString(resource.linkStatus),
    status: cleanString(resource.status),
    currentVersionId: cleanString(resource.currentVersionId),
    hasVersions: resource.hasVersions === true,
    versioningApplicable:
      typeof resource.versioningApplicable === "boolean"
        ? resource.versioningApplicable
        : false,
    versionNote: cleanString(resource.versionNote),
  };
}

function buildVisibleResources({
  acceptedResources,
  resourceEnrichments,
  resourceAdminEdits,
  curationDecisions,
}) {
  const enrichmentByResourceId = buildLatestByResourceId(resourceEnrichments);
  const adminEditByResourceId = buildLatestByResourceId(resourceAdminEdits);
  const decisionMap = buildLatestByResourceId(curationDecisions);

  return acceptedResources
    .filter(shouldIncludeAcceptedResource)
    .map((resource) => {
      const baseResource = normalizeBaseResource(resource);
      const enrichedResource = applyResourcePatch(
        baseResource,
        enrichmentByResourceId.get(baseResource.id),
      );
      const adminEditedResource = applyResourcePatch(
        enrichedResource,
        adminEditByResourceId.get(baseResource.id),
      );

      return {
        ...normalizeBaseResource(adminEditedResource),
        sourceDomain: getSourceDomain(adminEditedResource),
      };
    })
    .filter((resource) => shouldShowResourceInLibrary(resource, decisionMap));
}

function getSnapshotStatus(resourceId, snapshotFilesByResourceId) {
  const files = snapshotFilesByResourceId.get(resourceId) ?? [];
  const fileTypes = new Set(
    files
      .map((file) => cleanString(file.fileType))
      .map((fileType) => (fileType === "image" ? "screenshot" : fileType))
      .filter(Boolean),
  );
  const hasPdf = fileTypes.has("pdf");
  const hasScreenshot = fileTypes.has("screenshot");
  const missingFileTypes = [
    ...(hasPdf ? [] : ["pdf"]),
    ...(hasScreenshot ? [] : ["screenshot"]),
  ];

  if (hasPdf && hasScreenshot) {
    return {
      status: "complete",
      fileCount: files.length,
      fileTypes: [...fileTypes].sort(),
      missingFileTypes: [],
    };
  }

  if (files.length > 0) {
    return {
      status: "partial",
      fileCount: files.length,
      fileTypes: [...fileTypes].sort(),
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
  const normalizedText = cleanString(text).toLowerCase();

  return terms.filter((term) => normalizedText.includes(term.toLowerCase()));
}

function addIssue(issues, category, severity, message) {
  issues.push({ category, severity, message });
}

function getItemTitle(resource) {
  return resource.titleZh || resource.titleEn || resource.id;
}

function makeCompactItem(log) {
  return {
    resourceId: log.resourceId,
    title: log.title,
    titleZh: log.titleZh,
    titleEn: log.titleEn,
    slug: log.slug,
    detailUrl: log.detailUrl,
    adminUrl: log.adminUrl,
    resourceType: log.resourceType,
    sourceDomain: log.sourceDomain,
    sourceUrl: log.sourceUrl,
    issueTags: log.issueTags,
    recommendedActions: log.recommendedActions,
    finalStatus: log.finalStatus,
    snapshotStatus: log.checks.snapshot.status,
    officialFileCount: log.checks.officialFiles.officialFileCount,
  };
}

function hasRealVersion(versions) {
  return versions.some((version) => {
    const text = [
      version.id,
      version.versionTitle,
      version.versionNumber,
      version.versionStatus,
      version.summaryZh,
      version.humanNote,
    ]
      .map(cleanString)
      .join(" ")
      .toLowerCase();

    if (!text) {
      return false;
    }

    return !(
      text.includes("fallback") ||
      text.includes("placeholder") ||
      text.includes("占位")
    );
  });
}

function determineFinalStatus(flags) {
  if (flags.suspectLowRelevance) {
    return "suspect_low_relevance";
  }

  if (flags.needsHumanReview) {
    return "needs_human_review";
  }

  if (flags.needsClassificationReview) {
    return "needs_classification_review";
  }

  if (flags.needsEnrichment) {
    return "needs_enrichment";
  }

  if (flags.needsOfficialFile) {
    return "needs_official_file";
  }

  if (flags.needsVersionReview) {
    return "needs_version_review";
  }

  if (flags.needsSnapshot) {
    return "needs_snapshot";
  }

  return "passed";
}

function inspectResource({
  resource,
  snapshotFilesByResourceId,
  officialFilesByResourceId,
  resourceVersionsByResourceId,
  checkedAt,
}) {
  const issues = [];
  const recommendedActions = [];
  const issueTags = [];
  const flags = {
    needsEnrichment: false,
    needsClassificationReview: false,
    needsSnapshot: false,
    needsOfficialFile: false,
    needsVersionReview: false,
    suspectLowRelevance: false,
    needsHumanReview: false,
  };
  const title = getItemTitle(resource);
  const resourceId = resource.id;
  const slug = resource.slug || slugify(resource.titleEn || resourceId);
  const basicMissingFields = [];

  if (!resource.titleZh && !resource.titleEn) {
    basicMissingFields.push("titleZh/titleEn");
  }

  for (const field of [
    "countryId",
    "institutionId",
    "resourceType",
    "primaryTopicId",
    "sourceUrl",
  ]) {
    if (!cleanString(resource[field])) {
      basicMissingFields.push(field);
    }
  }

  if (resource.topicIds.length === 0) {
    basicMissingFields.push("topicIds");
  }

  if (basicMissingFields.length > 0) {
    flags.needsHumanReview = true;
    issueTags.push("基础元数据缺失");
    recommendedActions.push("补齐资料基础元数据");
    addIssue(
      issues,
      "basicMetadata",
      "high",
      `缺少基础字段：${basicMissingFields.join(" / ")}`,
    );
  }

  const enrichmentMissingFields = [];

  if (!resource.summaryShort) {
    enrichmentMissingFields.push("summaryShort");
  }

  if (!resource.summaryZh) {
    enrichmentMissingFields.push("summaryZh");
  }

  if (resource.keyPoints.length < 3) {
    enrichmentMissingFields.push("keyPoints>=3");
  }

  if (!resource.researchValue) {
    enrichmentMissingFields.push("researchValue");
  }

  if (resource.tags.length < 3) {
    enrichmentMissingFields.push("tags>=3");
  }

  if (enrichmentMissingFields.length > 0) {
    flags.needsEnrichment = true;
    issueTags.push("内容需完善");
    recommendedActions.push("生成或审核 AI enrichment 草稿");
    addIssue(
      issues,
      "enrichment",
      "medium",
      `缺少内容完善字段：${enrichmentMissingFields.join(" / ")}`,
    );
  }

  const classificationIssues = [];
  const invalidResourceType =
    resource.resourceType && !allowedResourceTypes.includes(resource.resourceType)
      ? resource.resourceType
      : "";
  const invalidPrimaryTopic =
    resource.primaryTopicId && !allowedTopicIds.includes(resource.primaryTopicId)
      ? resource.primaryTopicId
      : "";
  const invalidTopicIds = resource.topicIds.filter(
    (topicId) => !allowedTopicIds.includes(topicId),
  );
  const topicIdsContainsPrimary =
    Boolean(resource.primaryTopicId) && resource.topicIds.includes(resource.primaryTopicId);
  const titleText = [resource.titleEn, resource.titleZh].join(" ");
  const matchedInstitutionTerms = findMatchedTerms(titleText, institutionTerms);
  const possibleInstitution = matchedInstitutionTerms.length > 0;

  if (invalidResourceType) {
    classificationIssues.push(`resourceType 不在允许范围：${invalidResourceType}`);
  }

  if (invalidPrimaryTopic) {
    classificationIssues.push(`primaryTopicId 不在允许范围：${invalidPrimaryTopic}`);
  }

  if (invalidTopicIds.length > 0) {
    classificationIssues.push(`topicIds 存在非法值：${invalidTopicIds.join(" / ")}`);
  }

  if (resource.primaryTopicId && !topicIdsContainsPrimary) {
    classificationIssues.push("topicIds 未包含 primaryTopicId");
  }

  if (possibleInstitution) {
    classificationIssues.push("标题命中机构类关键词，可能应进入机构模块");
  }

  if (classificationIssues.length > 0) {
    flags.needsClassificationReview = true;
    issueTags.push(possibleInstitution ? "疑似机构资料" : "分类需复核");
    recommendedActions.push("人工复核资料类型、专题或机构分流");
    addIssue(
      issues,
      "classification",
      "medium",
      classificationIssues.join("；"),
    );
  }

  const linkStatus = resource.linkStatus || "unknown";
  const linkNeedsReview = ["not_found", "failed", "unknown", "broken"].includes(
    linkStatus,
  );

  if (!resource.sourceUrl || linkNeedsReview) {
    flags.needsHumanReview = true;
    issueTags.push(resource.sourceUrl ? "来源链接需复核" : "缺来源链接");
    recommendedActions.push("人工复核 sourceUrl 与 linkStatus");
    addIssue(
      issues,
      "sourceLink",
      resource.sourceUrl ? "medium" : "high",
      resource.sourceUrl
        ? `linkStatus 为 ${linkStatus}，建议复核来源链接。`
        : "缺少 sourceUrl。",
    );
  }

  const snapshot = getSnapshotStatus(resourceId, snapshotFilesByResourceId);

  if (snapshot.status !== "complete") {
    flags.needsSnapshot = true;
    issueTags.push(snapshot.status === "none" ? "无快照" : "部分快照");
    recommendedActions.push("补充或复核来源快照");
    addIssue(
      issues,
      "snapshot",
      "low",
      snapshot.status === "none"
        ? "未找到本站来源快照。"
        : `快照不完整，缺少：${snapshot.missingFileTypes.join(" / ")}`,
    );
  }

  const officialFiles = officialFilesByResourceId.get(resourceId) ?? [];
  const officialFilesRequired = officialFileRecommendedTypes.has(resource.resourceType);

  if (officialFilesRequired && officialFiles.length === 0) {
    flags.needsOfficialFile = true;
    issueTags.push("缺官方文件");
    recommendedActions.push("补充 officialFiles 官方文本或官方文件入口");
    addIssue(
      issues,
      "officialFiles",
      "medium",
      `${resource.resourceType} 类型资料建议关联官方文本或官方文件。`,
    );
  }

  const versions = resourceVersionsByResourceId.get(resourceId) ?? [];
  const realVersionAvailable = hasRealVersion(versions);
  const versioningApplicable = resource.versioningApplicable === true;

  if (
    versioningApplicable &&
    versions.length === 0 &&
    !resource.hasVersions &&
    !resource.currentVersionId
  ) {
    flags.needsVersionReview = true;
    issueTags.push("版本需复核");
    recommendedActions.push("补充版本沿革或明确版本适用说明");
    addIssue(
      issues,
      "versioning",
      "low",
      "该资料标记为适用版本沿革，但未找到真实版本记录。",
    );
  } else if (versioningApplicable && versions.length > 0 && !realVersionAvailable) {
    flags.needsVersionReview = true;
    issueTags.push("版本需复核");
    recommendedActions.push("将 fallback 版本替换为真实版本记录");
    addIssue(
      issues,
      "versioning",
      "low",
      "该资料只有 fallback/占位版本，建议补充真实版本沿革。",
    );
  }

  const relevanceText = [
    resource.titleEn,
    resource.titleZh,
    ...resource.tags,
  ].join(" ");
  const matchedLowRelevanceTerms = findMatchedTerms(
    relevanceText,
    lowRelevanceTerms,
  );
  const matchedProtectedTerms = findMatchedTerms(relevanceText, protectedTerms);
  const protectedLowRelevance =
    matchedLowRelevanceTerms.length > 0 && matchedProtectedTerms.length > 0;

  if (matchedLowRelevanceTerms.length > 0) {
    if (protectedLowRelevance) {
      flags.needsHumanReview = true;
      issueTags.push("疑似低价值但含档案关键词");
      recommendedActions.push("人工判断是否保留或隐藏");
      addIssue(
        issues,
        "relevance",
        "medium",
        "命中低价值公告关键词，但同时包含 FOIA、records management、federal records、electronic records 或 presidential records，建议人工复核。",
      );
    } else {
      flags.suspectLowRelevance = true;
      issueTags.push("疑似低价值资料");
      recommendedActions.push("人工判断是否排除或隐藏出资料库");
      addIssue(
        issues,
        "relevance",
        "high",
        "命中任命、人员、信息收集、会议通知等弱相关关键词。",
      );
    }
  }

  const finalStatus = determineFinalStatus(flags);

  return {
    id: `resource-quality-${resourceId}-${checkedAt.slice(0, 10)}`,
    resourceId,
    slug,
    title,
    titleZh: resource.titleZh,
    titleEn: resource.titleEn,
    resourceType: resource.resourceType,
    sourceDomain: resource.sourceDomain,
    sourceUrl: resource.sourceUrl,
    detailUrl: `/resources/${slug}`,
    adminUrl: `/admin/resources?resourceId=${encodeURIComponent(resourceId)}`,
    checkedAt,
    checks: {
      basicMetadata: {
        status: basicMissingFields.length > 0 ? "needs_review" : "passed",
        missingFields: basicMissingFields,
      },
      enrichment: {
        status: enrichmentMissingFields.length > 0 ? "needs_enrichment" : "passed",
        missingFields: enrichmentMissingFields,
        keyPointCount: resource.keyPoints.length,
        tagCount: resource.tags.length,
      },
      classification: {
        status:
          classificationIssues.length > 0
            ? "needs_classification_review"
            : "passed",
        invalidResourceType,
        invalidPrimaryTopic,
        invalidTopicIds,
        topicIdsContainsPrimary,
        possibleInstitution,
        matchedInstitutionTerms,
      },
      sourceLink: {
        status: !resource.sourceUrl || linkNeedsReview ? "needs_review" : "passed",
        sourceUrl: resource.sourceUrl,
        linkStatus,
      },
      snapshot,
      officialFiles: {
        status:
          officialFilesRequired && officialFiles.length === 0
            ? "needs_review"
            : "passed",
        required: officialFilesRequired,
        officialFileCount: officialFiles.length,
      },
      versioning: {
        status: flags.needsVersionReview ? "needs_review" : "passed",
        versioningApplicable,
        versionCount: versions.length,
        hasRealVersions: realVersionAvailable,
        hasVersionsFlag: resource.hasVersions,
        currentVersionId: resource.currentVersionId,
        versionNote: resource.versionNote,
      },
      relevance: {
        status:
          matchedLowRelevanceTerms.length > 0
            ? protectedLowRelevance
              ? "needs_review"
              : "suspect_low_relevance"
            : "passed",
        matchedTerms: matchedLowRelevanceTerms,
        protectedTerms: matchedProtectedTerms,
      },
    },
    issues,
    issueTags: [...new Set(issueTags)],
    recommendedActions: [...new Set(recommendedActions)],
    flags,
    finalStatus,
  };
}

function buildReport(logs, checkedAt) {
  const summary = {
    checkedResources: logs.length,
    passed: logs.filter((log) => log.finalStatus === "passed").length,
    needsEnrichment: logs.filter((log) => log.flags.needsEnrichment).length,
    needsClassificationReview: logs.filter(
      (log) => log.flags.needsClassificationReview,
    ).length,
    needsSnapshot: logs.filter((log) => log.flags.needsSnapshot).length,
    needsOfficialFile: logs.filter((log) => log.flags.needsOfficialFile).length,
    needsVersionReview: logs.filter((log) => log.flags.needsVersionReview).length,
    suspectLowRelevance: logs.filter((log) => log.flags.suspectLowRelevance)
      .length,
    needsHumanReview: logs.filter((log) => log.flags.needsHumanReview).length,
  };

  const lists = {
    passedResources: logs
      .filter((log) => log.finalStatus === "passed")
      .map(makeCompactItem),
    needsEnrichmentResources: logs
      .filter((log) => log.flags.needsEnrichment)
      .map(makeCompactItem),
    suspectLowRelevanceResources: logs
      .filter((log) => log.flags.suspectLowRelevance)
      .map(makeCompactItem),
    needsHumanReviewResources: logs
      .filter((log) => log.flags.needsHumanReview)
      .map(makeCompactItem),
    needsSnapshotResources: logs
      .filter((log) => log.flags.needsSnapshot)
      .map(makeCompactItem),
    needsOfficialFileResources: logs
      .filter((log) => log.flags.needsOfficialFile)
      .map(makeCompactItem),
    needsClassificationReviewResources: logs
      .filter((log) => log.flags.needsClassificationReview)
      .map(makeCompactItem),
    needsVersionReviewResources: logs
      .filter((log) => log.flags.needsVersionReview)
      .map(makeCompactItem),
  };

  return {
    generatedAt: checkedAt,
    summary,
    lists,
    logPath: "src/data/admin/resourceQualityAgentLogs.json",
  };
}

async function main() {
  const checkedAt = new Date().toISOString();
  const acceptedResources = await readJsonArray(acceptedResourcesPath);
  const resourceEnrichments = await readTsArrayExport(
    resourceEnrichmentsPath,
    "resourceEnrichments",
    { optional: true },
  );
  const resourceAdminEdits = [
    ...(await readTsArrayExport(resourceAdminEditsTsPath, "resourceAdminEdits", {
      optional: true,
    })),
    ...(await readJsonArray(resourceAdminEditsJsonPath, { optional: true })),
  ];
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
  const snapshotFiles = await readJsonArray(resourceSnapshotFilesPath, {
    optional: true,
  });
  const officialFiles = await readTsArrayExport(
    resourceOfficialFilesPath,
    "resourceOfficialFiles",
    { optional: true },
  );
  const resourceVersions = await readTsArrayExport(mockDataPath, "resourceVersions", {
    optional: true,
  });
  const visibleResources = buildVisibleResources({
    acceptedResources,
    resourceEnrichments,
    resourceAdminEdits,
    curationDecisions,
  });
  const snapshotFilesByResourceId = groupByResourceId(snapshotFiles);
  const officialFilesByResourceId = groupByResourceId(officialFiles);
  const resourceVersionsByResourceId = groupByResourceId(resourceVersions);
  const logs = visibleResources.map((resource) =>
    inspectResource({
      resource,
      snapshotFilesByResourceId,
      officialFilesByResourceId,
      resourceVersionsByResourceId,
      checkedAt,
    }),
  );
  const report = buildReport(logs, checkedAt);

  await writeJson(logsPath, logs);
  await writeJson(reportPath, report);

  console.log(`acceptedResources 总数：${acceptedResources.length}`);
  console.log(`前台可见资料检查数量：${report.summary.checkedResources}`);
  console.log(`通过数量：${report.summary.passed}`);
  console.log(`需补全内容数量：${report.summary.needsEnrichment}`);
  console.log(
    `需分类复核数量：${report.summary.needsClassificationReview}`,
  );
  console.log(`缺少快照数量：${report.summary.needsSnapshot}`);
  console.log(`缺少官方文件数量：${report.summary.needsOfficialFile}`);
  console.log(`需版本复核数量：${report.summary.needsVersionReview}`);
  console.log(`疑似低价值数量：${report.summary.suspectLowRelevance}`);
  console.log(`需人工复核数量：${report.summary.needsHumanReview}`);
  console.log(`日志写入路径：${logsPath}`);
  console.log(`报告写入路径：${reportPath}`);
}

main().catch((error) => {
  console.error(`Resource Quality Agent 运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
