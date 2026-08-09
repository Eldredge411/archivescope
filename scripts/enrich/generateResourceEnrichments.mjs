import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const envPath = path.join(projectRoot, ".env.local");
const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const resourceEnrichmentsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichments.ts",
);
const resourceOfficialFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceOfficialFiles.ts",
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
const enrichmentDraftsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const enrichmentErrorsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichmentErrors.json",
);
const firecrawlCacheDirectory = path.join(
  projectRoot,
  "src/data/cache/firecrawl",
);

const requiredEnvKeys = ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"];
const defaultLimit = 3;
const sourceTextLimit = 6000;
const officialSourceTextLimit = 6000;
const perOfficialFileTextLimit = 2500;
const defaultAiTimeoutSeconds = 60;
const defaultFirecrawlTimeoutSeconds = 45;
const defaultItemTimeoutSeconds = 120;
const defaultFirecrawlBaseUrl = "https://api.firecrawl.dev";
const sourceBasisValues = [
  "official_file",
  "source_url",
  "firecrawl_markdown",
  "raw_data",
  "mixed",
];
const allowedTopicIds = [
  "laws-policies-governance",
  "electronic-records-management",
  "digital-resources-preservation",
  "access-outreach-public-participation",
  "ai-emerging-technologies",
  "social-actors-service-ecosystem",
];
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
const allowedResourceStatuses = [
  "imported_draft",
  "draft",
  "published_draft",
  "reviewed",
  "published",
  "needs_review",
  "archived",
];
const incompletePlaceholders = {
  summaryZh: ["待补充", "中文摘要待补充"],
  keyPoints: ["内容要点待整理"],
  researchValue: ["研究价值待补充"],
};
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

