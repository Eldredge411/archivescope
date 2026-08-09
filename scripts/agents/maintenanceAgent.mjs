import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const envPath = path.join(projectRoot, ".env.local");
const institutionAuditReportPath = path.join(
  projectRoot,
  "src/data/imports/us/institutionAuditReport.json",
);
const acceptedInstitutionsPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedInstitutions.json",
);
const maintenanceSuggestionsPath = path.join(
  projectRoot,
  "src/data/admin/maintenanceSuggestions.json",
);
const dailyReportDirectory = path.join(
  projectRoot,
  "src/data/admin/dailyBriefings",
);
const dailyReportIndexPath = path.join(dailyReportDirectory, "index.json");
const dailyReportReadmePath = path.join(dailyReportDirectory, "README.md");

const defaultFirecrawlBaseUrl = "https://api.firecrawl.dev";
const searchLimit = 5;
const requestTimeoutMs = 30_000;

const blockedDomains = [
  "wikipedia.org",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "yelp.com",
  "tripadvisor.com",
  "amazon.com",
];

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

function buildFirecrawlSearchUrl(baseUrl) {
  const trimmedBaseUrl = String(baseUrl || defaultFirecrawlBaseUrl)
    .trim()
    .replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/v2/search")) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/v2/search`;
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

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

async function readJsonObject(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("文件内容不是 JSON 对象。");
    }

    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("请先运行 npm run institutions:validate");
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function normalizeUrl(value) {
  const url = stringValue(value);

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    parsed.hash = "";

    return parsed.toString();
  } catch {
    return "";
  }
}

function cleanComparableText(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashText(value) {
  return createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
}

function currentIsoString() {
  return new Date().toISOString();
}

function currentDateString() {
  return currentIsoString().slice(0, 10);
}

function buildInstitutionById(institutions) {
  const institutionById = new Map();

  for (const institution of institutions) {
    const id = stringValue(institution?.id);

    if (id) {
      institutionById.set(id, institution);
    }
  }

  return institutionById;
}

function getNotFoundInstitutionLinks(auditReport, institutionById) {
  const manualReviewLinks = Array.isArray(auditReport.manualReviewLinks)
    ? auditReport.manualReviewLinks
    : [];

  return manualReviewLinks
    .filter((link) => link?.status === "not_found")
    .map((link) => {
      const institutionId = stringValue(link.institutionId);
      const institution = institutionById.get(institutionId) ?? {};

      return {
        institutionId,
        nameZh: stringValue(institution.nameZh) || stringValue(link.nameZh),
        nameEn: stringValue(institution.nameEn) || stringValue(link.nameEn),
        stateCode: stringValue(institution.stateCode) || stringValue(link.stateCode),
        stateName: stringValue(institution.stateName) || stringValue(link.stateName),
        stateNameZh:
          stringValue(institution.stateNameZh) || stringValue(link.stateNameZh),
        currentWebsite:
          stringValue(institution.website) || stringValue(link.website),
        reportWebsite: stringValue(link.website),
        statusCode: link.statusCode,
        finalUrl: stringValue(link.finalUrl),
      };
    })
    .filter((link) => link.institutionId);
}

function buildSearchQuery(institution) {
  return `${institution.nameEn || institution.nameZh} official website state archives`
    .replace(/\s+/g, " ")
    .trim();
}

function pickFirstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) ?? [];
}

function extractSearchResults(responseJson) {
  const rawResults = firstArray(
    responseJson?.data,
    responseJson?.data?.results,
    responseJson?.data?.web,
    responseJson?.results,
    responseJson?.web,
  );

  return rawResults
    .map((result, index) => ({
      title: pickFirstString(
        result?.title,
        result?.metadata?.title,
        result?.name,
      ),
      url: normalizeUrl(
        pickFirstString(result?.url, result?.link, result?.href),
      ),
      description: pickFirstString(
        result?.description,
        result?.snippet,
        result?.markdown,
        result?.content,
      ),
      rank: index + 1,
    }))
    .filter((result) => result.url);
}

