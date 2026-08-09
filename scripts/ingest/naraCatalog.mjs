import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const naraCatalogBaseUrl = "https://catalog.archives.gov/api/v1";
const rowsPerPage = 25;
const maxPagesPerKeyword = 2;
const outputPath = path.join(
  projectRoot,
  "src/data/drafts/us/naraCatalogDrafts.json",
);

const requestHeaders = {
  "User-Agent": "ArchiveScopeDataCollector/0.1",
  Accept: "application/json",
};

const keywords = [
  "digital preservation",
  "electronic records",
  "records management",
  "metadata",
  "digitization",
  "public access",
  "Citizen Archivist",
  "NARA Catalog",
];

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "nara-catalog-item";
}

function hashString(value) {
  let hash = 5381;

  for (const char of String(value || "")) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }

  return (hash >>> 0).toString(36);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestDelayMs() {
  return 300 + Math.floor(Math.random() * 201);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringFromValue(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return cleanText(value);
  }

  if (Array.isArray(value)) {
    return value.map(stringFromValue).filter(Boolean).join(" ");
  }

  if (isPlainObject(value)) {
    return cleanText(
      value.value ??
        value.text ??
        value.title ??
        value.name ??
        value.termName ??
        value.organizationName ??
        value.date ??
        value.displayDate ??
        value.beginDate ??
        value.endDate ??
        value.startDate ??
        value.stopDate ??
        value.description ??
        "",
    );
  }

  return "";
}

function getPathValue(source, pathSegments) {
  return pathSegments.reduce((current, segment) => {
    if (current == null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      return current[Number(segment)];
    }

    return current[segment];
  }, source);
}

function firstStringFromPaths(source, paths) {
  for (const pathSegments of paths) {
    const value = stringFromValue(getPathValue(source, pathSegments));

    if (value) {
      return value;
    }
  }

  return "";
}

function findFirstByKey(source, wantedKeys, maxDepth = 6) {
  const normalizedWantedKeys = new Set(
    wantedKeys.map((key) => key.toLowerCase()),
  );
  const visited = new Set();

  function visit(value, depth) {
    if (value == null || depth > maxDepth) {
      return "";
    }

    if (typeof value !== "object") {
      return "";
    }

    if (visited.has(value)) {
      return "";
    }

    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, depth + 1);

        if (found) {
          return found;
        }
      }

      return "";
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (normalizedWantedKeys.has(key.toLowerCase())) {
        const found = stringFromValue(nestedValue);

        if (found) {
          return found;
        }
      }
    }

    for (const nestedValue of Object.values(value)) {
      const found = visit(nestedValue, depth + 1);

      if (found) {
        return found;
      }
    }

    return "";
  }

  return visit(source, 0);
}

function getCatalogRecord(rawItem) {
  return (
    rawItem?.description?.item ??
    rawItem?.description ??
    rawItem?._source?.record ??
    rawItem?._source ??
    rawItem?.record ??
    rawItem?.item ??
    rawItem
  );
}

function normalizeNaId(value) {
  const match = String(value || "").match(/\d+/);

  return match?.[0] ?? "";
}

function extractNaId(rawItem) {
  const record = getCatalogRecord(rawItem);
  const value =
    firstStringFromPaths(record, [
      ["naId"],
      ["naid"],
      ["na_id"],
      ["id"],
      ["identifier"],
    ]) ||
    firstStringFromPaths(rawItem, [
      ["naId"],
      ["naid"],
      ["na_id"],
      ["id"],
      ["description", "item", "naId"],
      ["description", "item", "naid"],
      ["description", "naId"],
      ["_source", "naId"],
      ["_source", "record", "naId"],
    ]) ||
    findFirstByKey(rawItem, ["naId", "naid", "na_id"]);

  return normalizeNaId(value);
}

function extractTitle(rawItem, naId) {
  const record = getCatalogRecord(rawItem);
  const title =
    firstStringFromPaths(record, [
      ["title"],
      ["itemTitle"],
      ["heading"],
      ["descriptionTitle"],
    ]) ||
    firstStringFromPaths(rawItem, [
      ["title"],
      ["description", "item", "title"],
      ["description", "title"],
      ["_source", "title"],
      ["_source", "record", "title"],
    ]) ||
    findFirstByKey(record, ["title", "itemTitle", "heading"], 4);

  return title || `NARA Catalog Item ${naId || ""}`.trim();
}

function extractDescription(rawItem) {
  const record = getCatalogRecord(rawItem);

  return (
    firstStringFromPaths(record, [
      ["description"],
      ["scopeAndContentNote"],
      ["generalNote"],
      ["abstract"],
      ["summary"],
    ]) ||
    firstStringFromPaths(rawItem, [
      ["description", "item", "description"],
      ["description", "item", "scopeAndContentNote"],
      ["description", "item", "generalNote"],
      ["_source", "record", "description"],
    ]) ||
    findFirstByKey(record, [
      "description",
      "scopeAndContentNote",
      "generalNote",
      "abstract",
      "summary",
    ])
  );
}

