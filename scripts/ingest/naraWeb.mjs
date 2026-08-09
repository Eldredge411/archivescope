import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const seedPath = path.join(projectRoot, "src/data/ingestion/naraWebSeeds.ts");
const outputPath = path.join(projectRoot, "src/data/drafts/us/naraWebDrafts.json");

const requestHeaders = {
  "User-Agent": "ArchiveScopeDataCollector/0.1",
  Accept: "text/html",
};

const resourceTypeMap = {
  guide: "guidance",
  portal: "portal",
  strategy: "strategy",
  project: "program",
  course: "guidance",
  institution_resource: "guidance",
  system: "system",
};

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatMaybeDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDate(date);
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

  return slug || "nara-web-resource";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mergeUniqueStrings(...values) {
  return Array.from(
    new Set(
      values
        .flat()
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function ensureTopicIds(primaryTopicId, topicIds) {
  const normalizedPrimaryTopicId =
    String(primaryTopicId || "").trim() || "laws-policies-governance";
  const normalizedTopicIds = Array.isArray(topicIds)
    ? topicIds.map((topicId) => String(topicId || "").trim()).filter(Boolean)
    : [];

  return mergeUniqueStrings([normalizedPrimaryTopicId], normalizedTopicIds);
}

const institutionKeywords = [
  "Center",
  "Library",
  "Museum",
  "Association",
  "Office",
  "Agency",
  "Administration",
  "Commission",
  "Council",
  "Institute",
  "Institution",
  "中心",
  "图书馆",
  "博物馆",
  "协会",
  "委员会",
  "机构",
];

function classifyTargetEntityType(seed, titleEn) {
  if (
    seed.targetEntityType === "resource" ||
    seed.targetEntityType === "institution" ||
    seed.targetEntityType === "unknown"
  ) {
    return {
      targetEntityType: seed.targetEntityType,
      entityTypeConfidence: "high",
      classificationReason: "由 seed 配置指定",
    };
  }

  const fields = [
    titleEn,
    seed.titleHintEn,
    seed.titleHintZh,
    seed.url,
    ...(Array.isArray(seed.suggestedTags) ? seed.suggestedTags : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const haystack = fields.join(" ").toLowerCase();
  const matchedKeyword = institutionKeywords.find((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  );

  if (matchedKeyword) {
    return {
      targetEntityType: "institution",
      entityTypeConfidence: "medium",
      classificationReason: "根据标题、URL 或标签中的机构类关键词自动判断",
    };
  }

  return {
    targetEntityType: "resource",
    entityTypeConfidence: "medium",
    classificationReason: "默认作为资料库条目处理",
  };
}

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return String(value || "").replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity) => {
      const normalizedEntity = String(entity).toLowerCase();

      if (normalizedEntity.startsWith("#x")) {
        const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
        return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
      }

      if (normalizedEntity.startsWith("#")) {
        const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
        return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
      }

      return namedEntities[normalizedEntity] ?? match;
    },
  );
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(tag, attributeName) {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);

  return decodeHtmlEntities(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function extractMetaContent(html, matcher) {
  const metaTags = String(html || "").match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const name = getAttribute(tag, "name").toLowerCase();
    const property = getAttribute(tag, "property").toLowerCase();
    const itemprop = getAttribute(tag, "itemprop").toLowerCase();

    if (matcher({ name, property, itemprop })) {
      const content = cleanText(getAttribute(tag, "content"));

      if (content) {
        return content;
      }
    }
  }

  return "";
}

function extractTitle(html, seed) {
  const titleMatch = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(titleMatch?.[1] ?? "");

  return (
    title ||
    extractMetaContent(html, ({ property }) => property === "og:title") ||
    seed.titleHintEn
  );
}

function extractParagraphs(html) {
  const paragraphs = [];
  const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = paragraphPattern.exec(String(html || "")))) {
    const text = cleanText(match[1]);

    if (text.length >= 30 && !paragraphs.includes(text)) {
      paragraphs.push(text);
    }

    if (paragraphs.length >= 5) {
      break;
    }
  }

  return paragraphs;
}

function extractDescription(html, paragraphs) {
  return (
    extractMetaContent(
      html,
      ({ name }) => name === "description" || name === "dc.description",
    ) ||
    extractMetaContent(html, ({ property }) => property === "og:description") ||
    paragraphs.slice(0, 2).join(" ")
  );
}

function extractUpdatedDate(html, response) {
  const metaDate =
    extractMetaContent(html, ({ name }) =>
      [
        "date",
        "modified",
        "last-modified",
        "dcterms.modified",
        "dc.date.modified",
      ].includes(name),
    ) ||
    extractMetaContent(html, ({ property }) =>
      ["article:modified_time", "og:updated_time"].includes(property),
    ) ||
    extractMetaContent(html, ({ itemprop }) => itemprop === "datemodified");

  return formatMaybeDate(metaDate) || formatMaybeDate(response.headers.get("last-modified"));
}

function extractSeedArraySource(source) {
  const marker = "export const naraWebSeeds";
  const markerIndex = source.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error("未找到 naraWebSeeds 导出。");
  }

  const assignmentIndex = source.indexOf("=", markerIndex);
  const arrayStart = source.indexOf("[", assignmentIndex);

  if (assignmentIndex < 0 || arrayStart < 0) {
    throw new Error("naraWebSeeds 格式不正确。");
  }

  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
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
    } else if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(arrayStart, index + 1);
      }
    }
  }

  throw new Error("未能解析 naraWebSeeds 数组。");
}