async function searchWithFirecrawl(endpoint, apiKey, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: searchLimit,
      }),
      signal: controller.signal,
    });
    const responseText = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        results: [],
        error: `Firecrawl Search 请求失败，HTTP ${response.status}: ${responseText.slice(
          0,
          500,
        )}`,
      };
    }

    let responseJson;

    try {
      responseJson = JSON.parse(responseText);
    } catch (error) {
      return {
        ok: false,
        results: [],
        error: `Firecrawl Search 响应不是合法 JSON：${error.message}`,
      };
    }

    return {
      ok: true,
      results: extractSearchResults(responseJson),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      results: [],
      error:
        error?.name === "AbortError"
          ? "Firecrawl Search 请求超时。"
          : `Firecrawl Search 请求异常：${error?.message ?? String(error)}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isGovUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    return hostname === "gov" || hostname.endsWith(".gov");
  } catch {
    return false;
  }
}

function isBlockedDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    return blockedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return true;
  }
}

function textContainsAny(text, terms) {
  return terms.some((term) => term && text.includes(term));
}

function buildMatchContext(institution, candidate) {
  const titleText = cleanComparableText(candidate.title);
  const descriptionText = cleanComparableText(candidate.description);
  const urlText = cleanComparableText(candidate.url);
  const combinedText = `${titleText} ${descriptionText} ${urlText}`;
  const institutionName = cleanComparableText(institution.nameEn);
  const stateName = cleanComparableText(institution.stateName);
  const stateCode = cleanComparableText(institution.stateCode);
  const nameTokens = institutionName
    .split(" ")
    .filter((token) => token.length >= 4 && token !== "state");
  const matchingNameTokens = nameTokens.filter((token) =>
    combinedText.includes(token),
  );
  const titleHighlyMatches =
    Boolean(institutionName && titleText.includes(institutionName)) ||
    (titleText.includes("state archives") &&
      textContainsAny(titleText, [stateName, stateCode]));
  const titlePartiallyMatches =
    titleHighlyMatches ||
    (titleText.includes("archives") && matchingNameTokens.length >= 1) ||
    (combinedText.includes("state archives") &&
      textContainsAny(combinedText, [stateName, stateCode]));
  const looksRelevant =
    titlePartiallyMatches ||
    combinedText.includes("archives") ||
    combinedText.includes("records management");

  return {
    isGov: isGovUrl(candidate.url),
    titleHighlyMatches,
    titlePartiallyMatches,
    looksRelevant,
  };
}

function getCandidateConfidence(institution, candidate) {
  const context = buildMatchContext(institution, candidate);

  if (context.isGov && context.titleHighlyMatches) {
    return "high";
  }

  if (context.isGov && context.titlePartiallyMatches) {
    return "medium";
  }

  if (!context.isGov && context.looksRelevant) {
    return "low";
  }

  if (context.isGov) {
    return "medium";
  }

  return "low";
}

function filterAndRankCandidates(institution, results) {
  const currentWebsite = normalizeUrl(institution.currentWebsite);
  const seenUrls = new Set();

  return results
    .filter((candidate) => {
      if (!candidate.url || isBlockedDomain(candidate.url)) {
        return false;
      }

      if (currentWebsite && normalizeUrl(candidate.url) === currentWebsite) {
        return false;
      }

      const context = buildMatchContext(institution, candidate);

      return context.looksRelevant || context.isGov;
    })
    .map((candidate) => ({
      ...candidate,
      confidence: getCandidateConfidence(institution, candidate),
      isGov: isGovUrl(candidate.url),
    }))
    .filter((candidate) => {
      const normalizedUrl = normalizeUrl(candidate.url);

      if (seenUrls.has(normalizedUrl)) {
        return false;
      }

      seenUrls.add(normalizedUrl);
      return true;
    })
    .sort((a, b) => {
      const confidenceWeight = { high: 0, medium: 1, low: 2 };
      const govDelta = Number(b.isGov) - Number(a.isGov);

      if (govDelta !== 0) {
        return govDelta;
      }

      return confidenceWeight[a.confidence] - confidenceWeight[b.confidence];
    })
    .slice(0, searchLimit);
}

function suggestionKey(suggestion) {
  return [
    suggestion.targetId,
    suggestion.type,
    normalizeUrl(suggestion.suggestedValue) || suggestion.suggestedValue || "",
  ].join("::");
}

function buildSuggestionId(suggestion) {
  return `suggestion-${suggestion.type}-${suggestion.targetId}-${hashText(
    suggestionKey(suggestion),
  )}`;
}

function createWebsiteSuggestion(institution, candidate, query, createdAt) {
  const suggestion = {
    id: "",
    type: "institution_website_update",
    status: "pending",
    priority: "high",
    targetType: "institution",
    targetId: institution.institutionId,
    title: `修复机构官网链接：${institution.nameZh || institution.nameEn}`,
    currentValue: institution.currentWebsite,
    suggestedValue: candidate.url,
    confidence: candidate.confidence,
    evidence: {
      source: "firecrawl_search",
      query,
      rank: candidate.rank,
      title: candidate.title,
      url: candidate.url,
      description: candidate.description,
      isGov: candidate.isGov,
    },
    reason:
      candidate.confidence === "high"
        ? "Firecrawl Search 返回 .gov 且标题高度匹配的候选官网链接。"
        : candidate.confidence === "medium"
          ? "Firecrawl Search 返回 .gov 或标题部分匹配的候选链接，需要人工确认。"
          : "Firecrawl Search 返回看起来相关的非 .gov 候选链接，需要人工确认。",
    createdAt,
    updatedAt: createdAt,
  };

  return {
    ...suggestion,
    id: buildSuggestionId(suggestion),
  };
}

function createManualSearchSuggestion(institution, query, createdAt, reasonDetail) {
  const suggestion = {
    id: "",
    type: "institution_website_needs_manual_search",
    status: "pending",
    priority: "high",
    targetType: "institution",
    targetId: institution.institutionId,
    title: `人工搜索机构官网：${institution.nameZh || institution.nameEn}`,
    currentValue: institution.currentWebsite,
    suggestedValue: "",
    confidence: "low",
    evidence: {
      source: "firecrawl_search",
      query,
      error: reasonDetail || "",
    },
    reason: reasonDetail
      ? `未找到高可信候选链接，需要人工搜索。${reasonDetail}`
      : "未找到高可信候选链接，需要人工搜索。",
    createdAt,
    updatedAt: createdAt,
  };

  return {
    ...suggestion,
    id: buildSuggestionId(suggestion),
  };
}

function mergeSuggestions(existingSuggestions, candidateSuggestions) {
  const existingKeys = new Set(existingSuggestions.map(suggestionKey));
  const mergedSuggestions = [...existingSuggestions];
  const createdSuggestions = [];

  for (const suggestion of candidateSuggestions) {
    const key = suggestionKey(suggestion);

    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    mergedSuggestions.push(suggestion);
    createdSuggestions.push(suggestion);
  }

  return {
    mergedSuggestions,
    createdSuggestions,
  };
}

function countByConfidence(suggestions, confidence) {
  return suggestions.filter((suggestion) => suggestion.confidence === confidence)
    .length;
}

function createMarkdownReport(report) {
  const lines = [
    `# ArchiveScope 维护 Agent 日报：${report.date}`,
    "",
    `- 检查时间：${report.checkedAt}`,
    `- 404 疑似失效机构链接：${report.notFoundInstitutionCount}`,
    `- 新增建议：${report.suggestionsCreated}`,
    `- 高可信建议：${report.highConfidenceSuggestions}`,
    `- 中可信建议：${report.mediumConfidenceSuggestions}`,
    `- 低可信建议：${report.lowConfidenceSuggestions}`,
    "",
    "## 处理明细",
    "",
  ];

  if (report.items.length === 0) {
    lines.push("暂无 404 疑似失效机构链接。");
    return `${lines.join("\n")}\n`;
  }

  for (const item of report.items) {
    lines.push(`### ${item.nameZh || item.nameEn || item.targetId}`);
    lines.push("");
    lines.push(`- institutionId：${item.targetId}`);
    lines.push(`- 当前官网：${item.currentWebsite || "未记录"}`);
    lines.push(`- 搜索 query：${item.searchQuery}`);
    lines.push(`- 候选数量：${item.candidateCount}`);
    lines.push(`- 新增建议数量：${item.suggestionsCreated}`);

    if (item.searchError) {
      lines.push(`- 搜索异常：${item.searchError}`);
    }

    if (item.suggestions.length > 0) {
      lines.push("- 新增建议：");

      for (const suggestion of item.suggestions) {
        lines.push(
          `  - ${suggestion.type} | ${suggestion.confidence} | ${
            suggestion.suggestedValue || "需要人工搜索"
          }`,
        );
      }
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readJsonObjectOptional(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function getDailyBriefingSummaries() {
  await mkdir(dailyReportDirectory, { recursive: true });

  const fileNames = await readdir(dailyReportDirectory);
  const reportFileNames = fileNames
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .sort()
    .reverse();
  const reports = [];

  for (const fileName of reportFileNames) {
    const reportPath = path.join(dailyReportDirectory, fileName);
    const report = await readJsonObjectOptional(reportPath);

    if (!report) {
      continue;
    }

    const date = stringValue(report.date) || fileName.replace(/\.json$/, "");

    reports.push({
      date,
      checkedAt: stringValue(report.checkedAt),
      title: `ArchiveScope 每日简报：${date}`,
      jsonPath: `src/data/admin/dailyBriefings/${date}.json`,
      markdownPath: `src/data/admin/dailyBriefings/${date}.md`,
      notFoundInstitutionCount: Number(report.notFoundInstitutionCount || 0),
      suggestionsCreated: Number(report.suggestionsCreated || 0),
      highConfidenceSuggestions: Number(report.highConfidenceSuggestions || 0),
      mediumConfidenceSuggestions: Number(report.mediumConfidenceSuggestions || 0),
      lowConfidenceSuggestions: Number(report.lowConfidenceSuggestions || 0),
      itemCount: Array.isArray(report.items) ? report.items.length : 0,
    });
  }

  return reports;
}

function createDailyBriefingReadme(index) {
  const lines = [
    "# ArchiveScope 每日简报",
    "",
    "这个文件夹集中保存 ArchiveScope 维护 Agent 生成的每日简报。",
    "",
    "- JSON 文件用于后台或脚本读取。",
    "- Markdown 文件用于人工快速阅读。",
    "- `index.json` 是所有简报的目录索引，会在生成新简报时自动更新。",
    "",
    `最近更新时间：${index.updatedAt}`,
    `简报总数：${index.reportCount}`,
    "",
    "## 简报列表",
    "",
  ];

  if (index.reports.length === 0) {
    lines.push("暂无简报。");
    return `${lines.join("\n")}\n`;
  }

  for (const report of index.reports) {
    lines.push(`### ${report.date}`);
    lines.push("");
    lines.push(`- 检查时间：${report.checkedAt || "未记录"}`);
    lines.push(`- Markdown：${report.markdownPath}`);
    lines.push(`- JSON：${report.jsonPath}`);
    lines.push(`- 404 疑似失效机构链接：${report.notFoundInstitutionCount}`);
    lines.push(`- 新增建议：${report.suggestionsCreated}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function writeDailyBriefingIndex() {
  const reports = await getDailyBriefingSummaries();
  const index = {
    updatedAt: currentIsoString(),
    reportCount: reports.length,
    latestReport: reports[0] ?? null,
    reports,
  };

  await writeJson(dailyReportIndexPath, index);
  await writeFile(dailyReportReadmePath, createDailyBriefingReadme(index), "utf8");

  return index;
}

async function main() {
  console.log("ArchiveScope 资料库维护 Agent v1");

  if (process.argv.includes("--index-only")) {
    const index = await writeDailyBriefingIndex();

    console.log(`每日简报索引已更新：${dailyReportIndexPath}`);
    console.log(`每日简报 README 已更新：${dailyReportReadmePath}`);
    console.log(`当前简报数量：${index.reportCount}`);
    return;
  }

  console.log("正在读取机构校验报告和机构数据……");

  let auditReport;

  try {
    auditReport = await readJsonObject(institutionAuditReportPath);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const acceptedInstitutions = await readJsonArray(acceptedInstitutionsPath, {
    optional: true,
  });
  const institutionById = buildInstitutionById(acceptedInstitutions);
  const notFoundInstitutions = getNotFoundInstitutionLinks(
    auditReport,
    institutionById,
  );

  console.log(`发现 ${notFoundInstitutions.length} 个 404 机构链接。`);

  const localEnv = await loadLocalEnv();
  const firecrawlApiKey = getEnvValue(localEnv, "FIRECRAWL_API_KEY");
  const firecrawlBaseUrl =
    getEnvValue(localEnv, "FIRECRAWL_BASE_URL") || defaultFirecrawlBaseUrl;
  const searchEndpoint = buildFirecrawlSearchUrl(firecrawlBaseUrl);
  const checkedAt = currentIsoString();
  const date = checkedAt.slice(0, 10);
  const existingSuggestions = await readJsonArray(maintenanceSuggestionsPath, {
    optional: true,
  });
  const candidateSuggestions = [];
  const reportItems = [];

  if (notFoundInstitutions.length > 0 && !firecrawlApiKey) {
    console.error("缺少 FIRECRAWL_API_KEY。");
    console.error(`请在 ${envPath} 中配置后重试。`);
    process.exitCode = 1;
    return;
  }

  console.log(`Firecrawl Search endpoint：${searchEndpoint}`);
  console.log(`已有维护建议数量：${existingSuggestions.length}`);

  for (const institution of notFoundInstitutions) {
    const query = buildSearchQuery(institution);

    console.log("");
    console.log(`当前搜索机构：${institution.nameEn || institution.nameZh}`);
    console.log(`搜索 query：${query}`);

    const searchResult = await searchWithFirecrawl(
      searchEndpoint,
      firecrawlApiKey,
      query,
    );
    const filteredCandidates = filterAndRankCandidates(
      institution,
      searchResult.results,
    );

    console.log(`候选数量：${filteredCandidates.length}`);

    if (!searchResult.ok) {
      console.warn(searchResult.error);
    }

    const suggestionsForInstitution =
      filteredCandidates.length > 0
        ? filteredCandidates.map((candidate) =>
            createWebsiteSuggestion(institution, candidate, query, checkedAt),
          )
        : [
            createManualSearchSuggestion(
              institution,
              query,
              checkedAt,
              searchResult.error,
            ),
          ];

    candidateSuggestions.push(...suggestionsForInstitution);
    reportItems.push({
      targetId: institution.institutionId,
      nameZh: institution.nameZh,
      nameEn: institution.nameEn,
      currentWebsite: institution.currentWebsite,
      searchQuery: query,
      candidateCount: filteredCandidates.length,
      searchError: searchResult.ok ? "" : searchResult.error,
      suggestionsCreated: suggestionsForInstitution.length,
      suggestions: suggestionsForInstitution.map((suggestion) => ({
        id: suggestion.id,
        type: suggestion.type,
        confidence: suggestion.confidence,
        suggestedValue: suggestion.suggestedValue,
        reason: suggestion.reason,
      })),
    });
  }

  const { mergedSuggestions, createdSuggestions } = mergeSuggestions(
    existingSuggestions,
    candidateSuggestions,
  );

  await writeJson(maintenanceSuggestionsPath, mergedSuggestions);

  const dailyReport = {
    date,
    checkedAt,
    notFoundInstitutionCount: notFoundInstitutions.length,
    suggestionsCreated: createdSuggestions.length,
    highConfidenceSuggestions: countByConfidence(createdSuggestions, "high"),
    mediumConfidenceSuggestions: countByConfidence(createdSuggestions, "medium"),
    lowConfidenceSuggestions: countByConfidence(createdSuggestions, "low"),
    items: reportItems.map((item) => ({
      ...item,
      suggestions: item.suggestions.filter((suggestion) =>
        createdSuggestions.some((created) => created.id === suggestion.id),
      ),
      suggestionsCreated: item.suggestions.filter((suggestion) =>
        createdSuggestions.some((created) => created.id === suggestion.id),
      ).length,
    })),
  };
  const jsonReportPath = path.join(dailyReportDirectory, `${date}.json`);
  const markdownReportPath = path.join(dailyReportDirectory, `${date}.md`);

  await writeJson(jsonReportPath, dailyReport);
  await mkdir(dailyReportDirectory, { recursive: true });
  await writeFile(markdownReportPath, createMarkdownReport(dailyReport), "utf8");
  const dailyBriefingIndex = await writeDailyBriefingIndex();

  console.log("");
  console.log(`生成建议数量：${createdSuggestions.length}`);
  console.log(`maintenanceSuggestions 写入：${maintenanceSuggestionsPath}`);
  console.log(`JSON 报告路径：${jsonReportPath}`);
  console.log(`Markdown 报告路径：${markdownReportPath}`);
  console.log(`每日简报索引路径：${dailyReportIndexPath}`);
  console.log(`每日简报总数：${dailyBriefingIndex.reportCount}`);
}

main().catch((error) => {
  console.error("维护 Agent 运行失败。");
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