const fetchHeaders = {
  "User-Agent": "ArchiveScopeEnrichmentBot/0.1",
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

let firecrawlConfig = {
  FIRECRAWL_API_KEY: "",
  FIRECRAWL_BASE_URL: defaultFirecrawlBaseUrl,
};

function parseEnvFile(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadLocalEnv() {
  try {
    const content = await readFile(envPath, "utf8");

    return parseEnvFile(content);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function getEnvValue(localEnv, key) {
  return String(localEnv[key] ?? process.env[key] ?? "").trim();
}

function buildChatCompletionsUrl(baseUrl) {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/chat/completions")) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/chat/completions`;
}

function buildFirecrawlScrapeUrl(baseUrl) {
  const trimmedBaseUrl = String(baseUrl || defaultFirecrawlBaseUrl)
    .trim()
    .replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/v2/scrape")) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/v2/scrape`;
}

function normalizeSourceDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function readArgValue(argv, names) {
  for (const name of names) {
    const equalPrefix = `${name}=`;
    const equalArg = argv.find((arg) => arg.startsWith(equalPrefix));

    if (equalArg) {
      return equalArg.slice(equalPrefix.length);
    }

    const index = argv.indexOf(name);

    if (index >= 0) {
      const value = argv[index + 1] ?? "";

      return value.startsWith("--") ? "" : value;
    }
  }

  return "";
}

function parseArgs(argv) {
  const rawValue = readArgValue(argv, ["--limit"]);
  const forceId = readArgValue(argv, ["--force-id", "--forceId"]);
  const sourceDomain = readArgValue(argv, [
    "--sourceDomain",
    "--source-domain",
  ]);
  const rawAiTimeout = readArgValue(argv, ["--ai-timeout", "--aiTimeout"]);
  const rawFirecrawlTimeout = readArgValue(argv, [
    "--firecrawl-timeout",
    "--firecrawlTimeout",
  ]);
  const rawItemTimeout = readArgValue(argv, [
    "--item-timeout",
    "--itemTimeout",
  ]);

  const parsePositiveInteger = (value, fallback, label) => {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
      console.warn(`${label} 参数无效，已使用默认值 ${fallback}。`);
      return fallback;
    }

    return parsed;
  };

  const options = {
    limit: defaultLimit,
    refresh: argv.includes("--refresh"),
    onlyIncomplete: argv.includes("--only-incomplete"),
    force: argv.includes("--force"),
    forceId: String(forceId || "").trim(),
    sourceDomain: normalizeSourceDomain(sourceDomain),
    aiTimeoutMs:
      parsePositiveInteger(
        rawAiTimeout,
        defaultAiTimeoutSeconds,
        "--ai-timeout",
      ) * 1000,
    firecrawlTimeoutMs:
      parsePositiveInteger(
        rawFirecrawlTimeout,
        defaultFirecrawlTimeoutSeconds,
        "--firecrawl-timeout",
      ) * 1000,
    itemTimeoutMs:
      parsePositiveInteger(
        rawItemTimeout,
        defaultItemTimeoutSeconds,
        "--item-timeout",
      ) * 1000,
  };

  if (!rawValue) {
    return options;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    console.warn(`--limit 参数无效，已使用默认值 ${defaultLimit}。`);
    return options;
  }

  return {
    ...options,
    limit: parsed,
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
      return [];
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

async function writeJsonArray(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

class RequestTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

function isTimeoutError(error) {
  return (
    error instanceof RequestTimeoutError ||
    error?.name === "AbortError" ||
    /timeout|timed out|超时/i.test(String(error?.message || ""))
  );
}

async function withTimeout(promiseFactory, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestTimeoutError(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promiseFactory(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs, timeoutMessage) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new RequestTimeoutError(timeoutMessage);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildErrorRecord(resource, stage, errorMessage) {
  return {
    resourceId: cleanText(resource?.id),
    titleEn: cleanText(resource?.titleEn),
    sourceUrl: cleanText(resource?.sourceUrl),
    stage,
    errorMessage: cleanText(errorMessage),
    createdAt: new Date().toISOString(),
  };
}

async function writeErrorRecords(newErrors) {
  if (newErrors.length === 0) {
    return;
  }

  const existingErrors = await readJsonArray(enrichmentErrorsPath, {
    optional: true,
  });
  const outputErrors = [...existingErrors, ...newErrors];

  await writeJsonArray(enrichmentErrorsPath, outputErrors);
  console.log(`已写入 enrichment 错误日志：${enrichmentErrorsPath}`);
  console.log(`本次新增错误数量：${newErrors.length}`);
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
      if (optional) {
        return [];
      }

      throw new Error(`未找到 ${exportName} 数组。`);
    }

    const data = Function(`"use strict"; return (${match[1]});`)();

    if (!Array.isArray(data)) {
      throw new Error(`${exportName} 不是数组。`);
    }

    return data;
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return [];
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

async function readOptionalResourceAdminEdits() {
  const jsonEdits = await readJsonArray(resourceAdminEditsJsonPath, {
    optional: true,
  });
  const tsEdits = await readTsExportedArray(
    resourceAdminEditsTsPath,
    "resourceAdminEdits",
    {
      optional: true,
    },
  );

  return [...tsEdits, ...jsonEdits];
}

async function readResourceCurationDecisions() {
  const jsonDecisions = await readJsonArray(resourceCurationDecisionsJsonPath, {
    optional: true,
  });
  const tsDecisions = await readTsExportedArray(
    resourceCurationDecisionsTsPath,
    "resourceCurationDecisions",
    {
      optional: true,
    },
  );

  return [...tsDecisions, ...jsonDecisions];
}

async function readResourceEnrichments() {
  return readTsExportedArray(resourceEnrichmentsPath, "resourceEnrichments", {
    optional: true,
  });
}

async function readResourceOfficialFiles() {
  try {
    const content = await readFile(resourceOfficialFilesPath, "utf8");
    const match = content.match(
      /export\s+const\s+resourceOfficialFiles[^\n=]*=\s*(\[[\s\S]*?\]);/,
    );

    if (!match) {
      console.warn("未在 resourceOfficialFiles.ts 中找到 resourceOfficialFiles 数组。");
      return [];
    }

    const officialFiles = Function(
      `"use strict"; return (${match[1]});`,
    )();

    if (!Array.isArray(officialFiles)) {
      throw new Error("resourceOfficialFiles 不是数组。");
    }

    return officialFiles;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw new Error(`${resourceOfficialFilesPath} 读取失败：${error.message}`);
  }
}

function groupOfficialFilesByResourceId(officialFiles) {
  const grouped = new Map();

  for (const file of officialFiles) {
    const resourceId = cleanText(file?.resourceId);

    if (!resourceId) {
      continue;
    }

    if (!grouped.has(resourceId)) {
      grouped.set(resourceId, []);
    }

    grouped.get(resourceId).push(file);
  }

  return grouped;
}

function getUsableOfficialFiles(officialFiles = []) {
  return officialFiles
    .filter((file) => {
      const fileRole = cleanText(file?.fileRole);
      const url = cleanText(file?.fileUrl || file?.sourceUrl);

      return (
        url &&
        (fileRole === "official_text" || fileRole === "official_file")
      );
    })
    .sort((leftFile, rightFile) => {
      if (Boolean(leftFile.isPrimaryAccess) !== Boolean(rightFile.isPrimaryAccess)) {
        return leftFile.isPrimaryAccess ? -1 : 1;
      }

      return cleanText(leftFile.titleEn).localeCompare(cleanText(rightFile.titleEn));
    });
}

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStringArray(value) {
  return ensureArray(value).map(cleanText).filter(Boolean);
}

function normalizeResourceTypeValue(value) {
  return allowedResourceTypes.includes(value) ? value : "strategy";
}

function normalizeResourceStatusValue(value) {
  return allowedResourceStatuses.includes(value) ? value : "published";
}

function normalizeDisplayResource(resource) {
  const primaryTopicId =
    cleanText(resource?.primaryTopicId) ||
    normalizeStringArray(resource?.topicIds)[0] ||
    "laws-policies-governance";
  const topicIds = [
    ...new Set([primaryTopicId, ...normalizeStringArray(resource?.topicIds)]),
  ];

  return {
    ...resource,
    id: cleanText(resource?.id),
    titleZh: cleanText(resource?.titleZh),
    titleEn: cleanText(resource?.titleEn),
    countryId: cleanText(resource?.countryId) || "usa",
    institutionId: cleanText(resource?.institutionId) || "nara",
    resourceType: normalizeResourceTypeValue(cleanText(resource?.resourceType)),
    primaryTopicId,
    topicIds,
    tags: normalizeStringArray(resource?.tags),
    summaryShort: cleanText(resource?.summaryShort),
    summaryZh: cleanText(resource?.summaryZh),
    keyPoints: normalizeStringArray(resource?.keyPoints),
    researchValue: cleanText(resource?.researchValue),
    sourceUrl: cleanText(resource?.sourceUrl),
    sourceDomain: cleanText(resource?.sourceDomain),
    status: normalizeResourceStatusValue(
      cleanText(resource?.status) || "imported_draft",
    ),
  };
}

function mergeUniqueStrings(...values) {
  return [...new Set(values.flat().map(cleanText).filter(Boolean))];
}

function hasPlaceholder(value, placeholders) {
  const text = cleanText(value);

  return placeholders.some((placeholder) => text.includes(placeholder));
}

function getIncompleteReasons(resource) {
  const reasons = [];
  const titleZh = cleanText(resource.titleZh);
  const summaryShort = cleanText(resource.summaryShort);
  const summaryZh = cleanText(resource.summaryZh);
  const keyPoints = normalizeStringArray(resource.keyPoints);
  const researchValue = cleanText(resource.researchValue);
  const tags = normalizeStringArray(resource.tags);
  const status = normalizeResourceStatusValue(resource.status);

  if (!titleZh) {
    reasons.push("缺少中文标题");
  }

  if (!summaryShort) {
    reasons.push("缺少卡片简介 summaryShort");
  }

  if (!summaryZh) {
    reasons.push("缺少中文摘要");
  } else if (hasPlaceholder(summaryZh, incompletePlaceholders.summaryZh)) {
    reasons.push("中文摘要仍为待补充占位");
  }

  if (keyPoints.length === 0) {
    reasons.push("缺少内容要点");
  } else if (
    keyPoints.some((point) =>
      hasPlaceholder(point, incompletePlaceholders.keyPoints),
    )
  ) {
    reasons.push("内容要点仍为待整理占位");
  }

  if (!researchValue) {
    reasons.push("缺少研究价值");
  } else if (
    hasPlaceholder(researchValue, incompletePlaceholders.researchValue)
  ) {
    reasons.push("研究价值仍为待补充占位");
  }

  if (tags.length < 3) {
    reasons.push("标签少于 3 个");
  }

  if (status === "imported_draft" || status === "draft") {
    reasons.push("资料仍处于自动导入状态");
  }

  return reasons;
}

function isIncompleteResource(resource) {
  return getIncompleteReasons(resource).length > 0;
}

function shouldIncludeAcceptedResource(resource) {
  if (resource?.targetEntityType === "institution") {
    return false;
  }

  if (cleanText(resource?.resourceType) === "institution_resource") {
    return false;
  }

  const id = cleanText(resource?.id);
  const sourceUrl = cleanText(resource?.sourceUrl);

  if (institutionLikeResourceIds.has(id)) {
    return false;
  }

  return !institutionLikeSourceUrls.has(sourceUrl);
}

function buildCurationDecisionMap(decisions) {
  const decisionMap = new Map();

  for (const decision of decisions) {
    const resourceId = cleanText(decision?.resourceId);

    if (resourceId) {
      decisionMap.set(resourceId, decision);
    }
  }

  return decisionMap;
}

function shouldShowResourceInLibrary(resource, decisionMap) {
  const resourceIds = [resource.id, ...normalizeStringArray(resource.sourceResourceIds)];

  return !resourceIds.some((resourceId) => {
    const decision = decisionMap.get(resourceId);

    return (
      decision?.hiddenFromLibrary === true ||
      decision?.decision === "exclude" ||
      decision?.decision === "hidden"
    );
  });
}

function applyResourcePatch(resource, patch) {
  if (!patch) {
    return resource;
  }

  const primaryTopicId = cleanText(patch.primaryTopicId || resource.primaryTopicId);
  const patchTopicIds = normalizeStringArray(patch.topicIds);
  const resourceTopicIds = normalizeStringArray(resource.topicIds);
  const topicIds = patchTopicIds.length
    ? mergeUniqueStrings([primaryTopicId], patchTopicIds)
    : mergeUniqueStrings([primaryTopicId], resourceTopicIds);
  const patchTags = normalizeStringArray(patch.tags);
  const tags = patchTags.length
    ? mergeUniqueStrings(resource.tags, patchTags)
    : resource.tags;

  return {
    ...resource,
    titleZh: cleanText(patch.titleZh) || resource.titleZh,
    summaryShort: cleanText(patch.summaryShort) || resource.summaryShort,
    summaryZh: cleanText(patch.summaryZh) || resource.summaryZh,
    keyPoints: normalizeStringArray(patch.keyPoints).length
      ? normalizeStringArray(patch.keyPoints)
      : resource.keyPoints,
    researchValue: cleanText(patch.researchValue) || resource.researchValue,
    resourceType: normalizeResourceTypeValue(
      cleanText(patch.resourceType || resource.resourceType),
    ),
    primaryTopicId,
    topicIds,
    tags,
    versioningApplicable:
      typeof patch.versioningApplicable === "boolean"
        ? patch.versioningApplicable
        : resource.versioningApplicable,
    versionNote: cleanText(patch.versionNote) || resource.versionNote,
    status: normalizeResourceStatusValue(cleanText(patch.status || resource.status)),
  };
}

function getPatchByResourceId(patches) {
  const patchByResourceId = new Map();

  for (const patch of patches) {
    const resourceId = cleanText(patch?.resourceId);

    if (resourceId && !patchByResourceId.has(resourceId)) {
      patchByResourceId.set(resourceId, patch);
    }
  }

  return patchByResourceId;
}

function buildVisibleResources(
  acceptedResources,
  resourceEnrichments,
  resourceAdminEdits,
  curationDecisions,
) {
  const enrichmentByResourceId = getPatchByResourceId(resourceEnrichments);
  const adminEditByResourceId = getPatchByResourceId(resourceAdminEdits);
  const decisionMap = buildCurationDecisionMap(curationDecisions);

  return acceptedResources
    .filter(shouldIncludeAcceptedResource)
    .map((resource) => {
      const normalizedResource = normalizeDisplayResource(resource);
      const enrichedResource = applyResourcePatch(
        normalizedResource,
        enrichmentByResourceId.get(normalizedResource.id),
      );
      const adminEditedResource = applyResourcePatch(
        enrichedResource,
        adminEditByResourceId.get(normalizedResource.id),
      );

      return normalizeDisplayResource(adminEditedResource);
    })
    .filter((resource) => shouldShowResourceInLibrary(resource, decisionMap));
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );
}

function stripHtml(value) {
  return cleanText(
    decodeHtmlEntities(
      String(value || "")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function truncateText(value, maxLength = sourceTextLimit) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}……`;
}

function limitSourceTextForAi(value) {
  return cleanText(value).slice(0, sourceTextLimit);
}

function prepareSourceContextForAi(sourceContext) {
  const originalSourceText = cleanText(sourceContext?.sourceText);
  const sourceText = limitSourceTextForAi(originalSourceText);

  return {
    ...sourceContext,
    sourceText,
    originalSourceTextLength: originalSourceText.length,
    sentSourceTextLength: sourceText.length,
  };
}

function safePathSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function getFirecrawlCachePathForKey(cacheKey) {
  const safeResourceId = safePathSegment(cacheKey);

  if (!safeResourceId) {
    return "";
  }

  return path.join(firecrawlCacheDirectory, `${safeResourceId}.md`);
}

function getFirecrawlCachePath(resource) {
  return getFirecrawlCachePathForKey(resource?.firecrawlCacheKey || resource?.id);
}

function normalizeMarkdownForCache(markdown) {
  const normalized = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .trim();

  return normalized ? `${normalized}\n` : "";
}

async function readFirecrawlCache(resource) {
  const cachePath = getFirecrawlCachePath(resource);

  if (!cachePath) {
    return {
      exists: false,
      cachePath,
      markdown: "",
    };
  }

  try {
    const markdown = await readFile(cachePath, "utf8");

    return {
      exists: true,
      cachePath,
      markdown,
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        exists: false,
        cachePath,
        markdown: "",
      };
    }

    console.warn(`读取 Firecrawl 缓存失败，将忽略缓存：${error.message}`);
    return {
      exists: false,
      cachePath,
      markdown: "",
    };
  }
}

async function writeFirecrawlCache(resource, markdown) {
  const cachePath = getFirecrawlCachePath(resource);
  const normalizedMarkdown = normalizeMarkdownForCache(markdown);

  if (!cachePath || !normalizedMarkdown) {
    return "";
  }

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, normalizedMarkdown, "utf8");

  return cachePath;
}

function extractTagContent(html, tagName) {
  const matcher = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(matcher);

  return match ? stripHtml(match[1]) : "";
}

function extractMetaDescription(html) {
  const descriptionByName = html.match(
    /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i,
  );
  const descriptionByProperty = html.match(
    /<meta\b(?=[^>]*\bproperty=["']og:description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i,
  );

  return stripHtml(descriptionByName?.[1] ?? descriptionByProperty?.[1] ?? "");
}

function extractParagraphText(html) {
  const paragraphs = [];
  const matcher = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

  for (const match of html.matchAll(matcher)) {
    const text = stripHtml(match[1]);

    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs.join("\n");
}

function extractHtmlSourceText(html) {
  const title = extractTagContent(html, "title");
  const metaDescription = extractMetaDescription(html);
  const paragraphText = extractParagraphText(html);
  const fallbackBody = paragraphText ? "" : stripHtml(html);

  return truncateText(
    [
      title ? `Title: ${title}` : "",
      metaDescription ? `Meta description: ${metaDescription}` : "",
      paragraphText || fallbackBody,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

function pickFirstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function extractFirecrawlMarkdown(responseJson) {
  return pickFirstString(
    responseJson?.data?.markdown,
    responseJson?.markdown,
    responseJson?.data?.content,
    responseJson?.content,
  );
}

function extractFirecrawlMetadata(responseJson) {
  const metadata =
    responseJson?.data?.metadata ??
    responseJson?.metadata ??
    responseJson?.data?.meta ??
    responseJson?.meta ??
    {};

  return {
    title: pickFirstString(
      metadata?.title,
      responseJson?.data?.title,
      responseJson?.title,
    ),
    description: pickFirstString(
      metadata?.description,
      responseJson?.data?.description,
      responseJson?.description,
    ),
    sourceURL: pickFirstString(
      metadata?.sourceURL,
      metadata?.sourceUrl,
      metadata?.url,
      responseJson?.data?.sourceURL,
      responseJson?.data?.sourceUrl,
      responseJson?.data?.url,
      responseJson?.sourceURL,
      responseJson?.sourceUrl,
      responseJson?.url,
    ),
    raw: metadata,
  };
}

async function scrapeWithFirecrawl(url, options = {}) {
  const apiKey = firecrawlConfig.FIRECRAWL_API_KEY;
  const timeoutMs = options.timeoutMs ?? defaultFirecrawlTimeoutSeconds * 1000;

  if (!apiKey) {
    return {
      ok: false,
      sourceText: "",
      error: "未配置 FIRECRAWL_API_KEY。",
    };
  }

  if (!url) {
    return {
      ok: false,
      sourceText: "",
      error: "缺少 sourceUrl。",
    };
  }

  const endpoint = buildFirecrawlScrapeUrl(firecrawlConfig.FIRECRAWL_BASE_URL);

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      },
      timeoutMs,
      `Firecrawl 请求超时（${Math.round(timeoutMs / 1000)} 秒）。`,
    );
    const responseText = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        sourceText: "",
        error: `HTTP ${response.status}: ${responseText.slice(0, 500)}`,
      };
    }

    let responseJson;

    try {
      responseJson = JSON.parse(responseText);
    } catch (error) {
      return {
        ok: false,
        sourceText: "",
        error: `Firecrawl 响应不是合法 JSON：${error.message}`,
      };
    }

    const markdown = extractFirecrawlMarkdown(responseJson);

    if (!markdown) {
      return {
        ok: false,
        sourceText: "",
        metadata: extractFirecrawlMetadata(responseJson),
        error: "Firecrawl 响应中未找到 markdown 或 content 字段。",
      };
    }

    return {
      ok: true,
      sourceText: normalizeMarkdownForCache(markdown),
      metadata: extractFirecrawlMetadata(responseJson),
    };
  } catch (error) {
    return {
      ok: false,
      sourceText: "",
      error: error?.message ?? String(error),
      timedOut: isTimeoutError(error),
    };
  }
}

async function fetchUrlSourceText(url, options = {}) {
  if (!url) {
    throw new Error("缺少 sourceUrl。");
  }

  const timeoutMs = options.timeoutMs ?? defaultFirecrawlTimeoutSeconds * 1000;
  const response = await fetchWithTimeout(
    url,
    {
      headers: fetchHeaders,
      redirect: "follow",
    },
    timeoutMs,
    `普通 HTML 提取请求超时（${Math.round(timeoutMs / 1000)} 秒）。`,
  );
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 200)}`);
  }

  return extractHtmlSourceText(responseText);
}

async function fetchSourceText(resource, options = {}) {
  return fetchUrlSourceText(resource?.sourceUrl, options);
}

function formatRawDataValue(value) {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(formatRawDataValue).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${key}: ${formatRawDataValue(nestedValue)}`)
      .filter(Boolean)
      .join("; ");
  }

  return cleanText(value);
}

function buildFederalRegisterSourceText(resource) {
  const rawData = resource?.rawData;

  if (!rawData || typeof rawData !== "object") {
    return "";
  }

  const fields = [
    ["Title", rawData.title],
    ["Abstract", rawData.abstract],
    ["Summary", rawData.summary],
    ["Type", rawData.type],
    ["Publication date", rawData.publication_date],
    ["Agency names", rawData.agency_names],
    ["Document number", rawData.document_number],
  ];
  const text = fields
    .map(([label, value]) => {
      const formattedValue = formatRawDataValue(value);

      return formattedValue ? `${label}: ${formattedValue}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return truncateText(text);
}

function buildMetadataSourceText(resource, reason = "") {
  const lines = [
    "Source extraction note: 外部正文抓取不可用，本次仅使用当前资料元数据生成待审核草稿；正式审核时应结合官方来源复核。",
    reason ? `Fallback reason: ${reason}` : "",
    `Resource id: ${resource?.id || ""}`,
    `Title EN: ${resource?.titleEn || ""}`,
    `Title ZH: ${resource?.titleZh || ""}`,
    `Resource type: ${resource?.resourceType || ""}`,
    `Primary topic: ${resource?.primaryTopicId || ""}`,
    `Topic IDs: ${JSON.stringify(ensureArray(resource?.topicIds))}`,
    `Tags: ${JSON.stringify(ensureArray(resource?.tags))}`,
    `Source URL: ${resource?.sourceUrl || ""}`,
    `Source domain: ${resource?.sourceDomain || ""}`,
    `Publish date: ${resource?.publishDate || ""}`,
    `Collected at: ${resource?.collectedAt || ""}`,
    resource?.summaryZh ? `Existing summary ZH: ${resource.summaryZh}` : "",
    normalizeStringArray(resource?.keyPoints).length
      ? `Existing key points: ${normalizeStringArray(resource.keyPoints).join("; ")}`
      : "",
    resource?.researchValue
      ? `Existing research value: ${resource.researchValue}`
      : "",
  ];

  return truncateText(lines.filter(Boolean).join("\n"));
}

function buildOfficialFileSourceSection(officialFile, sourceText) {
  return [
    `Official file id: ${officialFile.id || ""}`,
    `Official file titleZh: ${officialFile.titleZh || ""}`,
    `Official file titleEn: ${officialFile.titleEn || ""}`,
    `Source name: ${officialFile.sourceName || ""}`,
    `File role: ${officialFile.fileRole || ""}`,
    `Source reliability: ${officialFile.sourceReliability || ""}`,
    `File type: ${officialFile.fileType || ""}`,
    `Official URL: ${officialFile.fileUrl || officialFile.sourceUrl || ""}`,
    officialFile.descriptionZh
      ? `DescriptionZh: ${officialFile.descriptionZh}`
      : "",
    "",
    truncateText(sourceText, perOfficialFileTextLimit),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

async function extractOfficialFileSourceText(resource, officialFile, options = {}) {
  const officialUrl = cleanText(officialFile?.fileUrl || officialFile?.sourceUrl);
  const sourceErrors = [];
  const cacheResource = {
    id: `${resource.id}--official--${officialFile.id || safePathSegment(officialUrl)}`,
  };
  const cache = await readFirecrawlCache(cacheResource);

  console.log(`官方来源：${officialFile.titleEn || officialFile.titleZh || officialFile.id}`);
  console.log(`官方来源 URL：${officialUrl}`);
  console.log(`官方来源 Firecrawl 缓存：${cache.cachePath || "无法生成缓存路径"}`);
  console.log(`官方来源缓存是否存在：${cache.exists ? "是" : "否"}`);

  if (!officialUrl) {
    throw new Error("官方来源缺少 fileUrl/sourceUrl。");
  }

  if (options.refresh) {
    console.log("已传入 --refresh，本次忽略官方来源 Firecrawl 缓存。");
  }

  if (!options.refresh && cache.exists && cache.markdown.trim()) {
    console.log("使用官方来源 Firecrawl 缓存。");

    return {
      sourceText: truncateText(cache.markdown, perOfficialFileTextLimit),
      extractionMethod: "firecrawl_cache",
      usedFirecrawlCache: true,
      sourceErrors,
    };
  }

  if (firecrawlConfig.FIRECRAWL_API_KEY) {
    console.log("官方来源是否调用 Firecrawl：是");
    const firecrawlResult = await scrapeWithFirecrawl(officialUrl, {
      timeoutMs: options.firecrawlTimeoutMs,
    });

    if (firecrawlResult.ok && firecrawlResult.sourceText) {
      const cachePath = await writeFirecrawlCache(
        cacheResource,
        firecrawlResult.sourceText,
      );

      console.log(
        `官方来源 Firecrawl 抓取成功，已写入缓存${
          cachePath ? `：${cachePath}` : "。"
        }`,
      );

      if (firecrawlResult.metadata?.title) {
        console.log(`官方来源 Firecrawl 页面标题：${firecrawlResult.metadata.title}`);
      }

      return {
        sourceText: truncateText(
          firecrawlResult.sourceText,
          perOfficialFileTextLimit,
        ),
        extractionMethod: "firecrawl",
        usedFirecrawlCache: false,
        sourceErrors,
      };
    }

    sourceErrors.push({
      stage: "firecrawl_request",
      errorMessage: firecrawlResult.error || "官方来源 Firecrawl 抓取失败。",
    });

    if (firecrawlResult.timedOut) {
      console.warn("官方来源 Firecrawl 请求超时，回退到普通 HTML 提取。");
    }

    console.warn(
      `官方来源 Firecrawl 抓取失败：${firecrawlResult.error || "未知错误"}`,
    );
    console.warn("官方来源是否回退到普通 HTML 提取：是");
  } else {
    console.log("官方来源是否调用 Firecrawl：否，未配置 FIRECRAWL_API_KEY。");
    console.log("官方来源是否回退到普通 HTML 提取：是");
  }

  return {
    sourceText: truncateText(
      await fetchUrlSourceText(officialUrl, {
        timeoutMs: options.firecrawlTimeoutMs,
      }),
      perOfficialFileTextLimit,
    ),
    extractionMethod: "html_fetch",
    usedFirecrawlCache: false,
    sourceErrors,
  };
}

async function extractOfficialFilesSourceText(
  resource,
  officialFiles = [],
  options = {},
) {
  const usableOfficialFiles = getUsableOfficialFiles(officialFiles);

  if (usableOfficialFiles.length === 0) {
    return null;
  }

  console.log(
    `检测到 ${usableOfficialFiles.length} 个官方文本/官方文件，将优先作为 AI 依据。`,
  );

  const sections = [];
  const usedOfficialFiles = [];
  const sourceErrors = [];

  for (const officialFile of usableOfficialFiles) {
    try {
      const result = await extractOfficialFileSourceText(
        resource,
        officialFile,
        options,
      );

      if (!result.sourceText) {
        throw new Error("官方来源未提取到正文。");
      }

      sections.push(buildOfficialFileSourceSection(officialFile, result.sourceText));
      sourceErrors.push(...ensureArray(result.sourceErrors));
      usedOfficialFiles.push({
        id: officialFile.id,
        titleEn: officialFile.titleEn,
        titleZh: officialFile.titleZh,
        sourceName: officialFile.sourceName,
        sourceUrl: officialFile.sourceUrl,
        fileUrl: officialFile.fileUrl,
        fileRole: officialFile.fileRole,
        extractionMethod: result.extractionMethod,
        usedFirecrawlCache: Boolean(result.usedFirecrawlCache),
      });
    } catch (error) {
      console.warn(
        `官方来源提取失败，继续处理其他官方来源：${
          officialFile.id || officialFile.sourceUrl || "未知官方来源"
        }，原因：${error.message}`,
      );
    }
  }

  if (sections.length === 0) {
    console.warn("所有官方来源均未提取到可用正文，将回退到资料 sourceUrl。");
    return null;
  }

  return {
    sourceText: truncateText(sections.join("\n\n---\n\n"), officialSourceTextLimit),
    sourceBasis: "official_file",
    usedOfficialFiles,
    usedFirecrawlCache: usedOfficialFiles.some((file) => file.usedFirecrawlCache),
    sourceErrors,
  };
}

async function extractResourceSourceText(resource, options = {}) {
  const sourceDomain = String(resource?.sourceDomain || "").toLowerCase();
  const sourceErrors = [];
  const cache = await readFirecrawlCache(resource);

  console.log(`Firecrawl 缓存文件：${cache.cachePath || "无法生成缓存路径"}`);
  console.log(`是否存在缓存：${cache.exists ? "是" : "否"}`);

  if (options.refresh) {
    console.log("已传入 --refresh，本次忽略已有 Firecrawl 缓存。");
  }

  if (sourceDomain.includes("federalregister.gov")) {
    const rawDataText = buildFederalRegisterSourceText(resource);

    if (rawDataText.length >= 300) {
      console.log("Federal Register 资料已使用 rawData 构建来源文本。");
      console.log("是否调用 Firecrawl：否，Federal Register rawData 已足够。");
      return {
        sourceText: rawDataText,
        sourceBasis: "raw_data",
        usedOfficialFiles: [],
        usedFirecrawlCache: false,
        sourceErrors,
      };
    }

    console.log("Federal Register rawData 不足，将继续尝试网页正文提取。");
  }

  if (!options.refresh && cache.exists && cache.markdown.trim()) {
    console.log("使用 Firecrawl 缓存。");
    console.log("是否调用 Firecrawl：否，已使用缓存。");
    return {
      sourceText: truncateText(cache.markdown),
      sourceBasis: "firecrawl_markdown",
      usedOfficialFiles: [],
      usedFirecrawlCache: true,
      sourceErrors,
    };
  }

  if (cache.exists && !cache.markdown.trim()) {
    console.warn("Firecrawl 缓存为空，将重新抓取或回退。");
  }

  if (firecrawlConfig.FIRECRAWL_API_KEY) {
    console.log("是否调用 Firecrawl：是");
    const firecrawlResult = await scrapeWithFirecrawl(resource.sourceUrl, {
      timeoutMs: options.firecrawlTimeoutMs,
    });

    if (firecrawlResult.ok && firecrawlResult.sourceText) {
      const cachePath = await writeFirecrawlCache(resource, firecrawlResult.sourceText);

      console.log(
        `Firecrawl 抓取成功，已写入缓存${cachePath ? `：${cachePath}` : "。"}`,
      );

      if (firecrawlResult.metadata?.title) {
        console.log(`Firecrawl 页面标题：${firecrawlResult.metadata.title}`);
      }

      return {
        sourceText: truncateText(firecrawlResult.sourceText),
        sourceBasis: "firecrawl_markdown",
        usedOfficialFiles: [],
        usedFirecrawlCache: false,
        sourceErrors,
      };
    }

    sourceErrors.push({
      stage: "firecrawl_request",
      errorMessage: firecrawlResult.error || "Firecrawl 抓取失败。",
    });

    if (firecrawlResult.timedOut) {
      console.warn("Firecrawl 请求超时，回退到普通 fetch + HTML 提取。");
    }

    console.warn(
      `Firecrawl 抓取失败：${firecrawlResult.error || "未知错误"}`,
    );
    console.warn("是否回退到普通 HTML 提取：是");
  } else {
    console.log("是否调用 Firecrawl：否，未配置 FIRECRAWL_API_KEY。");
    console.log("是否回退到普通 HTML 提取：是");
  }

  try {
    return {
      sourceText: await fetchSourceText(resource, {
        timeoutMs: options.firecrawlTimeoutMs,
      }),
      sourceBasis: "source_url",
      usedOfficialFiles: [],
      usedFirecrawlCache: false,
      sourceErrors,
    };
  } catch (error) {
    console.warn(`普通 HTML 提取失败：${error.message}`);
    console.warn("将回退到当前资料元数据生成待审核草稿。");

    return {
      sourceText: buildMetadataSourceText(resource, error.message),
      sourceBasis: "source_url",
      usedOfficialFiles: [],
      usedFirecrawlCache: false,
      sourceErrors,
    };
  }
}

async function extractSourceText(resource, officialFiles = [], options = {}) {
  const officialSourceContext = await extractOfficialFilesSourceText(
    resource,
    officialFiles,
    options,
  );

  if (officialSourceContext?.sourceText) {
    return officialSourceContext;
  }

  if (officialFiles.length > 0) {
    console.log("官方来源不可用，回退到 resource.sourceUrl/rawData。");
  } else {
    console.log("未配置该资料的 officialFiles，将使用 resource.sourceUrl/rawData。");
  }

  return extractResourceSourceText(resource, options);
}

function buildPrompt(resource, sourceContext) {
  const sourceText = sourceContext.sourceText;
  const sourceBasis = sourceContext.sourceBasis;
  const officialSourceSummary = ensureArray(sourceContext.usedOfficialFiles)
    .map((file) =>
      [
        `- ${file.titleEn || file.titleZh || file.id}`,
        `  sourceName: ${file.sourceName || ""}`,
        `  fileRole: ${file.fileRole || ""}`,
        `  sourceUrl: ${file.fileUrl || file.sourceUrl || ""}`,
        `  extractionMethod: ${file.extractionMethod || ""}`,
      ].join("\n"),
    )
    .join("\n");

  return `请基于以下英文资料信息，生成 ArchiveScope 中文资料完善草稿。

请严格输出 JSON，不要输出解释文字，不要使用 Markdown 代码块。
不要使用外部搜索摘要，不要接入或引用 Google AI Overview。只能依据下方提供的资料元数据、官方来源文本、rawData 或 sourceUrl 抓取文本进行整理。

可选 primaryTopicId 只能从以下值中选择：
${allowedTopicIds.map((topicId) => `- ${topicId}`).join("\n")}

可选 resourceType 只能从以下值中选择：
- law：法律法规或正式规则
- regulation：规章
- policy：政策文件
- strategy：战略、规划或政策方向文件
- guidance：具体指南、手册、操作说明或指导文件
- portal：资源门户、专题入口、栏目页、资源集合页或信息入口页
- catalog：目录
- database：数据库
- program：项目计划
- system：具体平台系统，例如 NARA Catalog
- report：报告

输出 JSON 字段必须为：
{
  "resourceId": "${resource.id}",
  "titleZh": "",
  "summaryShort": "",
  "summaryZh": "",
  "keyPoints": [],
  "researchValue": "",
  "resourceType": "",
  "primaryTopicId": "",
  "topicIds": [],
  "tags": [],
  "status": "published_draft",
  "versioningApplicable": true,
  "versionNote": "",
  "sourceBasis": "${sourceBasis}",
  "aiGenerated": true,
  "reviewStatus": "pending"
}

字段要求：
1. titleZh：中文标题，简洁、准确，适合中文档案学资料库。
2. summaryShort：50-100 字中文短简介，用于资料卡片。必须清楚说明“这是什么资料”和“用户可以从中了解什么”。
3. summaryZh：120-250 字中文摘要，用于详情页，说明资料内容、档案学主题和收录价值。
4. keyPoints：3-5 条中文内容要点。每条必须具体、可验证，不要泛泛而谈；要指出该资料涉及的制度、项目、平台、职责或实践；不要编造原文中没有的信息。
5. researchValue：面向中文档案学学习者、研究者和从业者，说明该资料可用于哪些档案学研究、制度比较、数字资源建设或公共服务研究。
6. resourceType：优先沿用原值；如确需修正，只能使用上方允许的类型。如果资料是官网栏目页、主题入口页、资源集合页或信息门户，应设置为 portal，不要误写为 guidance、policy 或 system。
7. topicIds：必须包含 primaryTopicId。
8. tags：建议 5-10 个，中英文关键词均可。
9. status 固定为 published_draft。
10. versioningApplicable：法律法规、政策战略、指南、报告、战略规划通常为 true；一次性公告、活动日历、展览入口、机构介绍、项目入口通常为 false。
11. sourceBasis 固定为 ${sourceBasis}，只能使用以下值之一：${sourceBasisValues.join(" / ")}。
12. aiGenerated 固定为 true。
13. reviewStatus 固定为 pending。

质量要求：
- 不要编造来源中没有的信息。
- 如果资料是入口页或栏目页，要明确说明“该资料为入口页/栏目页”。
- 如果资料是资源门户、专题入口、栏目集合页或信息入口页，resourceType 必须使用 portal，并说明它主要聚合政策、指南、工具、系统或服务链接。
- 如果资料是法规或规则，要说明它涉及的制度问题。
- 如果资料是平台系统，要说明该平台的功能和用户用途。
- 如果资料是项目或活动，要说明项目目标、参与方式或服务对象。
- 内容要点必须具体，避免“该资料具有重要参考价值”这类空话。
- 不要把本站快照当作官方文件。
- 正式引用仍应以官方来源最新版本为准。

资料元数据：
resource.id: ${resource.id}
titleEn: ${resource.titleEn || ""}
titleZh: ${resource.titleZh || ""}
resourceType: ${resource.resourceType || ""}
primaryTopicId: ${resource.primaryTopicId || ""}
topicIds: ${JSON.stringify(ensureArray(resource.topicIds))}
tags: ${JSON.stringify(ensureArray(resource.tags))}
sourceUrl: ${resource.sourceUrl || ""}
sourceDomain: ${resource.sourceDomain || ""}
publishDate: ${resource.publishDate || ""}
sourceBasis: ${sourceBasis}
officialSources:
${officialSourceSummary || "无"}

来源正文或摘要：
${sourceText}`;
}

async function callAi(config, prompt, options = {}) {
  const endpoint = buildChatCompletionsUrl(config.AI_BASE_URL);
  const timeoutMs = options.timeoutMs ?? defaultAiTimeoutSeconds * 1000;
  const requestBody = JSON.stringify({
    model: config.AI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "你是 ArchiveScope 的中文档案学资料整理助手，擅长将英文档案政策、法规、指南、平台、项目和机构网页整理成中文知识库条目。只能依据用户提供的官方来源文本、Firecrawl Markdown、rawData 或来源页面文本生成内容，不要使用外部搜索摘要，不要编造原文没有的信息。请严格输出 JSON。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
  });
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
    },
    timeoutMs,
    `AI 请求超时（${Math.round(timeoutMs / 1000)} 秒）。`,
  );
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  let responseJson;

  try {
    responseJson = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`AI 响应不是合法 JSON：${error.message}\n${responseText}`);
  }

  const message = responseJson?.choices?.[0]?.message;
  const content =
    typeof message?.content === "string" && message.content.trim()
      ? message.content
      : typeof message?.reasoning_content === "string" &&
          message.reasoning_content.trim()
        ? message.reasoning_content
        : "";

  if (!content.trim()) {
    throw new Error(
      `AI 响应缺少 choices[0].message.content 或 reasoning_content：${JSON.stringify(
        responseJson,
      )}`,
    );
  }

  return content;
}

function extractJsonFromAiContent(content) {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeBlockMatch?.[1] ?? content;
  const trimmedCandidate = candidate.trim();

  if (trimmedCandidate.startsWith("{") && trimmedCandidate.endsWith("}")) {
    return trimmedCandidate;
  }

  const firstBraceIndex = trimmedCandidate.indexOf("{");
  const lastBraceIndex = trimmedCandidate.lastIndexOf("}");

  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmedCandidate.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  return trimmedCandidate;
}

function normalizeTopicIds(primaryTopicId, topicIds) {
  const normalized = ensureArray(topicIds).filter((topicId) =>
    allowedTopicIds.includes(topicId),
  );

  if (!normalized.includes(primaryTopicId)) {
    normalized.unshift(primaryTopicId);
  }

  return [...new Set(normalized)];
}

function fallbackPrimaryTopicId(resource, draft) {
  if (allowedTopicIds.includes(draft?.primaryTopicId)) {
    return draft.primaryTopicId;
  }

  if (allowedTopicIds.includes(resource?.primaryTopicId)) {
    return resource.primaryTopicId;
  }

  return "digital-resources-preservation";
}

function fallbackVersioningApplicable(resource, draft) {
  if (typeof draft?.versioningApplicable === "boolean") {
    return draft.versioningApplicable;
  }

  if (typeof resource?.versioningApplicable === "boolean") {
    return resource.versioningApplicable;
  }

  return ["law", "strategy", "guidance", "portal", "report"].includes(
    resource?.resourceType,
  );
}

function normalizeSourceBasis(value) {
  return sourceBasisValues.includes(value) ? value : "source_url";
}

function normalizeAiDraft(resource, parsedDraft, sourceContext = {}) {
  const primaryTopicId = fallbackPrimaryTopicId(resource, parsedDraft);
  const topicIds = normalizeTopicIds(primaryTopicId, parsedDraft.topicIds);
  const keyPoints = ensureArray(parsedDraft.keyPoints)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 5);
  const tags = ensureArray(parsedDraft.tags)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 12);
  const versioningApplicable = fallbackVersioningApplicable(
    resource,
    parsedDraft,
  );
  const sourceBasis = normalizeSourceBasis(
    sourceContext.sourceBasis || parsedDraft.sourceBasis,
  );

  return {
    resourceId: resource.id,
    titleZh: cleanText(parsedDraft.titleZh || resource.titleZh || ""),
    summaryShort: cleanText(parsedDraft.summaryShort || ""),
    summaryZh: cleanText(parsedDraft.summaryZh || ""),
    keyPoints,
    researchValue: cleanText(parsedDraft.researchValue || ""),
    resourceType: cleanText(parsedDraft.resourceType || resource.resourceType || ""),
    primaryTopicId,
    topicIds,
    tags,
    status: "published_draft",
    versioningApplicable,
    versionNote: cleanText(parsedDraft.versionNote || ""),
    sourceBasis,
    aiGenerated: true,
    reviewStatus: "pending",
  };
}

function parseAiDraft(resource, content, sourceContext = {}) {
  const jsonText = extractJsonFromAiContent(content);
  const parsedDraft = JSON.parse(jsonText);

  return normalizeAiDraft(resource, parsedDraft, sourceContext);
}

function mergeDraftsByResourceId(
  existingDrafts,
  generatedDrafts,
  replaceResourceIds = new Set(),
) {
  const draftByResourceId = new Map();

  for (const draft of existingDrafts) {
    if (draft?.resourceId && !draftByResourceId.has(draft.resourceId)) {
      draftByResourceId.set(draft.resourceId, draft);
    }
  }

  for (const draft of generatedDrafts) {
    if (!draft?.resourceId) {
      continue;
    }

    if (
      replaceResourceIds.has(draft.resourceId) ||
      !draftByResourceId.has(draft.resourceId)
    ) {
      draftByResourceId.set(draft.resourceId, draft);
    }
  }

  return [...draftByResourceId.values()];
}

function hasActiveExistingDraft(draft) {
  return draft?.resourceId && draft.reviewStatus !== "rejected";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log("正在读取 AI API 配置……");
  const localEnv = await loadLocalEnv();
  const config = Object.fromEntries(
    requiredEnvKeys.map((key) => [key, getEnvValue(localEnv, key)]),
  );
  firecrawlConfig = {
    FIRECRAWL_API_KEY: getEnvValue(localEnv, "FIRECRAWL_API_KEY"),
    FIRECRAWL_BASE_URL:
      getEnvValue(localEnv, "FIRECRAWL_BASE_URL") || defaultFirecrawlBaseUrl,
  };
  const missingKeys = requiredEnvKeys.filter((key) => !config[key]);

  if (missingKeys.length > 0) {
    console.error("AI 资料完善草稿生成缺少必要环境变量：");

    for (const key of missingKeys) {
      console.error(`- ${key}`);
    }

    console.error(`请在 ${envPath} 中配置后重试。`);
    process.exitCode = 1;
    return;
  }

  console.log(`使用的 baseUrl：${config.AI_BASE_URL}`);
  console.log(`使用的 model：${config.AI_MODEL}`);
  console.log(
    `Firecrawl API Key：${
      firecrawlConfig.FIRECRAWL_API_KEY ? "已检测到" : "未配置"
    }`,
  );
  console.log(`Firecrawl baseUrl：${firecrawlConfig.FIRECRAWL_BASE_URL}`);
  console.log(`本次最多处理 ${options.limit} 条资料。`);
  console.log(`来源域名筛选：${options.sourceDomain || "全部"}`);
  console.log(
    `是否只处理内容不完整资料：${options.onlyIncomplete ? "是" : "否"}`,
  );
  console.log(`是否刷新 Firecrawl 缓存：${options.refresh ? "是" : "否"}`);
  console.log(`是否强制覆盖已有草稿：${options.force ? "是" : "否"}`);
  console.log(`AI 请求超时：${Math.round(options.aiTimeoutMs / 1000)} 秒`);
  console.log(
    `Firecrawl 请求超时：${Math.round(options.firecrawlTimeoutMs / 1000)} 秒`,
  );
  console.log(`单条资料总超时：${Math.round(options.itemTimeoutMs / 1000)} 秒`);
  console.log(`强制生成 resourceId：${options.forceId || "未指定"}`);

  console.log("正在读取 acceptedResources.json……");
  const acceptedResources = await readJsonArray(acceptedResourcesPath);
  console.log(`acceptedResources 数量：${acceptedResources.length}`);

  console.log("正在读取 resourceEnrichments.ts……");
  const resourceEnrichments = await readResourceEnrichments();
  const enrichedResourceIds = new Set(
    resourceEnrichments.map((enrichment) => enrichment?.resourceId).filter(Boolean),
  );
  console.log(`已完善资料数量：${enrichedResourceIds.size}`);

  console.log("正在读取 resourceAdminEdits（如存在）……");
  const resourceAdminEdits = await readOptionalResourceAdminEdits();
  console.log(`人工编辑记录数量：${resourceAdminEdits.length}`);

  console.log("正在读取 resourceCurationDecisions……");
  const resourceCurationDecisions = await readResourceCurationDecisions();
  console.log(`资料人工取舍记录数量：${resourceCurationDecisions.length}`);

  console.log("正在读取已有 AI enrichment 草稿……");
  const existingDrafts = await readJsonArray(enrichmentDraftsPath, {
    optional: true,
  });
  const existingDraftByResourceId = new Map(
    existingDrafts
      .filter((draft) => draft?.resourceId)
      .map((draft) => [draft.resourceId, draft]),
  );
  const activeExistingDraftIds = new Set(
    existingDrafts
      .filter(hasActiveExistingDraft)
      .map((draft) => draft.resourceId),
  );
  console.log(`已有 AI 草稿数量：${existingDraftByResourceId.size}`);
  console.log(`已有未拒绝 AI 草稿数量：${activeExistingDraftIds.size}`);

  console.log("正在读取 resourceOfficialFiles.ts……");
  const resourceOfficialFiles = await readResourceOfficialFiles();
  const officialFilesByResourceId =
    groupOfficialFilesByResourceId(resourceOfficialFiles);
  console.log(`官方文本/文件记录数量：${resourceOfficialFiles.length}`);
  console.log(
    `包含官方文本/文件的资料数量：${officialFilesByResourceId.size}`,
  );
  console.log("外部搜索摘要：未接入，不使用 Google AI Overview。");

  const visibleResources = buildVisibleResources(
    acceptedResources,
    resourceEnrichments,
    resourceAdminEdits,
    resourceCurationDecisions,
  );
  const sourceDomainFilteredResources = options.sourceDomain
    ? visibleResources.filter(
        (resource) =>
          normalizeSourceDomain(resource.sourceDomain) === options.sourceDomain,
      )
    : visibleResources;
  const candidatePool = options.forceId
    ? visibleResources
    : sourceDomainFilteredResources;
  const incompleteResourceEntries = candidatePool
    .map((resource) => ({
      resource,
      reasons: getIncompleteReasons(resource),
    }))
    .filter((entry) => entry.reasons.length > 0);
  const incompleteResourceIds = new Set(
    incompleteResourceEntries.map((entry) => entry.resource.id),
  );
  const incompleteReasonByResourceId = new Map(
    incompleteResourceEntries.map((entry) => [
      entry.resource.id,
      entry.reasons,
    ]),
  );

  console.log(`前台可见资料总数：${visibleResources.length}`);
  console.log(
    `sourceDomain 筛选后资料数量：${sourceDomainFilteredResources.length}`,
  );
  console.log(`内容不完整资料数量：${incompleteResourceEntries.length}`);
  console.log(`本次 limit：${options.limit}`);

  const forcedResource = options.forceId
    ? visibleResources.find((resource) => resource?.id === options.forceId)
    : null;

  if (options.forceId && !forcedResource) {
    console.error(`未找到 --force-id 指定的资料：${options.forceId}`);
    process.exitCode = 1;
    return;
  }

  if (
    options.forceId &&
    options.sourceDomain &&
    normalizeSourceDomain(forcedResource.sourceDomain) !== options.sourceDomain
  ) {
    console.warn(
      `--force-id 优先：${options.forceId} 的 sourceDomain 为 ${normalizeSourceDomain(
        forcedResource.sourceDomain,
      ) || "未记录"}，与筛选条件 ${options.sourceDomain} 不一致，仍将处理该资料。`,
    );
  }

  const candidates = options.forceId
    ? [forcedResource]
    : candidatePool.filter((resource) => {
        if (!resource?.id) {
          return false;
        }

        if (options.onlyIncomplete && !incompleteResourceIds.has(resource.id)) {
          return false;
        }

        if (!options.force && activeExistingDraftIds.has(resource.id)) {
          return false;
        }

        if (options.onlyIncomplete) {
          return true;
        }

        return !enrichedResourceIds.has(resource.id);
      });
  const selectedResources = options.forceId
    ? candidates
    : candidates.slice(0, options.limit);

  console.log(
    options.forceId
      ? "已启用 --force-id，将忽略 resourceEnrichments.ts 和已有 AI 草稿筛选。"
      : `待生成资料数量：${candidates.length}`,
  );

  if (options.onlyIncomplete) {
    console.log(
      "已启用 --only-incomplete，仅为前台可见且内容不完整的资料生成 AI 草稿。",
    );
  }

  if (selectedResources.length === 0) {
    console.log("当前没有需要生成 AI enrichment 草稿的资料。");
    return;
  }

  const generatedDrafts = [];
  const newErrorRecords = [];

  async function processResourceItem(resource, index, total) {
    const itemErrors = [];
    const incompleteReasons =
      incompleteReasonByResourceId.get(resource.id) ?? getIncompleteReasons(resource);

    console.log(
      `\n[${index + 1}/${total}] 正在处理：${resource.id} ${
        resource.titleEn || ""
      }`,
    );
    console.log(`当前标题：${resource.titleZh || resource.titleEn || resource.id}`);

    if (incompleteReasons.length > 0) {
      console.log(`不完整原因：${incompleteReasons.join("；")}`);
    }

    let sourceContext;

    try {
      const officialFiles = officialFilesByResourceId.get(resource.id) ?? [];

      sourceContext = await extractSourceText(resource, officialFiles, {
        refresh: options.refresh,
        firecrawlTimeoutMs: options.firecrawlTimeoutMs,
      });

      if (!sourceContext?.sourceText) {
        throw new Error("未提取到可用于生成的来源正文。");
      }

      itemErrors.push(
        ...ensureArray(sourceContext.sourceErrors).map((sourceError) =>
          buildErrorRecord(
            resource,
            sourceError.stage || "firecrawl_request",
            sourceError.errorMessage || "来源提取阶段发生错误。",
          ),
        ),
      );

      console.log(`本次摘要依据 sourceBasis：${sourceContext.sourceBasis}`);
      console.log(
        `是否使用 Firecrawl 缓存：${
          sourceContext.usedFirecrawlCache ? "是" : "否"
        }`,
      );
      console.log(`已提取来源文本 ${sourceContext.sourceText.length} 个字符。`);
    } catch (error) {
      console.error(`来源内容提取失败，已跳过：${error.message}`);
      itemErrors.push(buildErrorRecord(resource, "firecrawl_request", error.message));
      return {
        draft: null,
        errors: itemErrors,
      };
    }

    const sourceContextForAi = prepareSourceContextForAi(sourceContext);
    const prompt = buildPrompt(resource, sourceContextForAi);

    console.log("正在调用 AI 生成 enrichment 草稿……");
    console.log(`resourceId: ${resource.id}`);
    console.log(`model: ${config.AI_MODEL}`);
    console.log(`sourceText 字符数: ${sourceContextForAi.originalSourceTextLength}`);
    console.log(`实际发送字符数: ${sourceContextForAi.sentSourceTextLength}`);
    console.log(`prompt 总字符数: ${prompt.length}`);

    let aiContent = "";

    try {
      aiContent = await callAi(config, prompt, {
        timeoutMs: options.aiTimeoutMs,
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        console.error("AI 请求超时，已跳过该资料。");
        itemErrors.push(buildErrorRecord(resource, "ai_timeout", error.message));
      } else {
        console.error(`AI 请求失败，已跳过该资料：${error.message}`);
        itemErrors.push(buildErrorRecord(resource, "ai_request", error.message));
      }

      return {
        draft: null,
        errors: itemErrors,
      };
    }

    try {
      const draft = parseAiDraft(resource, aiContent, sourceContextForAi);

      console.log("AI enrichment 草稿生成成功。");
      return {
        draft,
        errors: itemErrors,
      };
    } catch (error) {
      console.error(`AI 解析失败，已跳过：${error.message}`);
      itemErrors.push(buildErrorRecord(resource, "ai_parse", error.message));

      return {
        draft: null,
        errors: itemErrors,
      };
    }
  }

  for (const [index, resource] of selectedResources.entries()) {
    try {
      const result = await withTimeout(
        () => processResourceItem(resource, index, selectedResources.length),
        options.itemTimeoutMs,
        `单条资料处理超时（${Math.round(options.itemTimeoutMs / 1000)} 秒）。`,
      );

      if (result?.draft) {
        generatedDrafts.push(result.draft);
      }

      newErrorRecords.push(...ensureArray(result?.errors));
    } catch (error) {
      console.error(`单条资料处理超时或失败，已跳过：${error.message}`);
      newErrorRecords.push(
        buildErrorRecord(
          resource,
          isTimeoutError(error) ? "item_timeout" : "firecrawl_request",
          error.message,
        ),
      );
    }
  }

  const failedCount = selectedResources.length - generatedDrafts.length;

  await writeErrorRecords(newErrorRecords);

  console.log(`\n本次成功生成数量：${generatedDrafts.length}`);
  console.log(`本次失败或跳过数量：${failedCount}`);

  if (generatedDrafts.length === 0) {
    console.log("本次没有成功生成新的 AI enrichment 草稿，未写入文件。");
    return;
  }

  const outputDrafts = options.forceId
    ? mergeDraftsByResourceId(
        existingDrafts,
        generatedDrafts,
        new Set([options.forceId]),
      )
    : mergeDraftsByResourceId(
        existingDrafts,
        generatedDrafts,
        new Set(
          generatedDrafts
            .map((draft) => draft.resourceId)
            .filter((resourceId) => {
              if (options.force) {
                return true;
              }

              return existingDraftByResourceId.get(resourceId)?.reviewStatus === "rejected";
            }),
        ),
      );

  await mkdir(path.dirname(enrichmentDraftsPath), { recursive: true });
  await writeFile(
    enrichmentDraftsPath,
    `${JSON.stringify(outputDrafts, null, 2)}\n`,
    "utf8",
  );

  console.log(`\n新生成草稿数量：${generatedDrafts.length}`);
  console.log(`最终写入 resourceEnrichmentDrafts.json 数量：${outputDrafts.length}`);
  console.log(`已写入：${enrichmentDraftsPath}`);
  console.log("请人工审核后，再将合格条目复制到 resourceEnrichments.ts。");
}

main().catch((error) => {
  console.error("AI enrichment 草稿生成脚本执行失败。");
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
