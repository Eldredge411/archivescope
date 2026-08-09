import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";
import type { ResourceDraft } from "@/types/ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const manualUrlDraftsPath = join(
  process.cwd(),
  "src/data/drafts/us/manualUrlDrafts.json",
);
const draftReviewInsightsPath = join(
  process.cwd(),
  "src/data/imports/us/draftReviewInsights.json",
);

const requestTimeoutMs = 25000;

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "manual-url-resource";
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
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
  });
}

function cleanText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(tag: string, attributeName: string) {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);

  return decodeHtmlEntities(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function extractMetaContent(
  html: string,
  matcher: (value: { name: string; property: string; itemprop: string }) => boolean,
) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const name = getAttribute(tag, "name").toLowerCase();
    const property = getAttribute(tag, "property").toLowerCase();
    const itemprop = getAttribute(tag, "itemprop").toLowerCase();

    if (!matcher({ name, property, itemprop })) {
      continue;
    }

    const content = cleanText(getAttribute(tag, "content"));

    if (content) {
      return content;
    }
  }

  return "";
}

function extractTitle(html: string, url: string) {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(titleMatch?.[1] ?? "");
  const ogTitle = extractMetaContent(
    html,
    ({ property }) => property === "og:title",
  );

  return title || ogTitle || url;
}

function extractParagraphs(html: string) {
  const paragraphs: string[] = [];
  const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = paragraphPattern.exec(html))) {
    const text = cleanText(match[1] ?? "");

    if (text.length >= 40 && !paragraphs.includes(text)) {
      paragraphs.push(text);
    }

    if (paragraphs.length >= 8) {
      break;
    }
  }

  return paragraphs;
}

function extractDescription(html: string, paragraphs: string[]) {
  return (
    extractMetaContent(
      html,
      ({ name }) => name === "description" || name === "dc.description",
    ) ||
    extractMetaContent(html, ({ property }) => property === "og:description") ||
    paragraphs.slice(0, 2).join(" ")
  );
}

function inferResourceType(title: string, url: string) {
  const text = `${title} ${url}`.toLowerCase();

  if (text.includes("catalog") || text.includes("database")) {
    return "database";
  }

  if (text.includes("report") || text.includes("annual")) {
    return "report";
  }

  if (text.includes("policy") || text.includes("strategic plan")) {
    return "strategy";
  }

  if (text.includes("guide") || text.includes("guidance") || text.includes("handbook")) {
    return "guidance";
  }

  return "portal";
}

function inferTopicIds(title: string, url: string, description: string) {
  const text = `${title} ${url} ${description}`.toLowerCase();

  if (
    text.includes("electronic record") ||
    text.includes("records management") ||
    text.includes("federal records")
  ) {
    return {
      primaryTopicId: "electronic-records-management",
      topicIds: ["electronic-records-management"],
    };
  }

  if (
    text.includes("digital") ||
    text.includes("preservation") ||
    text.includes("digitization")
  ) {
    return {
      primaryTopicId: "digital-resources-preservation",
      topicIds: ["digital-resources-preservation"],
    };
  }

  if (
    text.includes("education") ||
    text.includes("research") ||
    text.includes("access") ||
    text.includes("foia")
  ) {
    return {
      primaryTopicId: "access-outreach-public-participation",
      topicIds: ["access-outreach-public-participation"],
    };
  }

  return {
    primaryTopicId: "laws-policies-governance",
    topicIds: ["laws-policies-governance"],
  };
}

function inferInstitutionId(hostname: string) {
  if (hostname === "archives.gov" || hostname.endsWith(".archives.gov")) {
    return "nara";
  }

  if (hostname === "loc.gov" || hostname.endsWith(".loc.gov")) {
    return "library-of-congress";
  }

  return "nara";
}

function inferTargetEntityType(title: string, url: string) {
  const text = `${title} ${url}`.toLowerCase();
  const institutionTerms = [
    "center",
    "library",
    "museum",
    "association",
    "office",
    "institute",
    "institution",
  ];

  return institutionTerms.some((term) => text.includes(term))
    ? "institution"
    : "resource";
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(stringValue).filter(Boolean))];
}

async function readJsonArray<T>(filePath: string) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeJsonArray(filePath: string, data: unknown[]) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildDraftId(url: string, title: string) {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);

  return `manual-url-${slugify(title).slice(0, 48)}-${hash}`;
}

