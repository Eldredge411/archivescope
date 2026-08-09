import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";
import type { ResourceDraft } from "@/types/ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DraftSource = {
  sourceKey: string;
  filePath: string;
  labelZh: string;
};

type DraftReviewInsight = {
  draftId: string;
  draftSourceKey: string;
  titleZh: string;
  summaryShort: string;
  suggestedEntityType: "resource" | "institution" | "exclude" | "unknown";
  suggestedResourceType: string;
  suggestedInstitutionGroup: string;
  suggestedInstitutionType: string;
  suggestedPrimaryTopicId: string;
  suggestedTopicIds: string[];
  suggestedTags: string[];
  relevanceScore: number;
  recommendation: "accept" | "review" | "reject";
  reason: string;
  warningFlags: Array<
    | "administrative_notice"
    | "personnel_change"
    | "generic_clearance"
    | "meeting_notice"
    | "weak_relevance"
    | "possible_institution"
    | "duplicate"
  >;
  generatedBy: "ai";
  reviewStatus: "pending";
  createdAt: string;
  updatedAt: string;
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

const envPath = join(process.cwd(), ".env.local");
const draftReviewInsightsPath = join(
  process.cwd(),
  "src/data/imports/us/draftReviewInsights.json",
);

const allowedEntityTypes = ["resource", "institution", "exclude", "unknown"] as const;
const allowedRecommendations = ["accept", "review", "reject"] as const;
const allowedWarningFlags = [
  "administrative_notice",
  "personnel_change",
  "generic_clearance",
  "meeting_notice",
  "weak_relevance",
  "possible_institution",
  "duplicate",
] as const;
const allowedTopicIds = [
  "laws-policies-governance",
  "electronic-records-management",
  "digital-resources-preservation",
  "access-outreach-public-participation",
  "ai-emerging-technologies",
  "social-actors-service-ecosystem",
] as const;

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
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

function parseEnvFile(content: string) {
  const env: Record<string, string> = {};

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

async function loadAiConfig() {
  let localEnv: Record<string, string> = {};

  try {
    localEnv = parseEnvFile(await readFile(envPath, "utf8"));
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
    ) {
      throw error;
    }
  }

  const config = {
    AI_API_KEY: stringValue(localEnv.AI_API_KEY ?? process.env.AI_API_KEY),
    AI_BASE_URL: stringValue(localEnv.AI_BASE_URL ?? process.env.AI_BASE_URL),
    AI_MODEL: stringValue(localEnv.AI_MODEL ?? process.env.AI_MODEL),
  };

  if (!config.AI_API_KEY || !config.AI_BASE_URL || !config.AI_MODEL) {
    return null;
  }

  return config;
}

function buildChatCompletionsUrl(baseUrl: string) {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/chat/completions")) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/chat/completions`;
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

async function findDraft(draftId: string, draftSourceKey: string) {
  const source = draftSources.find((item) => item.sourceKey === draftSourceKey);

  if (!source) {
    throw new Error("草稿来源不在允许范围内。");
  }

  const drafts = await readJsonArray<ResourceDraft>(source.filePath);
  const draft = drafts.find((item) => item.id === draftId);

  if (!draft) {
    throw new Error("未找到对应草稿。");
  }

  return {
    draft,
    source,
  };
}

function truncateText(value: unknown, maxLength = 3000) {
  const text = stringValue(value);

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildPrompt(draft: ResourceDraft, source: DraftSource) {
  return `请为 ArchiveScope 管理后台生成单条采集草稿的审核辅助信息。

你要帮助管理员判断：
1. 这是什么？
2. 是否值得收录？
3. 应该放入资料库还是机构库？
4. 如果是资料，应属于哪个专题？
5. 如果是机构，应属于哪个机构分组？
6. 是否是行政通知、人员任免、信息收集公告等低价值内容？

请严格输出 JSON，不要输出解释文字，不要使用 Markdown 代码块。
不要编造草稿中没有的信息；不确定时 recommendation 使用 "review"。

可选 suggestedEntityType：resource / institution / exclude / unknown
可选 recommendation：accept / review / reject
可选 suggestedPrimaryTopicId 和 suggestedTopicIds 只能来自：
${allowedTopicIds.map((topicId) => `- ${topicId}`).join("\n")}

可选 warningFlags：
- administrative_notice
- personnel_change
- generic_clearance
- meeting_notice
- weak_relevance
- possible_institution
- duplicate

输出 JSON 字段必须为：
{
  "titleZh": "",
  "summaryShort": "",
  "suggestedEntityType": "resource",
  "suggestedResourceType": "",
  "suggestedInstitutionGroup": "",
  "suggestedInstitutionType": "",
  "suggestedPrimaryTopicId": "",
  "suggestedTopicIds": [],
  "suggestedTags": [],
  "relevanceScore": 0,
  "recommendation": "review",
  "reason": "",
  "warningFlags": []
}

字段要求：
- titleZh：中文译名，简洁准确；若标题本身是机构名，要译为机构名称。
- summaryShort：50-120 字中文说明，说明该条目是什么、为什么建议收录/复核/拒绝。
- suggestedEntityType：如果是中心、图书馆、博物馆、协会、办公室、研究所等机构页，优先 institution；如果是普通行政通知或弱相关公告，使用 exclude 或 unknown。
- suggestedResourceType：如果是法规/规则用 law；具体指南用 guidance；资源门户、专题入口、栏目页或资源集合页用 portal；具体系统平台用 system；项目用 program；数据库/目录用 database；不确定可沿用原 resourceType。
- suggestedInstitutionGroup：federal / state / social / academic / commercial / other。
- suggestedInstitutionType：archives / library / museum / association / government / research / company / nonprofit / other。
- relevanceScore：0-100，越高越值得收录。
- recommendation：accept / review / reject。
- reason：用中文说明判断理由，指出是否命中行政通知、人员变动、信息收集公告等低价值信号。

草稿来源：
draftSourceKey: ${source.sourceKey}
draftSourceLabelZh: ${source.labelZh}

草稿字段：
id: ${draft.id}
titleEn: ${draft.titleEn || ""}
titleZh: ${draft.titleZh || ""}
sourceUrl: ${draft.sourceUrl || ""}
sourceDomain: ${draft.sourceDomain || ""}
resourceType: ${draft.resourceType || ""}
primaryTopicId: ${draft.primaryTopicId || ""}
topicIds: ${JSON.stringify(draft.topicIds ?? [])}
tags: ${JSON.stringify(draft.tags ?? [])}
summaryZh: ${draft.summaryZh || ""}
researchValue: ${draft.researchValue || ""}
rawData: ${truncateText(JSON.stringify(draft.rawData ?? {}), 3000)}`;
}

async function callAi(config: NonNullable<Awaited<ReturnType<typeof loadAiConfig>>>, prompt: string) {
  const response = await fetch(buildChatCompletionsUrl(config.AI_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是 ArchiveScope 的中文档案学资料审核助手，负责判断采集草稿是否应进入资料库或机构库。请只依据用户提供的草稿信息生成 JSON。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`AI API 请求失败：HTTP ${response.status}: ${responseText}`);
  }

  const responseJson = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  };
  const message = responseJson.choices?.[0]?.message;
  const content =
    typeof message?.content === "string" && message.content.trim()
      ? message.content
      : typeof message?.reasoning_content === "string" &&
          message.reasoning_content.trim()
        ? message.reasoning_content
        : "";

  if (!content.trim()) {
    throw new Error("AI API 响应缺少内容。");
  }

  return content;
}

function extractJsonFromAiContent(content: string) {
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

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  const text = stringValue(value);

  return allowed.includes(text as T) ? (text as T) : fallback;
}

function isAllowedTopicId(value: string): value is (typeof allowedTopicIds)[number] {
  return (allowedTopicIds as readonly string[]).includes(value);
}

function normalizeTopics(primaryTopicId: string, topicIds: unknown) {
  const normalizedPrimaryTopicId = enumValue(
    primaryTopicId,
    allowedTopicIds,
    "laws-policies-governance",
  );
  const topics = stringArrayValue(topicIds).filter((topicId) =>
    isAllowedTopicId(topicId),
  );

  return [...new Set([normalizedPrimaryTopicId, ...topics])];
}

function normalizeInsight(
  draft: ResourceDraft,
  source: DraftSource,
  parsed: Record<string, unknown>,
  existingInsight?: Partial<DraftReviewInsight>,
): DraftReviewInsight {
  const now = new Date().toISOString();
  const suggestedPrimaryTopicId = enumValue(
    parsed.suggestedPrimaryTopicId,
    allowedTopicIds,
    draft.primaryTopicId && isAllowedTopicId(draft.primaryTopicId)
      ? draft.primaryTopicId
      : "laws-policies-governance",
  );

  return {
    draftId: draft.id,
    draftSourceKey: source.sourceKey,
    titleZh: stringValue(parsed.titleZh || draft.titleZh),
    summaryShort: stringValue(parsed.summaryShort),
    suggestedEntityType: enumValue(
      parsed.suggestedEntityType,
      allowedEntityTypes,
      "unknown",
    ),
    suggestedResourceType: stringValue(parsed.suggestedResourceType || draft.resourceType),
    suggestedInstitutionGroup: stringValue(parsed.suggestedInstitutionGroup),
    suggestedInstitutionType: stringValue(parsed.suggestedInstitutionType),
    suggestedPrimaryTopicId,
    suggestedTopicIds: normalizeTopics(suggestedPrimaryTopicId, parsed.suggestedTopicIds),
    suggestedTags: stringArrayValue(parsed.suggestedTags).slice(0, 12),
    relevanceScore: Math.max(
      0,
      Math.min(100, Math.round(Number(parsed.relevanceScore) || 0)),
    ),
    recommendation: enumValue(
      parsed.recommendation,
      allowedRecommendations,
      "review",
    ),
    reason: stringValue(parsed.reason),
    warningFlags: stringArrayValue(parsed.warningFlags)
      .filter((flag): flag is DraftReviewInsight["warningFlags"][number] =>
        (allowedWarningFlags as readonly string[]).includes(flag),
      )
      .slice(0, 8) as DraftReviewInsight["warningFlags"],
    generatedBy: "ai",
    reviewStatus: "pending",
    createdAt: existingInsight?.createdAt || now,
    updatedAt: now,
  };
}

async function upsertInsight(insight: DraftReviewInsight) {
  const insights = await readJsonArray<Partial<DraftReviewInsight>>(
    draftReviewInsightsPath,
  );
  const existingIndex = insights.findIndex(
    (item) =>
      stringValue(item.draftId) === insight.draftId &&
      stringValue(item.draftSourceKey) === insight.draftSourceKey,
  );

  if (existingIndex >= 0) {
    insights[existingIndex] = {
      ...insights[existingIndex],
      ...insight,
    };
  } else {
    insights.push(insight);
  }

  await mkdir(dirname(draftReviewInsightsPath), { recursive: true });
  await writeFile(
    draftReviewInsightsPath,
    `${JSON.stringify(insights, null, 2)}\n`,
    "utf8",
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("请求体不是有效 JSON。");
  }

  const draftId = stringValue(body.draftId);
  const draftSourceKey = stringValue(body.draftSourceKey);

  if (!draftId || !draftSourceKey) {
    return jsonError("缺少 draftId 或 draftSourceKey。");
  }

  const aiConfig = await loadAiConfig();

  if (!aiConfig) {
    return jsonError("未配置 AI API，无法生成审核辅助信息。", 400);
  }

  try {
    const { draft, source } = await findDraft(draftId, draftSourceKey);
    const existingInsights = await readJsonArray<Partial<DraftReviewInsight>>(
      draftReviewInsightsPath,
    );
    const existingInsight = existingInsights.find(
      (item) =>
        stringValue(item.draftId) === draftId &&
        stringValue(item.draftSourceKey) === draftSourceKey,
    );
    const aiContent = await callAi(aiConfig, buildPrompt(draft, source));
    const parsed = JSON.parse(extractJsonFromAiContent(aiContent)) as Record<
      string,
      unknown
    >;
    const insight = normalizeInsight(draft, source, parsed, existingInsight);

    await upsertInsight(insight);

    return NextResponse.json({
      success: true,
      insight,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "生成审核辅助信息失败。",
      500,
    );
  }
}
