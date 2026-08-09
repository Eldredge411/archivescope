"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ResourceDecision =
  | "keep"
  | "needs_enrichment"
  | "needs_review"
  | "exclude"
  | "hidden"
  | "move_to_institution";

type QualityItem = {
  resourceId: string;
  slug?: string;
  titleEn: string;
  titleZh: string;
  sourceDomain: string;
  sourceUrl: string;
  detailUrl?: string;
  missingFields?: string[];
  issueTags?: string[];
  matchedTerms?: string[];
  protectedTerms?: string[];
  suggestedDecision?: string;
  reason?: string;
  status?: string;
  hasOfficialFiles?: boolean;
  officialFileCount?: number;
  fileCount?: number;
  fileTypes?: string[];
  missingFileTypes?: string[];
};

type ResourceQualityReport = {
  generatedAt?: string;
  summary?: Record<string, unknown>;
  missingFields?: unknown;
  suspectIrrelevantResources?: unknown;
  suspectInstitutionResources?: unknown;
  noSnapshotResources?: unknown;
  partialSnapshotResources?: unknown;
  noOfficialFileResources?: unknown;
};

type AdminResourceQualityReviewProps = {
  report: unknown;
  error?: string;
  missing?: boolean;
};

const decisionLabels: Record<ResourceDecision, string> = {
  keep: "保留",
  needs_enrichment: "需完善",
  needs_review: "需复核",
  exclude: "排除",
  hidden: "隐藏出资料库",
  move_to_institution: "应转入机构",
};

const missingFieldLabels: Record<string, string> = {
  titleZh: "缺中文标题",
  summaryShort: "缺短简介",
  summaryZh: "缺中文摘要",
  keyPoints: "缺内容要点",
  researchValue: "缺研究价值",
};

const snapshotStatusLabels: Record<string, string> = {
  none: "无快照",
  partial: "部分快照",
  complete: "完整快照",
};

const statLabels: Array<{ key: string; label: string }> = [
  { key: "acceptedResourcesTotal", label: "资料总数" },
  { key: "visibleCount", label: "前台可见" },
  { key: "hiddenOrExcludedCount", label: "已隐藏 / 排除" },
  { key: "missingTitleZhCount", label: "缺中文标题" },
  { key: "missingSummaryShortCount", label: "缺短简介" },
  { key: "missingSummaryZhCount", label: "缺中文摘要" },
  { key: "missingKeyPointsCount", label: "缺内容要点" },
  { key: "missingResearchValueCount", label: "缺研究价值" },
  { key: "noSnapshotCount", label: "无快照" },
  { key: "partialSnapshotCount", label: "部分快照" },
  { key: "noOfficialFilesCount", label: "无官方文件" },
  { key: "suspectIrrelevantCount", label: "疑似无关" },
  { key: "suspectInstitutionCount", label: "疑似机构" },
];

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function normalizeReport(value: unknown): ResourceQualityReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as ResourceQualityReport;
}

function toQualityItems(value: unknown): QualityItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      slug: stringValue(item.slug),
      titleEn: stringValue(item.titleEn),
      titleZh: stringValue(item.titleZh),
      sourceDomain: stringValue(item.sourceDomain),
      sourceUrl: stringValue(item.sourceUrl),
      detailUrl: stringValue(item.detailUrl),
      missingFields: stringArrayValue(item.missingFields),
      issueTags: stringArrayValue(item.issueTags),
      matchedTerms: stringArrayValue(item.matchedTerms),
      protectedTerms: stringArrayValue(item.protectedTerms),
      suggestedDecision: stringValue(item.suggestedDecision),
      reason: stringValue(item.reason),
      status: stringValue(item.status),
      hasOfficialFiles:
        typeof item.hasOfficialFiles === "boolean"
          ? item.hasOfficialFiles
          : undefined,
      officialFileCount:
        typeof item.officialFileCount === "number"
          ? item.officialFileCount
          : undefined,
      fileCount: typeof item.fileCount === "number" ? item.fileCount : undefined,
      fileTypes: stringArrayValue(item.fileTypes),
      missingFileTypes: stringArrayValue(item.missingFileTypes),
    }))
    .filter((item) => item.resourceId);
}

function getItemTitle(item: QualityItem) {
  return item.titleZh || item.titleEn || item.resourceId;
}

function getDetailUrl(item: QualityItem) {
  return item.detailUrl || (item.slug ? `/resources/${item.slug}` : "");
}

