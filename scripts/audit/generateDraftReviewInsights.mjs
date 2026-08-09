import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const draftSources = [
  {
    draftSourceKey: "federal-register",
    labelZh: "Federal Register",
    filePath: path.join(projectRoot, "src/data/drafts/us/federalRegisterDrafts.json"),
  },
  {
    draftSourceKey: "nara-web",
    labelZh: "NARA 官网",
    filePath: path.join(projectRoot, "src/data/drafts/us/naraWebDrafts.json"),
  },
  {
    draftSourceKey: "nara-catalog",
    labelZh: "NARA Catalog",
    filePath: path.join(projectRoot, "src/data/drafts/us/naraCatalogDrafts.json"),
    optional: true,
  },
  {
    draftSourceKey: "manual-url",
    labelZh: "手动网址",
    filePath: path.join(projectRoot, "src/data/drafts/us/manualUrlDrafts.json"),
    optional: true,
  },
];

const insightsPath = path.join(
  projectRoot,
  "src/data/imports/us/draftReviewInsights.json",
);

const administrativeRules = [
  {
    term: "appointment",
    flag: "personnel_change",
  },
  {
    term: "appointments",
    flag: "personnel_change",
  },
  {
    term: "personnel",
    flag: "personnel_change",
  },
  {
    term: "nomination",
    flag: "personnel_change",
  },
  {
    term: "generic clearance",
    flag: "generic_clearance",
  },
  {
    term: "information collection activities",
    flag: "generic_clearance",
  },
  {
    term: "renewal of collection",
    flag: "generic_clearance",
  },
  {
    term: "comment request",
    flag: "administrative_notice",
  },
  {
    term: "meeting notice",
    flag: "meeting_notice",
  },
];

const protectedTerms = [
  "foia",
  "records management",
  "federal records",
  "electronic records",
  "presidential records",
];