function buildRuleInsight(draft: ResourceDraft, description: string) {
  const now = new Date().toISOString();

  return {
    draftId: draft.id,
    draftSourceKey: "manual-url",
    titleZh: draft.titleZh || "",
    summaryShort:
      description ||
      `该候选条目由管理员粘贴网址生成，来自 ${draft.sourceDomain || "外部网站"}，建议人工复核后决定是否收录。`,
    suggestedEntityType: draft.targetEntityType || "resource",
    suggestedResourceType: draft.resourceType || "portal",
    suggestedInstitutionGroup: "",
    suggestedInstitutionType: "",
    suggestedPrimaryTopicId: draft.primaryTopicId || "",
    suggestedTopicIds: draft.topicIds,
    suggestedTags: draft.tags,
    relevanceScore: draft.sourceDomain?.includes("archives.gov") ? 85 : 65,
    recommendation: "review",
    reason: "该条目由后台粘贴网址生成，已提取网页标题和简介，建议人工确认其与档案资源建设的相关性。",
    warningFlags: [],
    generatedBy: "rule",
    reviewStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ArchiveScope URL Collector/0.1",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    const html = await response.text();

    if (!response.ok) {
      throw new Error(`网页读取失败，HTTP ${response.status}。`);
    }

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("请求体不是有效 JSON。");
  }

  const rawUrl = stringValue(body.url);
  const notes = stringValue(body.notes);
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return jsonError("请输入有效的网址。");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return jsonError("只支持 http 或 https 网址。");
  }

  const url = parsedUrl.toString();
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  try {
    const html = await fetchHtml(url);
    const paragraphs = extractParagraphs(html);
    const title = extractTitle(html, url);
    const description = extractDescription(html, paragraphs);
    const { primaryTopicId, topicIds } = inferTopicIds(title, url, description);
    const now = new Date().toISOString();
    const draftId = buildDraftId(url, title);
    const existingDrafts = await readJsonArray<ResourceDraft>(manualUrlDraftsPath);
    const existingDraft = existingDrafts.find(
      (draft) => stringValue(draft.sourceUrl) === url || draft.id === draftId,
    );

    if (existingDraft) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "该网址已经在候选草稿中。",
        draft: existingDraft,
      });
    }

    const resourceType = inferResourceType(title, url);
    const draft: ResourceDraft = {
      id: draftId,
      sourceId: "manual-url",
      sourceType: "manual",
      titleEn: title,
      titleZh: "",
      slug: slugify(title),
      countryId: "usa",
      institutionId: inferInstitutionId(hostname),
      resourceType,
      primaryTopicId,
      topicIds,
      tags: uniqueStrings([
        hostname,
        "手动添加",
        "网页候选",
        resourceType,
        ...title.split(/\s+/).slice(0, 4),
      ]),
      language: "English",
      summaryZh: "",
      keyPoints: [],
      researchValue: "",
      sourceUrl: url,
      sourceDomain: hostname,
      accessDate: formatDate(),
      linkStatus: "ok",
      hasBackup: false,
      backupVisibility: "private",
      archivedUrl: "",
      versioningApplicable: false,
      targetEntityType: inferTargetEntityType(title, url),
      entityTypeConfidence: "medium",
      classificationReason: "由后台粘贴网址生成，规则初步判断，建议人工复核。",
      reviewStatus: "pending",
      rawData: {
        manualUrlNotes: notes,
        description,
        excerpts: paragraphs,
        fetchedAt: now,
        contentLength: html.length,
      },
      createdAt: now,
      updatedAt: now,
    };
    const nextDrafts = [draft, ...existingDrafts];

    await writeJsonArray(manualUrlDraftsPath, nextDrafts);

    const insights = await readJsonArray<Record<string, unknown>>(
      draftReviewInsightsPath,
    );
    const insight = buildRuleInsight(draft, description);
    const nextInsights = [
      insight,
      ...insights.filter(
        (item) =>
          stringValue(item.draftId) !== draft.id ||
          stringValue(item.draftSourceKey) !== "manual-url",
      ),
    ];

    await writeJsonArray(draftReviewInsightsPath, nextInsights);

    return NextResponse.json({
      success: true,
      duplicate: false,
      message: "已生成候选草稿，可进入草稿审核。",
      draft,
      insight,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error && error.name === "AbortError"
        ? "网页读取超时，请稍后重试。"
        : error instanceof Error
          ? error.message
          : String(error);

    return jsonError(`网址采集失败：${errorMessage}`, 500);
  }
}