function extractOrganization(rawItem) {
  const record = getCatalogRecord(rawItem);

  return (
    firstStringFromPaths(record, [
      ["organization"],
      ["creatingOrganization"],
      ["recordGroup"],
      ["collectionIdentifier"],
      ["ancestorTitles"],
    ]) ||
    firstStringFromPaths(rawItem, [
      ["description", "item", "organization"],
      ["description", "item", "creatingOrganization"],
      ["description", "ancestors"],
      ["_source", "record", "organization"],
    ]) ||
    findFirstByKey(record, [
      "organization",
      "creatingOrganization",
      "recordGroup",
      "ancestorTitles",
    ])
  );
}

function extractDate(rawItem) {
  const record = getCatalogRecord(rawItem);
  const productionDateArray =
    getPathValue(record, ["productionDateArray"]) ??
    getPathValue(rawItem, ["description", "item", "productionDateArray"]);

  const productionDate = stringFromValue(productionDateArray);

  if (productionDate) {
    return productionDate;
  }

  return (
    firstStringFromPaths(record, [
      ["date"],
      ["inclusiveDates"],
      ["productionDate"],
      ["createdDate"],
    ]) ||
    firstStringFromPaths(rawItem, [
      ["date"],
      ["description", "item", "date"],
      ["description", "item", "inclusiveDates"],
      ["_source", "record", "date"],
    ]) ||
    findFirstByKey(record, [
      "date",
      "inclusiveDates",
      "productionDate",
      "createdDate",
    ])
  );
}

function extractCatalogUrl(rawItem, naId, titleEn) {
  const record = getCatalogRecord(rawItem);
  const url =
    firstStringFromPaths(record, [
      ["catalogUrl"],
      ["catalogURL"],
      ["objectUrl"],
      ["objectURL"],
      ["url"],
      ["link"],
    ]) ||
    firstStringFromPaths(rawItem, [
      ["catalogUrl"],
      ["catalogURL"],
      ["objectUrl"],
      ["objectURL"],
      ["url"],
      ["link"],
      ["description", "item", "catalogUrl"],
      ["description", "item", "objectUrl"],
      ["_source", "record", "url"],
    ]) ||
    findFirstByKey(record, ["catalogUrl", "objectUrl", "url", "link"], 4);

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (naId) {
    return `https://catalog.archives.gov/id/${naId}`;
  }

  return `https://catalog.archives.gov/search?q=${encodeURIComponent(titleEn)}`;
}

function buildRequestUrl(keyword, offset) {
  const url = new URL(naraCatalogBaseUrl);

  url.searchParams.set("rows", String(rowsPerPage));
  url.searchParams.set("q", keyword);
  url.searchParams.set("offset", String(offset));

  return url.toString();
}