const institutionTerms = [
  "center",
  "library",
  "museum",
  "association",
  "office",
  "institute",
  "institution",
  "图书馆",
  "博物馆",
  "协会",
  "中心",
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function cleanStringArray(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : [];
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function readJsonArray(filePath, options = {}) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error("文件内容不是 JSON 数组。");
    }

    return parsed;
  } catch (error) {
    if (options.optional && error?.code === "ENOENT") {
      return [];
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function uniqueStrings(values) {
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

function translateTitle(titleEn) {
  const title = cleanString(titleEn);

  if (!title) {
    return "";
  }

  const replacements = [
    [/Agency Information Collection Activities/gi, "机构信息收集活动"],
    [/Renewal of Collection/gi, "收集授权续期"],
    [/Comment Request/gi, "征求意见"],
    [/Generic Clearance/gi, "通用许可"],
    [/Federal Records Management/gi, "联邦记录管理"],
    [/National Archives/gi, "国家档案馆"],
    [/Presidential Records/gi, "总统记录"],
    [/Freedom of Information Act|FOIA/gi, "信息自由法"],
    [/Records Management/gi, "记录管理"],
    [/Electronic Records/gi, "电子记录"],
    [/Library/gi, "图书馆"],
    [/Museum/gi, "博物馆"],
    [/Center/gi, "中心"],
    [/Office/gi, "办公室"],
    [/Association/gi, "协会"],
    [/Notice/gi, "公告"],
    [/Rule/gi, "规则"],
    [/Regulation/gi, "规章"],
    [/Act/gi, "法案"],
  ];

  let translated = title;

  for (const [pattern, replacement] of replacements) {
    translated = translated.replace(pattern, replacement);
  }

  return translated === title ? title : translated;
}

function inferTopic(text, tags) {
  const joinedText = `${text} ${tags.join(" ")}`.toLowerCase();

  if (
    joinedText.includes("foia") ||
    joinedText.includes("freedom of information") ||
    joinedText.includes("public access") ||
    joinedText.includes("citizen archivist")
  ) {
    return "access-outreach-public-participation";
  }

  if (
    joinedText.includes("electronic records") ||
    joinedText.includes("records management") ||
    joinedText.includes("federal records")
  ) {
    return "electronic-records-management";
  }

  if (
    joinedText.includes("digital") ||
    joinedText.includes("preservation") ||
    joinedText.includes("catalog") ||
    joinedText.includes("digitization")
  ) {
    return "digital-resources-preservation";
  }

  if (joinedText.includes("ai") || joinedText.includes("artificial intelligence")) {
    return "ai-emerging-technologies";
  }

  return "laws-policies-governance";
}

function inferResourceType(text, originalType) {
  const normalizedText = text.toLowerCase();

  if (
    normalizedText.includes("portal") ||
    (normalizedText.includes("archives.gov") &&
      normalizedText.includes("resources")) ||
    normalizedText.includes("resource center") ||
    normalizedText.includes("start your research") ||
    normalizedText.includes("research our records") ||
    normalizedText.includes("educator resources") ||
    normalizedText.includes("federal records management") ||
    normalizedText.includes("plans and reports") ||
    normalizedText.includes("preservation at nara")
  ) {
    return "portal";
  }

  if (
    /\b(act|rule|regulation)\b/.test(normalizedText) ||
    normalizedText.includes("foia") ||
    normalizedText.includes("federal records") ||
    normalizedText.includes("presidential records")
  ) {
    return "law";
  }

  if (normalizedText.includes("catalog") || normalizedText.includes("database")) {
    return "database";
  }

  if (normalizedText.includes("system") || normalizedText.includes("platform")) {
    return "system";
  }

  return cleanString(originalType) || "strategy";
}

function inferInstitutionGroup(text) {
  const normalizedText = text.toLowerCase();

  if (
    normalizedText.includes("archives.gov") ||
    normalizedText.includes("nara") ||
    normalizedText.includes("presidential libraries")
  ) {
    return "federal";
  }

  if (normalizedText.includes("state ")) {
    return "state";
  }

  if (
    normalizedText.includes("association") ||
    normalizedText.includes("society")
  ) {
    return "social";
  }

  if (normalizedText.includes("university") || normalizedText.includes("college")) {
    return "academic";
  }

  return "other";
}

function inferInstitutionType(text) {
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("library") || normalizedText.includes("图书馆")) {
    return "library";
  }

  if (normalizedText.includes("museum") || normalizedText.includes("博物馆")) {
    return "museum";
  }

  if (
    normalizedText.includes("association") ||
    normalizedText.includes("society") ||
    normalizedText.includes("协会")
  ) {
    return "association";
  }

  if (normalizedText.includes("office")) {
    return "government";
  }

  if (normalizedText.includes("institute") || normalizedText.includes("center")) {
    return "research";
  }

  return "archives";
}

function makeSummary({ draft, source, suggestedEntityType, recommendation, flags }) {
  const title = cleanString(draft.titleEn || draft.titleZh || draft.id);

  if (suggestedEntityType === "institution") {
    return `该条目来自${source.labelZh}，标题显示其可能是机构、中心、图书馆或办公室页面，建议作为机构条目复核。`;
  }

  if (flags.includes("generic_clearance") || flags.includes("administrative_notice")) {
    return `该条目来自 Federal Register，涉及一般行政通知或信息收集程序，建议人工复核其与档案资源建设的相关性。`;
  }

  if (source.draftSourceKey === "nara-web") {
    return `该页面来自 NARA 官网，属于档案法规、记录管理、数字资源或公众服务相关资料，通常建议收录。`;
  }

  return `该条目来自${source.labelZh}，涉及 ${title}，建议结合来源正文和专题价值决定是否收录。`;
}

function generateInsight(draft, source, now) {
  const titleEn = cleanString(draft.titleEn);
  const titleZh = cleanString(draft.titleZh) || translateTitle(titleEn);
  const tags = cleanStringArray(draft.tags);
  const sourceDomain = cleanString(draft.sourceDomain);
  const text = [
    titleEn,
    titleZh,
    cleanString(draft.sourceUrl),
    sourceDomain,
    ...tags,
  ]
    .join(" ")
    .toLowerCase();
  const warningFlags = [];
  let relevanceScore = 60;
  let suggestedEntityType = "unknown";
  let recommendation = "review";
  let reason = "规则初筛后建议人工复核该草稿。";

  for (const rule of administrativeRules) {
    if (text.includes(rule.term)) {
      warningFlags.push(rule.flag);
    }
  }

  const hasProtectedTerm = includesAny(text, protectedTerms);
  const isPossibleInstitution = includesAny(text, institutionTerms);
  const isNaraOfficialPage =
    source.draftSourceKey === "nara-web" || sourceDomain === "archives.gov";
  const hasStrongResourceSignal = [
    "records management",
    "federal records",
    "presidential records",
    "foia",
  ].some((term) => text.includes(term)) || /\b(act|rule|regulation)\b/.test(text);

  if (warningFlags.length > 0) {
    relevanceScore -= 35;
    reason =
      "该条目可能为一般行政通知、人员事项或信息收集公告，与档案资源建设相关性较弱。";
  }

  if (hasProtectedTerm) {
    relevanceScore += 25;
    reason =
      "该条目虽命中行政公告类关键词，但同时涉及 FOIA、records management、federal records 或 electronic records，建议复核后再决定。";
  }

  if (isPossibleInstitution) {
    suggestedEntityType = "institution";
    warningFlags.push("possible_institution");
    relevanceScore += 10;
    reason =
      "标题或标签命中机构类关键词，可能更适合作为机构条目，而不是资料库条目。";
  }

  if (hasStrongResourceSignal) {
    suggestedEntityType = "resource";
    relevanceScore += 20;

    if (warningFlags.length === 0) {
      reason =
        "标题或标签显示该条目涉及法规、规则、记录管理、联邦记录、总统记录或 FOIA，具备资料库收录价值。";
    }
  }

  if (isNaraOfficialPage) {
    relevanceScore += 20;
    recommendation = "accept";
    reason =
      "该草稿来自 NARA 官网，通常与美国档案法规、记录管理、数字资源或公众服务直接相关，建议收录。";
  }

  if (warningFlags.length > 0) {
    recommendation =
      hasProtectedTerm || isNaraOfficialPage
        ? "review"
        : relevanceScore < 45
          ? "reject"
          : "review";

    if (!hasProtectedTerm && !isNaraOfficialPage) {
      warningFlags.push("weak_relevance");
    }
  } else if (suggestedEntityType === "institution") {
    recommendation = "review";
  } else if (hasStrongResourceSignal || isNaraOfficialPage) {
    recommendation = "accept";
  }

  if (suggestedEntityType === "unknown") {
    suggestedEntityType = recommendation === "reject" ? "exclude" : "resource";
  }

  const suggestedPrimaryTopicId = inferTopic(text, tags);
  const suggestedTopicIds = uniqueStrings([
    suggestedPrimaryTopicId,
    ...(hasProtectedTerm ? ["laws-policies-governance"] : []),
    ...cleanStringArray(draft.topicIds).filter((topicId) => topicId !== suggestedPrimaryTopicId),
  ]).slice(0, 4);
  const suggestedTags = uniqueStrings([
    ...tags,
    hasProtectedTerm ? "records management" : "",
    source.draftSourceKey === "federal-register" ? "Federal Register" : "",
    source.draftSourceKey === "nara-web" ? "NARA" : "",
  ]).slice(0, 10);

  return {
    draftId: cleanString(draft.id),
    draftSourceKey: source.draftSourceKey,
    titleZh,
    summaryShort: makeSummary({
      draft,
      source,
      suggestedEntityType,
      recommendation,
      flags: warningFlags,
    }),
    suggestedEntityType,
    suggestedResourceType:
      suggestedEntityType === "resource"
        ? inferResourceType(text, draft.resourceType)
        : "",
    suggestedInstitutionGroup:
      suggestedEntityType === "institution" ? inferInstitutionGroup(text) : "",
    suggestedInstitutionType:
      suggestedEntityType === "institution" ? inferInstitutionType(text) : "",
    suggestedPrimaryTopicId,
    suggestedTopicIds,
    suggestedTags,
    relevanceScore: clampScore(relevanceScore),
    recommendation,
    reason,
    warningFlags: uniqueStrings(warningFlags),
    generatedBy: "rule",
    reviewStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  const now = new Date().toISOString();
  const insights = [];
  const countsBySource = [];

  for (const source of draftSources) {
    const drafts = await readJsonArray(source.filePath, {
      optional: source.optional,
    });

    countsBySource.push(`${source.labelZh}: ${drafts.length}`);
    insights.push(...drafts.map((draft) => generateInsight(draft, source, now)));
  }

  await mkdir(path.dirname(insightsPath), { recursive: true });
  await writeFile(insightsPath, `${JSON.stringify(insights, null, 2)}\n`, "utf8");

  const acceptedCount = insights.filter(
    (insight) => insight.recommendation === "accept",
  ).length;
  const reviewCount = insights.filter(
    (insight) => insight.recommendation === "review",
  ).length;
  const rejectCount = insights.filter(
    (insight) => insight.recommendation === "reject",
  ).length;
  const institutionCount = insights.filter(
    (insight) => insight.suggestedEntityType === "institution",
  ).length;

  console.log(`读取草稿：${countsBySource.join("；")}`);
  console.log(`生成审核辅助信息：${insights.length} 条`);
  console.log(`建议收录：${acceptedCount}`);
  console.log(`建议复核：${reviewCount}`);
  console.log(`建议拒绝：${rejectCount}`);
  console.log(`疑似机构：${institutionCount}`);
  console.log(`写入路径：${insightsPath}`);
}

main().catch((error) => {
  console.error(`生成草稿审核辅助信息失败：${error.message}`);
  process.exitCode = 1;
});