async function loadSeeds() {
  const source = await readFile(seedPath, "utf8");
  const arraySource = extractSeedArraySource(source);
  const seeds = vm.runInNewContext(arraySource, {}, { timeout: 1000 });

  if (!Array.isArray(seeds)) {
    throw new Error("naraWebSeeds 必须是数组。");
  }

  return seeds;
}

function isVersioningApplicable(suggestedResourceType) {
  return ["strategy", "guide", "law", "standard"].includes(suggestedResourceType);
}

function toResourceDraft(seed, extracted, now) {
  const titleEn = String(extracted.fetchedTitle || seed.titleHintEn || "").trim();
  const primaryTopicId =
    String(seed.suggestedPrimaryTopicId || "").trim() ||
    "laws-policies-governance";
  const topicIds = ensureTopicIds(primaryTopicId, seed.suggestedTopicIds);
  const entityClassification = classifyTargetEntityType(seed, titleEn);

  return {
    id: `nara-web-${seed.id}`,
    sourceId: "source-nara-web",
    sourceType: "webpage",
    titleEn,
    titleZh: seed.titleHintZh,
    slug: slugify(titleEn || seed.id),
    countryId: "usa",
    institutionId: seed.institutionId || "nara",
    resourceType: resourceTypeMap[seed.suggestedResourceType] || "guidance",
    primaryTopicId,
    topicIds,
    tags: mergeUniqueStrings(seed.suggestedTags, ["archives.gov", "NARA"]),
    language: "English",
    summaryZh: "",
    keyPoints: [],
    researchValue: "",
    sourceUrl: seed.url,
    sourceDomain: "archives.gov",
    publishDate: "",
    updatedDate: extracted.updatedDate,
    accessDate: formatDate(now),
    linkStatus: "ok",
    hasBackup: false,
    backupVisibility: "private",
    archivedUrl: "",
    versioningApplicable: isVersioningApplicable(seed.suggestedResourceType),
    targetEntityType: entityClassification.targetEntityType,
    entityTypeConfidence: entityClassification.entityTypeConfidence,
    classificationReason: entityClassification.classificationReason,
    reviewStatus: "pending",
    duplicateOf: "",
    rawData: {
      seed,
      fetchedTitle: extracted.fetchedTitle,
      fetchedDescription: extracted.fetchedDescription,
      rawExcerpt: extracted.rawExcerpt,
      httpStatus: extracted.httpStatus,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function dedupeDrafts(drafts) {
  const seenIds = new Set();
  const seenSourceUrls = new Set();
  const seenTitles = new Set();
  const uniqueDrafts = [];

  for (const draft of drafts) {
    const id = String(draft.id || "").trim();
    const sourceUrl = String(draft.sourceUrl || "").trim();
    const titleEn = String(draft.titleEn || "").trim().toLowerCase();

    if (id && seenIds.has(id)) {
      continue;
    }

    if (sourceUrl && seenSourceUrls.has(sourceUrl)) {
      continue;
    }

    if (titleEn && seenTitles.has(titleEn)) {
      continue;
    }

    if (id) {
      seenIds.add(id);
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

async function fetchSeed(seed, now) {
  console.log(`当前 URL：${seed.url}`);

  try {
    const response = await fetch(seed.url, {
      headers: requestHeaders,
      redirect: "follow",
    });

    console.log(`HTTP 状态码：${response.status}`);

    if (!response.ok) {
      console.log("页面返回非 200，已跳过。");
      return null;
    }

    const html = await response.text();
    const paragraphs = extractParagraphs(html);
    const fetchedTitle = extractTitle(html, seed);
    const fetchedDescription = extractDescription(html, paragraphs);
    const rawExcerpt = paragraphs.slice(0, 5).join("\n\n");
    const updatedDate = extractUpdatedDate(html, response);

    console.log(`提取到的标题：${fetchedTitle || seed.titleHintEn}`);

    const draft = toResourceDraft(
      seed,
      {
        fetchedTitle,
        fetchedDescription,
        rawExcerpt,
        httpStatus: response.status,
        updatedDate,
      },
      now,
    );

    console.log("是否成功生成草稿：是");

    return draft;
  } catch (error) {
    console.log(`请求失败：${error.message}`);
    console.log("是否成功生成草稿：否");

    return null;
  }
}

async function ingestNaraWeb() {
  const now = new Date();

  console.log("正在采集 NARA 官网重点页面……");

  const seeds = await loadSeeds();
  const drafts = [];

  for (const [index, seed] of seeds.entries()) {
    const draft = await fetchSeed(seed, now);

    if (draft) {
      drafts.push(draft);
    }

    if (index < seeds.length - 1) {
      await sleep(400);
    }
  }

  const uniqueDrafts = dedupeDrafts(drafts);

  console.log(`去重后草稿数量：${uniqueDrafts.length}`);

  if (uniqueDrafts.length === 0) {
    console.log("未成功抓取到 NARA 官网草稿，已保留已有 naraWebDrafts.json。");
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(uniqueDrafts, null, 2)}\n`, "utf8");

  console.log(`最终写入 ${uniqueDrafts.length} 条`);
  console.log(`输出路径：${path.relative(projectRoot, outputPath)}`);
}

ingestNaraWeb().catch((error) => {
  console.error(`NARA 官网重点页面采集失败：${error.message}`);
  process.exitCode = 1;
});