function formatDateTime(value: string) {
  if (!value) {
    return "未生成";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getDecisionPayload(
  decision: ResourceDecision,
): { hiddenFromLibrary: boolean; reason: string } {
  if (decision === "keep") {
    return {
      hiddenFromLibrary: false,
      reason: "人工审核后标记为保留。",
    };
  }

  if (decision === "needs_enrichment") {
    return {
      hiddenFromLibrary: false,
      reason: "该资料内容字段不完整，需要继续完善。",
    };
  }

  if (decision === "needs_review") {
    return {
      hiddenFromLibrary: false,
      reason: "该资料需要进一步人工复核后再决定处置。",
    };
  }

  if (decision === "move_to_institution") {
    return {
      hiddenFromLibrary: true,
      reason: "该条目更适合转入机构模块，先隐藏出资料库。",
    };
  }

  return {
    hiddenFromLibrary: true,
    reason: "人工审核后决定隐藏出资料库。",
  };
}

function buildIssueTags(item: QualityItem, fallbackTags: string[]) {
  const missingTags = (item.missingFields ?? []).map(
    (field) => missingFieldLabels[field] ?? field,
  );
  const snapshotTag =
    item.status && snapshotStatusLabels[item.status]
      ? [snapshotStatusLabels[item.status]]
      : [];
  const officialTag =
    item.hasOfficialFiles === false ? ["无官方文件"] : [];

  return [
    ...fallbackTags,
    ...(item.issueTags ?? []),
    ...missingTags,
    ...snapshotTag,
    ...officialTag,
  ].filter((tag, index, tags) => tag && tags.indexOf(tag) === index);
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {typeof value === "number" || typeof value === "string" ? value : 0}
      </p>
    </div>
  );
}

function IssueSection({
  title,
  description,
  items,
  fallbackTags,
  onDecision,
  loadingKey,
  decisionByResourceId,
}: {
  title: string;
  description: string;
  items: QualityItem[];
  fallbackTags: string[];
  onDecision: (item: QualityItem, decision: ResourceDecision) => void;
  loadingKey: string;
  decisionByResourceId: Record<string, ResourceDecision>;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {items.length} 条
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          暂无该类问题。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const detailUrl = getDetailUrl(item);
            const issueTags = buildIssueTags(item, fallbackTags);
            const currentDecision = decisionByResourceId[item.resourceId];

            return (
              <article
                key={`${title}-${item.resourceId}`}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                      {getItemTitle(item)}
                    </h3>
                    {item.titleEn && item.titleEn !== getItemTitle(item) ? (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {item.titleEn}
                      </p>
                    ) : null}
                    <p className="mt-2 break-all text-xs text-zinc-500 dark:text-zinc-400">
                      {item.resourceId} · {item.sourceDomain || "未知来源"}
                    </p>
                  </div>
                  {currentDecision ? (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      已标记：{decisionLabels[currentDecision]}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {issueTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {item.reason ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {item.reason}
                  </p>
                ) : null}

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-2 dark:text-zinc-400">
                  <p className="break-all">sourceUrl：{item.sourceUrl || "未记录"}</p>
                  {item.matchedTerms?.length ? (
                    <p>命中关键词：{item.matchedTerms.join(" / ")}</p>
                  ) : null}
                  {item.missingFileTypes?.length ? (
                    <p>缺少快照：{item.missingFileTypes.join(" / ")}</p>
                  ) : null}
                  {typeof item.officialFileCount === "number" ? (
                    <p>官方文件数量：{item.officialFileCount}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {detailUrl ? (
                    <Link
                      href={detailUrl}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      查看资料详情
                    </Link>
                  ) : null}
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      打开官方链接
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  {(
                    [
                      "keep",
                      "needs_enrichment",
                      "needs_review",
                      "hidden",
                      "move_to_institution",
                    ] satisfies ResourceDecision[]
                  ).map((decision) => {
                    const actionKey = `${item.resourceId}:${decision}`;
                    const isLoading = loadingKey === actionKey;

                    return (
                      <button
                        key={decision}
                        type="button"
                        onClick={() => onDecision(item, decision)}
                        disabled={Boolean(loadingKey)}
                        className={
                          decision === "hidden" ||
                          decision === "move_to_institution"
                            ? "rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            : "rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        }
                      >
                        {isLoading ? "保存中..." : `标记${decisionLabels[decision]}`}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AdminResourceQualityReview({
  report,
  error = "",
  missing = false,
}: AdminResourceQualityReviewProps) {
  const normalizedReport = normalizeReport(report);
  const [loadingKey, setLoadingKey] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionByResourceId, setDecisionByResourceId] = useState<
    Record<string, ResourceDecision>
  >({});

  const sections = useMemo(() => {
    const missingItems = toQualityItems(normalizedReport?.missingFields);
    const suspectIrrelevantItems = toQualityItems(
      normalizedReport?.suspectIrrelevantResources,
    );
    const suspectInstitutionItems = toQualityItems(
      normalizedReport?.suspectInstitutionResources,
    );
    const snapshotIssueItems = [
      ...toQualityItems(normalizedReport?.noSnapshotResources),
      ...toQualityItems(normalizedReport?.partialSnapshotResources),
    ];
    const noOfficialFileItems = toQualityItems(
      normalizedReport?.noOfficialFileResources,
    );

    return {
      missingItems,
      suspectIrrelevantItems,
      suspectInstitutionItems,
      snapshotIssueItems,
      noOfficialFileItems,
    };
  }, [normalizedReport]);

  async function handleDecision(item: QualityItem, decision: ResourceDecision) {
    const actionKey = `${item.resourceId}:${decision}`;
    const payload = getDecisionPayload(decision);

    setLoadingKey(actionKey);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/resource-curation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: item.resourceId,
          decision,
          hiddenFromLibrary: payload.hiddenFromLibrary,
          reason: payload.reason,
        }),
      });
      const responseBody = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || responseBody.success === false) {
        throw new Error(responseBody.error || "资料处置决策保存失败。");
      }

      setDecisionByResourceId((current) => ({
        ...current,
        [item.resourceId]: decision,
      }));
      setMessage(
        payload.hiddenFromLibrary
          ? "已记录决策。该资料将隐藏出资料库；请重新运行 npm run resources:audit 刷新审计报告。"
          : "已记录决策；请重新运行 npm run resources:audit 刷新审计报告。",
      );
    } catch (decisionError) {
      setErrorMessage(
        decisionError instanceof Error
          ? decisionError.message
          : "资料处置决策保存失败。",
      );
    } finally {
      setLoadingKey("");
    }
  }

  if (missing) {
    return (
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            尚未生成资料质量审计报告，请先运行 npm run resources:audit。
          </p>
        </div>
      </section>
    );
  }

  if (error || !normalizedReport) {
    return (
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
            资料质量审计报告读取失败：{error || "报告格式异常。"}
          </p>
        </div>
      </section>
    );
  }

  const summary = normalizedReport.summary ?? {};

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          报告生成时间：{formatDateTime(stringValue(normalizedReport.generatedAt))}
          。人工标记会写入 resourceCurationDecisions.json，不会修改原始导入资料。
        </div>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statLabels.map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={summary[stat.key]}
            />
          ))}
        </div>

        <IssueSection
          title="缺失字段资料"
          description="这些资料缺少中文标题、短简介、摘要、内容要点或研究价值，适合优先进入 AI enrichment 或人工完善流程。"
          items={sections.missingItems}
          fallbackTags={["字段不完整"]}
          onDecision={handleDecision}
          loadingKey={loadingKey}
          decisionByResourceId={decisionByResourceId}
        />

        <IssueSection
          title="疑似无关资料"
          description="这些资料命中任命、人员、一般信息收集、普通公告等关键词，可能与档案资源建设关系较弱。"
          items={sections.suspectIrrelevantItems}
          fallbackTags={["疑似无关"]}
          onDecision={handleDecision}
          loadingKey={loadingKey}
          decisionByResourceId={decisionByResourceId}
        />

        <IssueSection
          title="疑似机构资料"
          description="这些资料标题命中机构类关键词，可能更适合转入机构导航，而不是作为资料库条目展示。"
          items={sections.suspectInstitutionItems}
          fallbackTags={["疑似机构"]}
          onDecision={handleDecision}
          loadingKey={loadingKey}
          decisionByResourceId={decisionByResourceId}
        />

        <IssueSection
          title="无快照 / 部分快照资料"
          description="这些资料缺少本站 PDF、网页截图或其他来源快照，后续可进入 snapshot 生成和校验流程。"
          items={sections.snapshotIssueItems}
          fallbackTags={["快照问题"]}
          onDecision={handleDecision}
          loadingKey={loadingKey}
          decisionByResourceId={decisionByResourceId}
        />

        <IssueSection
          title="无官方文件资料"
          description="这些资料尚未关联当前有效文本、官方文件或权威可读来源。法规类资料尤其建议优先补充。"
          items={sections.noOfficialFileItems}
          fallbackTags={["无官方文件"]}
          onDecision={handleDecision}
          loadingKey={loadingKey}
          decisionByResourceId={decisionByResourceId}
        />
      </div>
    </section>
  );
}