function extractResultItems(data) {
  const candidates = [
    data?.body?.hits?.hits,
    data?.hits?.hits,
    data?.opaResponse?.results?.result,
    data?.body?.results,
    data?.body?.items,
    data?.results,
    data?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function inferTopics(keyword) {
  const normalizedKeyword = String(keyword || "").toLowerCase();
  const topicIds = [];

  if (
    /(digital preservation|metadata|digitization|nara catalog)/i.test(
      normalizedKeyword,
    )
  ) {
    topicIds.push("digital-resources-preservation");
  }

  if (/(electronic records|records management)/i.test(normalizedKeyword)) {
    topicIds.push("electronic-records-management");
  }

  if (/(public access|citizen archivist)/i.test(normalizedKeyword)) {
    topicIds.push("access-outreach-public-participation");
  }

  if (topicIds.length === 0) {
    topicIds.push("digital-resources-preservation");
  }

  return {
    primaryTopicId: topicIds[0],
    topicIds: [...new Set(topicIds)],
  };
}

function buildTags(keyword, naId) {
  return [
    "NARA Catalog",
    keyword,
    "catalog item",
    naId ? `NAID:${naId}` : "",
  ]
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}

function toResourceDraft(rawItem, keyword, now) {
  const naId = extractNaId(rawItem);
  const titleEn = extractTitle(rawItem, naId);
  const slug = naId
    ? `nara-catalog-${naId}`
    : `nara-catalog-${slugify(titleEn)}-${hashString(titleEn)}`;
  const { primaryTopicId, topicIds } = inferTopics(keyword);
  const sourceUrl = extractCatalogUrl(rawItem, naId, titleEn);

  return {
    id: naId ? `nara-catalog-${naId}` : slug,
    sourceId: "source-nara-catalog-api",
    sourceType: "api",
    titleEn,
    titleZh: "",
    slug,
    countryId: "usa",
    institutionId: "nara",
    resourceType: "catalog_item",
    primaryTopicId,
    topicIds,
    tags: buildTags(keyword, naId),
    language: "English",
    summaryZh: "",
    keyPoints: [],
    researchValue: "",
    sourceUrl,
    sourceDomain: "catalog.archives.gov",
    publishDate: extractDate(rawItem),
    updatedDate: "",
    accessDate: formatDate(now),
    linkStatus: "ok",
    hasBackup: false,
    backupVisibility: "private",
    archivedUrl: "",
    versioningApplicable: false,
    reviewStatus: "pending",
    duplicateOf: "",
    rawData: {
      keyword,
      naId,
      title: titleEn,
      description: extractDescription(rawItem),
      organization: extractOrganization(rawItem),
      item: rawItem,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function dedupeDrafts(drafts) {
  const seenNaIds = new Set();
  const seenSourceUrls = new Set();
  const seenTitles = new Set();
  const uniqueDrafts = [];

  for (const draft of drafts) {
    const naId = String(draft.rawData?.naId || "").trim();
    const sourceUrl = String(draft.sourceUrl || "").trim();
    const titleEn = String(draft.titleEn || "").trim().toLowerCase();

    if (naId && seenNaIds.has(naId)) {
      continue;
    }

    if (sourceUrl && seenSourceUrls.has(sourceUrl)) {
      continue;
    }

    if (titleEn && seenTitles.has(titleEn)) {
      continue;
    }

    if (naId) {
      seenNaIds.add(naId);
    }

    if (sourceUrl) {
      seenSourceUrls.add(sourceUrl);
    }

    if (titleEn) {
      seenTitles.add(titleEn);
    }

    uniqueDrafts.push(draft);
  }

  return uniqueDrafts;
}

async function fetchCatalogPage(keyword, offset) {
  const requestUrl = buildRequestUrl(keyword, offset);

  console.log(`  当前 offset：${offset}`);
  console.log(`  请求 URL：${requestUrl}`);

  const response = await fetch(requestUrl, {
    headers: requestHeaders,
    redirect: "follow",
  });

  console.log(`  HTTP 状态：${response.status}`);
  console.log(`  Content-Type：${response.headers.get("content-type") || "未提供"}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const responseText = await response.text();

    console.log(
      "  NARA Catalog API 当前未返回 JSON，可能接口地址已变更、被重定向到网页，或该 API 暂不可用。",
    );
    console.log(`  响应前 200 个字符：${responseText.slice(0, 200)}`);
    console.log("  已跳过该请求。");

    return [];
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.log(`  JSON 解析失败：${error.message}`);
    console.log("  已跳过该请求。");

    return [];
  }

  const items = extractResultItems(data);

  console.log(`  当前获取条数：${items.length}`);

  return items;
}

async function ingestNaraCatalog() {
  const now = new Date();
  const drafts = [];

  console.log("正在采集 NARA Catalog API 专题数据……");

  for (const keyword of keywords) {
    console.log(`当前关键词：${keyword}`);

    for (let page = 0; page < maxPagesPerKeyword; page += 1) {
      const offset = page * rowsPerPage;

      try {
        const items = await fetchCatalogPage(keyword, offset);
        drafts.push(...items.map((item) => toResourceDraft(item, keyword, now)));

        if (items.length === 0) {
          console.log("  当前页没有结果，跳过该关键词后续分页。");
          break;
        }
      } catch (error) {
        console.error(
          `  关键词 ${keyword} / offset ${offset} 请求失败：${error.message}`,
        );
      }

      const isLastRequest =
        keyword === keywords[keywords.length - 1] &&
        page === maxPagesPerKeyword - 1;

      if (!isLastRequest) {
        await sleep(requestDelayMs());
      }
    }
  }

  const uniqueDrafts = dedupeDrafts(drafts);
  const duplicateCount = drafts.length - uniqueDrafts.length;

  console.log(`原始获取结果共 ${drafts.length} 条。`);
  console.log(`最终去重数量：${uniqueDrafts.length}`);
  console.log(`去除重复 ${duplicateCount} 条。`);

  if (uniqueDrafts.length === 0) {
    console.log("未获取到 NARA Catalog 草稿，已保留已有 naraCatalogDrafts.json。");
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(uniqueDrafts, null, 2)}\n`, "utf8");

  console.log("已写入 src/data/drafts/us/naraCatalogDrafts.json");
  console.log(`输出路径：${path.relative(projectRoot, outputPath)}`);
}

ingestNaraCatalog().catch((error) => {
  console.error(`NARA Catalog API 专题采集失败：${error.message}`);
  process.exitCode = 1;
});
