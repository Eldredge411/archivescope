"use client";

import { useEffect, useMemo, useState } from "react";
import { resourceTypeZh } from "@/lib/display";
import type {
  DraftReviewStatus,
  EntityTypeConfidence,
  ResourceDraft,
  TargetEntityType,
} from "@/types/ingestion";

type FilterValue = "all" | string;
type SuggestedEntityType = "resource" | "institution" | "exclude" | "unknown";
type DraftInsightRecommendation = "accept" | "review" | "reject";
type DraftReviewWarningFlag =
  | "administrative_notice"
  | "personnel_change"
  | "generic_clearance"
  | "meeting_notice"
  | "weak_relevance"
  | "possible_institution"
  | "duplicate";

type DraftReviewInsight = {
  draftId: string;
  draftSourceKey: string;
  titleZh: string;
  summaryShort: string;
  suggestedEntityType: SuggestedEntityType;
  suggestedResourceType: string;
  suggestedInstitutionGroup: string;
  suggestedInstitutionType: string;
  suggestedPrimaryTopicId: string;
  suggestedTopicIds: string[];
  suggestedTags: string[];
  relevanceScore: number;
  recommendation: DraftInsightRecommendation;
  reason: string;
  warningFlags: DraftReviewWarningFlag[];
  generatedBy: string;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string;
};

type AdminResourceDraft = ResourceDraft & {
  draftSourceKey?: string;
  draftSourceLabelZh?: string;
  reviewInsight?: DraftReviewInsight | null;
};

type BulkUpdateResponse = {
  success?: boolean;
  updatedCount: number;
  failedItems: Array<{
    id?: string;
    draftSourceKey?: string;
    message: string;
  }>;
  updatedItems: AdminResourceDraft[];
};

type DraftInsightApiResponse = {
  success?: boolean;
  error?: string;
  insight?: unknown;
};

type DraftsApiErrorResponse = {
  success?: false;
  error?: string;
  message?: string;
  drafts?: unknown;
};

const draftSourceOptions = [
  { sourceKey: "federal-register", labelZh: "Federal Register" },
  { sourceKey: "nara-web", labelZh: "NARA 官网" },
  { sourceKey: "nara-catalog", labelZh: "NARA Catalog" },
];

const reviewStatusOptions: Array<{
  value: DraftReviewStatus;
  label: string;
}> = [
  { value: "pending", label: "待审核" },
  { value: "accepted", label: "已接受" },
  { value: "rejected", label: "已拒绝" },
  { value: "needs_review", label: "需进一步审核" },
  { value: "published", label: "已发布" },
];

const reviewStatusZh: Record<DraftReviewStatus, string> = {
  pending: "待审核",
  accepted: "已接受",
  rejected: "已拒绝",
  needs_review: "需进一步审核",
  published: "已发布",
};

const reviewStatusBadge: Record<DraftReviewStatus, string> = {
  pending:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  accepted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  needs_review:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  published:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const targetEntityTypeOptions: Array<{
  value: Exclude<TargetEntityType, "unknown">;
  label: string;
}> = [
  { value: "resource", label: "资料库" },
  { value: "institution", label: "机构" },
];

const targetEntityTypeZh: Record<TargetEntityType, string> = {
  resource: "资料库",
  institution: "机构",
  unknown: "未判断",
};

const suggestedEntityTypeZh: Record<SuggestedEntityType, string> = {
  resource: "资料库",
  institution: "机构",
  exclude: "暂不收录",
  unknown: "未知",
};

const recommendationZh: Record<DraftInsightRecommendation, string> = {
  accept: "建议收录",
  review: "建议复核",
  reject: "建议拒绝",
};

const recommendationBadge: Record<DraftInsightRecommendation, string> = {
  accept:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  review:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  reject: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const warningFlagZh: Record<DraftReviewWarningFlag, string> = {
  administrative_notice: "行政通知",
  personnel_change: "人员变动",
  generic_clearance: "信息收集公告",
  meeting_notice: "会议通知",
  weak_relevance: "相关性较弱",
  possible_institution: "疑似机构",
  duplicate: "疑似重复",
};

const targetEntityTypeBadge: Record<TargetEntityType, string> = {
  resource:
    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  institution:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  unknown: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const entityTypeConfidenceZh: Record<EntityTypeConfidence, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

type ReviewActionTone = "emerald" | "violet" | "rose" | "amber" | "zinc";

function getDraftSelectionKey(draft: AdminResourceDraft) {
  if (!draft.id) {
    return "";
  }

  return `${draft.draftSourceKey ?? draft.sourceId}:${draft.id}`;
}

function canSelectDraft(draft: AdminResourceDraft) {
  return Boolean(draft.id);
}

const topicLabels: Record<string, string> = {
  "laws-policies-governance": "法规政策与制度治理",
  "electronic-records-management": "电子文件与记录管理",
  "digital-resources-preservation": "数字资源建设与长期保存",
  "access-outreach-public-participation": "开放利用、展览教育与公众参与",
  "ai-emerging-technologies": "AI 与新兴技术实践",
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function normalizeReviewStatus(value: unknown): DraftReviewStatus {
  const normalizedValue = stringValue(value);

  return reviewStatusOptions.some((status) => status.value === normalizedValue)
    ? (normalizedValue as DraftReviewStatus)
    : "pending";
}

function normalizeTargetEntityType(value: unknown): TargetEntityType {
  const normalizedValue = stringValue(value);

  return normalizedValue === "resource" ||
    normalizedValue === "institution" ||
    normalizedValue === "unknown"
    ? normalizedValue
    : "unknown";
}

function normalizeEntityTypeConfidence(value: unknown): EntityTypeConfidence {
  const normalizedValue = stringValue(value);

  return normalizedValue === "high" ||
    normalizedValue === "medium" ||
    normalizedValue === "low"
    ? normalizedValue
    : "low";
}

function normalizeSuggestedEntityType(value: unknown): SuggestedEntityType {
  const normalizedValue = stringValue(value);

  return normalizedValue === "resource" ||
    normalizedValue === "institution" ||
    normalizedValue === "exclude" ||
    normalizedValue === "unknown"
    ? normalizedValue
    : "unknown";
}

function normalizeInsightRecommendation(value: unknown): DraftInsightRecommendation {
  const normalizedValue = stringValue(value);

  return normalizedValue === "accept" ||
    normalizedValue === "review" ||
    normalizedValue === "reject"
    ? normalizedValue
    : "review";
}

function normalizeWarningFlags(value: unknown): DraftReviewWarningFlag[] {
  const allowedFlags = new Set(Object.keys(warningFlagZh));

  return stringArrayValue(value).filter((flag): flag is DraftReviewWarningFlag =>
    allowedFlags.has(flag),
  );
}

function normalizeDraftReviewInsight(value: unknown): DraftReviewInsight | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const relevanceScore = Number(record.relevanceScore);

  return {
    draftId: stringValue(record.draftId),
    draftSourceKey: stringValue(record.draftSourceKey),
    titleZh: stringValue(record.titleZh),
    summaryShort: stringValue(record.summaryShort),
    suggestedEntityType: normalizeSuggestedEntityType(record.suggestedEntityType),
    suggestedResourceType: stringValue(record.suggestedResourceType),
    suggestedInstitutionGroup: stringValue(record.suggestedInstitutionGroup),
    suggestedInstitutionType: stringValue(record.suggestedInstitutionType),
    suggestedPrimaryTopicId: stringValue(record.suggestedPrimaryTopicId),
    suggestedTopicIds: stringArrayValue(record.suggestedTopicIds),
    suggestedTags: stringArrayValue(record.suggestedTags),
    relevanceScore: Number.isFinite(relevanceScore)
      ? Math.max(0, Math.min(100, Math.round(relevanceScore)))
      : 0,
    recommendation: normalizeInsightRecommendation(record.recommendation),
    reason: stringValue(record.reason),
    warningFlags: normalizeWarningFlags(record.warningFlags),
    generatedBy: stringValue(record.generatedBy),
    reviewStatus: stringValue(record.reviewStatus),
    createdAt: stringValue(record.createdAt),
    updatedAt: stringValue(record.updatedAt),
  };
}

function normalizeDraft(draft: unknown): AdminResourceDraft {
  const draftRecord =
    draft && typeof draft === "object" ? (draft as Record<string, unknown>) : {};
  const rawData = draftRecord.rawData;

  return {
    id: stringValue(draftRecord.id),
    sourceId: stringValue(draftRecord.sourceId),
    sourceType: stringValue(draftRecord.sourceType) as AdminResourceDraft["sourceType"],
    titleEn: stringValue(draftRecord.titleEn),
    titleZh: stringValue(draftRecord.titleZh),
    slug: stringValue(draftRecord.slug),
    countryId: stringValue(draftRecord.countryId),
    institutionId: stringValue(draftRecord.institutionId),
    resourceType: stringValue(
      draftRecord.resourceType,
    ) as AdminResourceDraft["resourceType"],
    primaryTopicId: stringValue(draftRecord.primaryTopicId),
    topicIds: stringArrayValue(draftRecord.topicIds),
    tags: stringArrayValue(draftRecord.tags),
    language: stringValue(draftRecord.language),
    summaryZh: stringValue(draftRecord.summaryZh),
    keyPoints: stringArrayValue(draftRecord.keyPoints),
    researchValue: stringValue(draftRecord.researchValue),
    sourceUrl: stringValue(draftRecord.sourceUrl),
    sourceDomain: stringValue(draftRecord.sourceDomain),
    publishDate: stringValue(draftRecord.publishDate),
    updatedDate: stringValue(draftRecord.updatedDate),
    accessDate: stringValue(draftRecord.accessDate),
    linkStatus: stringValue(draftRecord.linkStatus) as AdminResourceDraft["linkStatus"],
    hasBackup: Boolean(draftRecord.hasBackup),
    backupVisibility: stringValue(
      draftRecord.backupVisibility,
    ) as AdminResourceDraft["backupVisibility"],
    archivedUrl: stringValue(draftRecord.archivedUrl),
    versioningApplicable:
      typeof draftRecord.versioningApplicable === "boolean"
        ? draftRecord.versioningApplicable
        : undefined,
    targetEntityType: normalizeTargetEntityType(draftRecord.targetEntityType),
    entityTypeConfidence: normalizeEntityTypeConfidence(
      draftRecord.entityTypeConfidence,
    ),
    classificationReason: stringValue(draftRecord.classificationReason),
    reviewStatus: normalizeReviewStatus(draftRecord.reviewStatus),
    duplicateOf: stringValue(draftRecord.duplicateOf),
    rawData:
      rawData && typeof rawData === "object"
        ? (rawData as AdminResourceDraft["rawData"])
        : undefined,
    createdAt: stringValue(draftRecord.createdAt),
    updatedAt: stringValue(draftRecord.updatedAt),
    draftSourceKey: stringValue(draftRecord.draftSourceKey),
    draftSourceLabelZh: stringValue(draftRecord.draftSourceLabelZh),
    reviewInsight: normalizeDraftReviewInsight(draftRecord.reviewInsight),
  };
}

function normalizeDrafts(value: unknown) {
  return Array.isArray(value) ? value.map((draft) => normalizeDraft(draft)) : [];
}

function parseDraftsResponse(value: unknown) {
  if (Array.isArray(value)) {
    return {
      drafts: normalizeDrafts(value),
      error: "",
    };
  }

  if (value && typeof value === "object") {
    const response = value as DraftsApiErrorResponse;

    return {
      drafts: normalizeDrafts(response.drafts),
      error: response.error || response.message || "草稿数据读取失败。",
    };
  }

  return {
    drafts: [],
    error: "草稿数据格式异常。",
  };
}

function getApiErrorMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const response = value as { error?: string; message?: string };

    return response.error || response.message || fallback;
  }

  return fallback;
}

function getResourceTypeLabel(type?: string) {
  if (!type) {
    return "未分类";
  }

  return resourceTypeZh[type as keyof typeof resourceTypeZh] ?? type;
}

function getTopicLabel(topicId?: string) {
  if (!topicId) {
    return "未指定";
  }

  return topicLabels[topicId] ? `${topicLabels[topicId]}（${topicId}）` : topicId;
}

function getCompactTopicLabel(topicId?: string) {
  if (!topicId) {
    return "未指定";
  }

  return topicLabels[topicId] ?? topicId;
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

function matchesSearch(draft: AdminResourceDraft, keyword: string) {
  if (!keyword) {
    return true;
  }

  const insight = draft.reviewInsight;
  const fields = [
    draft.titleEn,
    draft.titleZh,
    draft.sourceUrl,
    draft.resourceType,
    draft.primaryTopicId,
    draft.draftSourceLabelZh,
    draft.draftSourceKey,
    draft.targetEntityType,
    draft.classificationReason,
    insight?.titleZh,
    insight?.summaryShort,
    insight?.suggestedEntityType,
    insight?.suggestedResourceType,
    insight?.suggestedInstitutionGroup,
    insight?.suggestedInstitutionType,
    insight?.suggestedPrimaryTopicId,
    insight?.recommendation,
    insight?.reason,
    ...(insight?.suggestedTopicIds ?? []),
    ...(insight?.suggestedTags ?? []),
    ...(insight?.warningFlags ?? []),
    ...(draft.tags ?? []),
  ];

  return fields.some((field) => normalize(field).includes(keyword));
}

function StatusBadge({ status }: { status: DraftReviewStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${reviewStatusBadge[status]}`}
    >
      {reviewStatusZh[status]}
    </span>
  );
}

function TargetEntityBadge({ targetEntityType }: { targetEntityType?: TargetEntityType }) {
  const normalizedTargetEntityType = targetEntityType ?? "unknown";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${targetEntityTypeBadge[normalizedTargetEntityType]}`}
    >
      建议归属：{targetEntityTypeZh[normalizedTargetEntityType]}
    </span>
  );
}

function getReviewActionButtonClassName({
  tone,
  isSelected,
  isMuted,
}: {
  tone: ReviewActionTone;
  isSelected: boolean;
  isMuted: boolean;
}) {
  if (isSelected) {
    return "rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600 ring-2 ring-zinc-200 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700";
  }

  if (isMuted) {
    return "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800";
  }

  const toneClassName: Record<ReviewActionTone, string> = {
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
    violet:
      "bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60",
    rose: "bg-rose-600 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60",
    amber:
      "bg-amber-500 text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60",
    zinc: "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
  };

  return `rounded-lg px-3 py-2 text-sm font-medium transition ${toneClassName[tone]}`;
}

function ReviewActionButton({
  label,
  selectedLabel,
  loading,
  disabled,
  isSelected,
  isMuted,
  tone,
  onClick,
}: {
  label: string;
  selectedLabel: string;
  loading: boolean;
  disabled: boolean;
  isSelected: boolean;
  isMuted: boolean;
  tone: ReviewActionTone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={getReviewActionButtonClassName({ tone, isSelected, isMuted })}
    >
      {loading ? "保存中..." : isSelected ? selectedLabel : label}
    </button>
  );
}

function DraftReviewInsightPanel({
  insight,
  canGenerate,
  generationLoading,
  onGenerate,
}: {
  insight?: DraftReviewInsight | null;
  canGenerate: boolean;
  generationLoading: boolean;
  onGenerate: () => void;
}) {
  if (!insight) {
    return (
      <section className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          审核辅助信息
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          暂无审核辅助信息。
        </p>
        <button
          type="button"
          disabled={!canGenerate || generationLoading}
          onClick={onGenerate}
          className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generationLoading ? "生成中..." : "生成审核辅助信息"}
        </button>
      </section>
    );
  }

  const warningFlags = insight.warningFlags ?? [];
  const shouldCompleteChineseInfo = !insight.titleZh || !insight.summaryShort;

  return (
    <section className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            审核辅助信息 · {insight.generatedBy === "ai" ? "AI 生成" : "规则生成"}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {insight.titleZh || "暂未生成中文译名"}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${recommendationBadge[insight.recommendation]}`}
          >
            {recommendationZh[insight.recommendation]}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-zinc-900 dark:text-indigo-300">
            相关性 {insight.relevanceScore}/100
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {insight.summaryShort || "暂未生成简短说明。"}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div className="rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">推荐归属</p>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
            {suggestedEntityTypeZh[insight.suggestedEntityType]}
            {insight.suggestedEntityType === "resource" &&
            insight.suggestedResourceType
              ? ` · ${getResourceTypeLabel(insight.suggestedResourceType)}`
              : ""}
            {insight.suggestedEntityType === "institution" &&
            (insight.suggestedInstitutionGroup || insight.suggestedInstitutionType)
              ? ` · ${[
                  insight.suggestedInstitutionGroup,
                  insight.suggestedInstitutionType,
                ]
                  .filter(Boolean)
                  .join(" / ")}`
              : ""}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">推荐专题</p>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
            {getCompactTopicLabel(insight.suggestedPrimaryTopicId)}
          </p>
          {insight.suggestedTopicIds.length ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {insight.suggestedTopicIds.join(" / ")}
            </p>
          ) : null}
        </div>
      </div>

      {insight.suggestedTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.suggestedTags.slice(0, 10).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        判断理由：{insight.reason || "暂未生成判断理由。"}
      </p>

      {warningFlags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {warningFlags.map((flag) => (
            <span
              key={flag}
              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            >
              {warningFlagZh[flag]}
            </span>
          ))}
        </div>
      ) : null}

      {shouldCompleteChineseInfo ? (
        <button
          type="button"
          disabled={!canGenerate || generationLoading}
          onClick={onGenerate}
          className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generationLoading ? "补全中..." : "补全中文说明"}
        </button>
      ) : null}
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  const text =
    value === true
      ? "是"
      : value === false
        ? "否"
        : value === null || value === undefined || value === ""
          ? "未填写"
          : String(value);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-zinc-900 dark:text-zinc-100">
        {text}
      </p>
    </div>
  );
}

function DraftDetailModal({
  draft,
  onClose,
}: {
  draft: AdminResourceDraft;
  onClose: () => void;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="草稿详情"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
              草稿详情
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {draft.titleEn || "未命名草稿"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {draft.titleZh || "暂未翻译"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            关闭
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-5">
          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              基础信息
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailRow label="id" value={draft.id} />
              <DetailRow label="titleEn" value={draft.titleEn} />
              <DetailRow label="titleZh" value={draft.titleZh} />
              <DetailRow
                label="来源"
                value={draft.draftSourceLabelZh || draft.draftSourceKey}
              />
              <DetailRow label="sourceId" value={draft.sourceId} />
              <DetailRow label="sourceType" value={draft.sourceType} />
              <DetailRow label="countryId" value={draft.countryId} />
              <DetailRow label="institutionId" value={draft.institutionId} />
              <DetailRow
                label="resourceType"
                value={
                  draft.resourceType
                    ? `${getResourceTypeLabel(draft.resourceType)}（${draft.resourceType}）`
                    : ""
                }
              />
              <DetailRow
                label="primaryTopicId"
                value={getTopicLabel(draft.primaryTopicId)}
              />
              <DetailRow label="topicIds" value={draft.topicIds.join(" / ")} />
              <DetailRow label="tags" value={draft.tags.join(" / ")} />
              <DetailRow label="language" value={draft.language} />
              <DetailRow label="publishDate" value={draft.publishDate} />
              <DetailRow label="updatedDate" value={draft.updatedDate} />
              <DetailRow label="accessDate" value={draft.accessDate} />
              <DetailRow label="linkStatus" value={draft.linkStatus} />
              <DetailRow
                label="reviewStatus"
                value={reviewStatusZh[draft.reviewStatus]}
              />
              <DetailRow
                label="targetEntityType"
                value={targetEntityTypeZh[draft.targetEntityType ?? "unknown"]}
              />
              <DetailRow
                label="entityTypeConfidence"
                value={
                  entityTypeConfidenceZh[draft.entityTypeConfidence ?? "low"]
                }
              />
              <DetailRow
                label="classificationReason"
                value={draft.classificationReason}
              />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              来源信息
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailRow label="sourceUrl" value={draft.sourceUrl} />
              <DetailRow label="sourceDomain" value={draft.sourceDomain} />
              <DetailRow label="archivedUrl" value={draft.archivedUrl} />
              <DetailRow label="hasBackup" value={draft.hasBackup} />
              <DetailRow
                label="backupVisibility"
                value={draft.backupVisibility}
              />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              待整理字段
            </h3>
            <div className="mt-3 space-y-3">
              <DetailRow label="summaryZh" value={draft.summaryZh} />
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  keyPoints
                </p>
                {draft.keyPoints?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {draft.keyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    暂未整理
                  </p>
                )}
              </div>
              <DetailRow label="researchValue" value={draft.researchValue} />
              <DetailRow
                label="versioningApplicable"
                value={draft.versioningApplicable}
              />
            </div>
          </section>

          <section className="mt-6">
            <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                原始数据 rawData
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
                {JSON.stringify(draft.rawData ?? {}, null, 2)}
              </pre>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}

export function AdminDraftReview() {
  const [drafts, setDrafts] = useState<AdminResourceDraft[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [resourceTypeFilter, setResourceTypeFilter] =
    useState<FilterValue>("all");
  const [topicFilter, setTopicFilter] = useState<FilterValue>("all");
  const [sourceFilter, setSourceFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [updatingActionKey, setUpdatingActionKey] = useState("");
  const [generatingInsightId, setGeneratingInsightId] = useState("");
  const [bulkUpdatingStatus, setBulkUpdatingStatus] =
    useState<DraftReviewStatus | null>(null);
  const [selectedDraftKeys, setSelectedDraftKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedDraft, setSelectedDraft] = useState<AdminResourceDraft | null>(
    null,
  );

  async function loadDrafts(options?: { preserveMessages?: boolean }) {
    setLoading(true);

    if (!options?.preserveMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    try {
      const response = await fetch("/api/admin/drafts", {
        cache: "no-store",
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = parseDraftsResponse(responseBody);

      setDrafts(parsedResponse.drafts);

      if (!response.ok || parsedResponse.error) {
        setErrorMessage(parsedResponse.error || "草稿数据读取失败。");
      } else if (!options?.preserveMessages) {
        setErrorMessage("");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "草稿数据读取失败。",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDrafts() {
      try {
        const response = await fetch("/api/admin/drafts", {
          cache: "no-store",
        });
        const responseBody = (await response.json().catch(() => null)) as unknown;
        const parsedResponse = parseDraftsResponse(responseBody);

        if (isMounted) {
          setDrafts(parsedResponse.drafts);

          if (!response.ok || parsedResponse.error) {
            setErrorMessage(parsedResponse.error || "草稿数据读取失败。");
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "草稿数据读取失败。",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialDrafts();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: drafts.length,
      pending: drafts.filter((draft) => draft.reviewStatus === "pending")
        .length,
      accepted: drafts.filter((draft) => draft.reviewStatus === "accepted")
        .length,
      rejected: drafts.filter((draft) => draft.reviewStatus === "rejected")
        .length,
      needsReview: drafts.filter(
        (draft) => draft.reviewStatus === "needs_review",
      ).length,
    }),
    [drafts],
  );

  const filterOptions = useMemo(
    () => ({
      resourceTypes: uniqueValues(drafts.map((draft) => draft.resourceType)),
      topics: uniqueValues(drafts.map((draft) => draft.primaryTopicId)),
    }),
    [drafts],
  );

  const filteredDrafts = useMemo(() => {
    const normalizedKeyword = normalize(keyword);

    return drafts.filter((draft) => {
      const statusMatched =
        statusFilter === "all" || draft.reviewStatus === statusFilter;
      const resourceTypeMatched =
        resourceTypeFilter === "all" ||
        draft.resourceType === resourceTypeFilter;
      const topicMatched =
        topicFilter === "all" || draft.primaryTopicId === topicFilter;
      const sourceMatched =
        sourceFilter === "all" || draft.draftSourceKey === sourceFilter;

      return (
        statusMatched &&
        resourceTypeMatched &&
        topicMatched &&
        sourceMatched &&
        matchesSearch(draft, normalizedKeyword)
      );
    });
  }, [
    drafts,
    keyword,
    resourceTypeFilter,
    sourceFilter,
    statusFilter,
    topicFilter,
  ]);

  const selectedDrafts = useMemo(
    () =>
      drafts.filter(
        (draft) =>
          canSelectDraft(draft) &&
          selectedDraftKeys.has(getDraftSelectionKey(draft)),
      ),
    [drafts, selectedDraftKeys],
  );
  const selectableFilteredDrafts = useMemo(
    () => filteredDrafts.filter((draft) => canSelectDraft(draft)),
    [filteredDrafts],
  );

  const allFilteredDraftsSelected =
    selectableFilteredDrafts.length > 0 &&
    selectableFilteredDrafts.every((draft) =>
      selectedDraftKeys.has(getDraftSelectionKey(draft)),
    );

  function toggleDraftSelection(draft: AdminResourceDraft) {
    const draftKey = getDraftSelectionKey(draft);

    if (!draftKey) {
      return;
    }

    setSelectedDraftKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(draftKey)) {
        nextKeys.delete(draftKey);
      } else {
        nextKeys.add(draftKey);
      }

      return nextKeys;
    });
  }

  function selectFilteredDrafts() {
    setSelectedDraftKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      selectableFilteredDrafts.forEach((draft) => {
        nextKeys.add(getDraftSelectionKey(draft));
      });

      return nextKeys;
    });
  }

  function clearSelectedDrafts() {
    setSelectedDraftKeys(new Set());
  }

  function preserveReviewInsight(
    updatedDraft: AdminResourceDraft,
    previousDraft?: AdminResourceDraft | null,
  ): AdminResourceDraft {
    return {
      ...updatedDraft,
      reviewInsight: updatedDraft.reviewInsight ?? previousDraft?.reviewInsight ?? null,
    };
  }

  async function updateReviewStatus(
    id: string,
    reviewStatus: DraftReviewStatus,
    draftSourceKey?: string,
  ) {
    if (!id) {
      setErrorMessage("该草稿缺少 id，无法更新审核状态。");
      return;
    }

    const updateKey = `${draftSourceKey ?? "unknown"}:${id}`;

    setUpdatingId(updateKey);
    setUpdatingActionKey(`${updateKey}:${reviewStatus}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/drafts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, reviewStatus, draftSourceKey }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | BulkUpdateResponse
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !responseBody || !("updatedItems" in responseBody)) {
        throw new Error(getApiErrorMessage(responseBody, "草稿状态更新失败。"));
      }

      const updatedDraft = normalizeDraft(responseBody.updatedItems[0]);
      setDrafts((currentDrafts) =>
        currentDrafts.map((draft) => {
          if (
            draft.id === updatedDraft.id &&
            draft.draftSourceKey === updatedDraft.draftSourceKey
          ) {
            return preserveReviewInsight(updatedDraft, draft);
          }

          return draft;
        }),
      );
      setSelectedDraft((currentDraft) =>
        currentDraft?.id === updatedDraft.id &&
        currentDraft.draftSourceKey === updatedDraft.draftSourceKey
          ? preserveReviewInsight(updatedDraft, currentDraft)
          : currentDraft,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "草稿状态更新失败。",
      );
    } finally {
      setUpdatingId("");
      setUpdatingActionKey("");
    }
  }

  async function updateTargetEntityType(
    id: string,
    targetEntityType: Exclude<TargetEntityType, "unknown">,
    draftSourceKey?: string,
  ) {
    if (!id) {
      setErrorMessage("该草稿缺少 id，无法更新归属模块。");
      return;
    }

    const updateKey = `${draftSourceKey ?? "unknown"}:${id}`;

    setUpdatingId(updateKey);
    setUpdatingActionKey(`${updateKey}:target-${targetEntityType}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/drafts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          draftSourceKey,
          targetEntityType,
          entityTypeConfidence: "high",
          classificationReason: "由人工在审核页修改",
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | BulkUpdateResponse
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !responseBody || !("updatedItems" in responseBody)) {
        throw new Error(getApiErrorMessage(responseBody, "归属模块更新失败。"));
      }

      const updatedDraft = normalizeDraft(responseBody.updatedItems[0]);
      setDrafts((currentDrafts) =>
        currentDrafts.map((draft) => {
          if (
            draft.id === updatedDraft.id &&
            draft.draftSourceKey === updatedDraft.draftSourceKey
          ) {
            return preserveReviewInsight(updatedDraft, draft);
          }

          return draft;
        }),
      );
      setSelectedDraft((currentDraft) =>
        currentDraft?.id === updatedDraft.id &&
        currentDraft.draftSourceKey === updatedDraft.draftSourceKey
          ? preserveReviewInsight(updatedDraft, currentDraft)
          : currentDraft,
      );
      setSuccessMessage(
        `已将 ${updatedDraft.titleEn || updatedDraft.id} 归入${targetEntityTypeZh[targetEntityType]}。`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "归属模块更新失败。",
      );
    } finally {
      setUpdatingId("");
      setUpdatingActionKey("");
    }
  }

  async function quickUpdateDraft(
    draft: AdminResourceDraft,
    patch: {
      reviewStatus: DraftReviewStatus;
      targetEntityType?: Exclude<TargetEntityType, "unknown">;
      successLabel: string;
    },
  ) {
    if (!draft.id) {
      setErrorMessage("该草稿缺少 id，无法执行快捷操作。");
      return;
    }

    const updateKey = `${draft.draftSourceKey ?? "unknown"}:${draft.id}`;
    const actionName =
      patch.reviewStatus === "accepted" && patch.targetEntityType === "resource"
        ? "accept-resource"
        : patch.reviewStatus === "accepted" &&
            patch.targetEntityType === "institution"
          ? "accept-institution"
          : patch.reviewStatus;

    setUpdatingId(updateKey);
    setUpdatingActionKey(`${updateKey}:${actionName}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/drafts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: draft.id,
          draftSourceKey: draft.draftSourceKey,
          reviewStatus: patch.reviewStatus,
          targetEntityType: patch.targetEntityType,
          entityTypeConfidence: patch.targetEntityType ? "high" : undefined,
          classificationReason: patch.targetEntityType
            ? "由人工在智能审核工作台快捷操作指定"
            : undefined,
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as
        | BulkUpdateResponse
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !responseBody || !("updatedItems" in responseBody)) {
        throw new Error(getApiErrorMessage(responseBody, "快捷操作失败。"));
      }

      const updatedDraft = normalizeDraft(responseBody.updatedItems[0]);

      setDrafts((currentDrafts) =>
        currentDrafts.map((currentDraft) => {
          if (
            currentDraft.id === updatedDraft.id &&
            currentDraft.draftSourceKey === updatedDraft.draftSourceKey
          ) {
            return preserveReviewInsight(updatedDraft, currentDraft);
          }

          return currentDraft;
        }),
      );
      setSelectedDraft((currentDraft) =>
        currentDraft?.id === updatedDraft.id &&
        currentDraft.draftSourceKey === updatedDraft.draftSourceKey
          ? preserveReviewInsight(updatedDraft, currentDraft)
          : currentDraft,
      );
      setSuccessMessage(`${patch.successLabel}：${draft.titleEn || draft.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "快捷操作失败。");
    } finally {
      setUpdatingId("");
      setUpdatingActionKey("");
    }
  }

  async function generateDraftInsight(draft: AdminResourceDraft) {
    if (!draft.id || !draft.draftSourceKey) {
      setErrorMessage("该草稿缺少 id 或来源，无法生成审核辅助信息。");
      return;
    }

    const draftKey = `${draft.draftSourceKey}:${draft.id}`;

    setGeneratingInsightId(draftKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/draft-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId: draft.id,
          draftSourceKey: draft.draftSourceKey,
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as
        | DraftInsightApiResponse
        | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(
          responseBody?.error || "审核辅助信息生成失败。",
        );
      }

      const reviewInsight = normalizeDraftReviewInsight(responseBody.insight);

      if (!reviewInsight) {
        throw new Error("AI 返回的审核辅助信息格式异常。");
      }

      setDrafts((currentDrafts) =>
        currentDrafts.map((currentDraft) =>
          currentDraft.id === draft.id &&
          currentDraft.draftSourceKey === draft.draftSourceKey
            ? {
                ...currentDraft,
                reviewInsight,
              }
            : currentDraft,
        ),
      );
      setSelectedDraft((currentDraft) =>
        currentDraft?.id === draft.id &&
        currentDraft.draftSourceKey === draft.draftSourceKey
          ? {
              ...currentDraft,
              reviewInsight,
            }
          : currentDraft,
      );
      setSuccessMessage(`已生成审核辅助信息：${draft.titleEn || draft.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "审核辅助信息生成失败。",
      );
    } finally {
      setGeneratingInsightId("");
    }
  }

  async function updateSelectedReviewStatus(
    reviewStatus: DraftReviewStatus,
    confirmLabel: string,
  ) {
    const items = selectedDrafts.map((draft) => ({
      id: draft.id,
      draftSourceKey: draft.draftSourceKey,
    }));

    if (items.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `确定要将选中的 ${items.length} 条草稿标记为${confirmLabel}吗？`,
    );

    if (!confirmed) {
      return;
    }

    setBulkUpdatingStatus(reviewStatus);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/drafts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items, reviewStatus }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | BulkUpdateResponse
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !responseBody || !("updatedItems" in responseBody)) {
        throw new Error(getApiErrorMessage(responseBody, "批量更新失败。"));
      }

      const bulkResult = {
        ...responseBody,
        updatedItems: normalizeDrafts(responseBody.updatedItems),
        failedItems: Array.isArray(responseBody.failedItems)
          ? responseBody.failedItems
          : [],
        updatedCount: Number(responseBody.updatedCount || 0),
      };

      setDrafts((currentDrafts) =>
        currentDrafts.map((draft) => {
          const updatedDraft = bulkResult.updatedItems.find(
            (item) =>
              item.id === draft.id &&
              item.draftSourceKey === draft.draftSourceKey,
          );

          return updatedDraft ? preserveReviewInsight(updatedDraft, draft) : draft;
        }),
      );
      setSelectedDraft((currentDraft) => {
        if (!currentDraft) {
          return currentDraft;
        }

        const updatedDraft = bulkResult.updatedItems.find(
          (item) =>
            item.id === currentDraft.id &&
            item.draftSourceKey === currentDraft.draftSourceKey,
        );

        return updatedDraft
          ? preserveReviewInsight(updatedDraft, currentDraft)
          : currentDraft;
      });
      setSelectedDraftKeys(new Set());
      setSuccessMessage(`已更新 ${bulkResult.updatedCount} 条草稿。`);
      void loadDrafts({ preserveMessages: true });

      if (bulkResult.failedItems.length > 0) {
        setErrorMessage(
          `有 ${bulkResult.failedItems.length} 条草稿未能更新：${bulkResult.failedItems
            .slice(0, 3)
            .map((item) => item.message)
            .join("；")}`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "批量更新失败。",
      );
    } finally {
      setBulkUpdatingStatus(null);
    }
  }

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          当前页面为本地开发阶段使用的草稿审核工具，暂不建议在公开生产环境暴露。
        </div>

        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
          如果草稿缺少中文说明，请先运行 npm run drafts:insights
          生成规则审核建议。后续可升级为 AI 审核建议。
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["草稿总数", stats.total],
            ["待审核", stats.pending],
            ["已接受", stats.accepted],
            ["已拒绝", stats.rejected],
            ["需进一步审核", stats.needsReview],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {value}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                关键词搜索
              </span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索标题、链接、标签、类型或专题 ID"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                审核状态
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              >
                <option value="all">全部</option>
                {reviewStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                资料类型
              </span>
              <select
                value={resourceTypeFilter}
                onChange={(event) =>
                  setResourceTypeFilter(event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              >
                <option value="all">全部</option>
                {filterOptions.resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {getResourceTypeLabel(type)}（{type}）
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                主专题
              </span>
              <select
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              >
                <option value="all">全部</option>
                {filterOptions.topics.map((topicId) => (
                  <option key={topicId} value={topicId}>
                    {getCompactTopicLabel(topicId)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                来源
              </span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              >
                <option value="all">全部来源</option>
                {draftSourceOptions.map((source) => (
                  <option key={source.sourceKey} value={source.sourceKey}>
                    {source.labelZh}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                草稿列表
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                当前显示 {filteredDrafts.length} 条草稿
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDrafts()}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              重新读取草稿
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  已选择 {selectedDrafts.length} 条草稿
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  全选只会选择当前筛选结果中的草稿。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectFilteredDrafts}
                  disabled={
                    selectableFilteredDrafts.length === 0 ||
                    allFilteredDraftsSelected
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  全选当前筛选结果
                </button>
                <button
                  type="button"
                  onClick={clearSelectedDrafts}
                  disabled={selectedDrafts.length === 0}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  取消全选
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={selectedDrafts.length === 0 || Boolean(bulkUpdatingStatus)}
                onClick={() => updateSelectedReviewStatus("accepted", "已接受")}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkUpdatingStatus === "accepted" ? "正在更新…" : "批量接受"}
              </button>
              <button
                type="button"
                disabled={selectedDrafts.length === 0 || Boolean(bulkUpdatingStatus)}
                onClick={() => updateSelectedReviewStatus("rejected", "已拒绝")}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkUpdatingStatus === "rejected" ? "正在更新…" : "批量拒绝"}
              </button>
              <button
                type="button"
                disabled={selectedDrafts.length === 0 || Boolean(bulkUpdatingStatus)}
                onClick={() =>
                  updateSelectedReviewStatus("needs_review", "需进一步审核")
                }
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkUpdatingStatus === "needs_review"
                  ? "正在更新…"
                  : "批量需进一步审核"}
              </button>
              <button
                type="button"
                disabled={selectedDrafts.length === 0 || Boolean(bulkUpdatingStatus)}
                onClick={() => updateSelectedReviewStatus("pending", "待审核")}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {bulkUpdatingStatus === "pending"
                  ? "正在更新…"
                  : "批量恢复待审核"}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => loadDrafts()}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
                >
                  重新读取草稿
                </button>
              </div>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {successMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              正在读取草稿数据……
            </div>
          ) : null}

          {!loading && filteredDrafts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {drafts.length === 0
                  ? "暂无采集草稿。请先运行 npm run ingest:fr 或 npm run ingest:nara-web。"
                  : "暂无匹配草稿。你可以调整筛选条件，或运行对应采集脚本。"}
              </p>
              <div className="mt-2 space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                <p>Federal Register 采集：npm run ingest:fr</p>
                <p>NARA 官网采集：npm run ingest:nara-web</p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            {filteredDrafts.map((draft) => {
              const draftUpdateKey = `${draft.draftSourceKey ?? "unknown"}:${draft.id}`;
              const isAcceptedAsResource =
                draft.reviewStatus === "accepted" &&
                draft.targetEntityType === "resource";
              const isAcceptedAsInstitution =
                draft.reviewStatus === "accepted" &&
                draft.targetEntityType === "institution";
              const isRejected = draft.reviewStatus === "rejected";
              const isNeedsReview = draft.reviewStatus === "needs_review";
              const hasReviewed = draft.reviewStatus !== "pending";
              const hasSelectedAction =
                isAcceptedAsResource ||
                isAcceptedAsInstitution ||
                isRejected ||
                isNeedsReview;
              const isCardUpdating = updatingId === draftUpdateKey;
              const isGeneratingInsight = generatingInsightId === draftUpdateKey;

              return (
              <article
                key={`${draft.draftSourceKey ?? draft.sourceId}:${draft.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <label className="mt-1 inline-flex shrink-0 items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={
                        canSelectDraft(draft) &&
                        selectedDraftKeys.has(getDraftSelectionKey(draft))
                      }
                      disabled={!canSelectDraft(draft)}
                      onChange={() => toggleDraftSelection(draft)}
                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
                      aria-label={`选择草稿 ${draft.titleEn || draft.id}`}
                    />
                    <span className="sr-only">选择草稿</span>
                  </label>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={draft.reviewStatus} />
                      <TargetEntityBadge
                        targetEntityType={draft.targetEntityType}
                      />
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {getResourceTypeLabel(draft.resourceType)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {draft.draftSourceLabelZh || draft.sourceId}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {draft.titleEn || "未命名草稿"}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {draft.titleZh || "暂未翻译"}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-600 md:grid-cols-2 dark:text-zinc-300">
                      <p>
                        主专题：
                        <span className="font-medium">
                          {getCompactTopicLabel(draft.primaryTopicId)}
                        </span>
                      </p>
                      <p>发布时间：{draft.publishDate || "未填写"}</p>
                      <p>
                        建议归属：
                        <span className="font-medium">
                          {targetEntityTypeZh[draft.targetEntityType ?? "unknown"]}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          置信度：
                          {
                            entityTypeConfidenceZh[
                              draft.entityTypeConfidence ?? "low"
                            ]
                          }
                        </span>
                      </p>
                      <p>
                        分类说明：
                        {draft.classificationReason || "暂未记录"}
                      </p>
                      <p className="break-all md:col-span-2">
                        官方链接：{draft.sourceUrl || "未填写"}
                      </p>
                    </div>
                    <label className="mt-3 block max-w-xs">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        归属模块
                      </span>
                      <select
                        value={
                          draft.targetEntityType === "institution"
                            ? "institution"
                            : "resource"
                        }
                        disabled={
                          !draft.id ||
                          updatingId ===
                            `${draft.draftSourceKey ?? "unknown"}:${draft.id}`
                        }
                        onChange={(event) =>
                          updateTargetEntityType(
                            draft.id,
                            event.target
                              .value as Exclude<TargetEntityType, "unknown">,
                            draft.draftSourceKey,
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
                      >
                        {targetEntityTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {draft.tags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {draft.tags.slice(0, 10).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <DraftReviewInsightPanel
                      insight={draft.reviewInsight}
                      canGenerate={Boolean(draft.id && draft.draftSourceKey)}
                      generationLoading={isGeneratingInsight}
                      onGenerate={() => generateDraftInsight(draft)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ReviewActionButton
                    label="接受为资料"
                    selectedLabel="已接受为资料"
                    loading={updatingActionKey === `${draftUpdateKey}:accept-resource`}
                    disabled={!draft.id || isCardUpdating}
                    isSelected={isAcceptedAsResource}
                    isMuted={hasSelectedAction && !isAcceptedAsResource}
                    tone="emerald"
                    onClick={() =>
                      quickUpdateDraft(draft, {
                        reviewStatus: "accepted",
                        targetEntityType: "resource",
                        successLabel: "已接受为资料",
                      })
                    }
                  />
                  <ReviewActionButton
                    label="接受为机构"
                    selectedLabel="已接受为机构"
                    loading={updatingActionKey === `${draftUpdateKey}:accept-institution`}
                    disabled={!draft.id || isCardUpdating}
                    isSelected={isAcceptedAsInstitution}
                    isMuted={hasSelectedAction && !isAcceptedAsInstitution}
                    tone="violet"
                    onClick={() =>
                      quickUpdateDraft(draft, {
                        reviewStatus: "accepted",
                        targetEntityType: "institution",
                        successLabel: "已接受为机构",
                      })
                    }
                  />
                  <ReviewActionButton
                    label="拒绝"
                    selectedLabel="已拒绝"
                    loading={updatingActionKey === `${draftUpdateKey}:rejected`}
                    disabled={!draft.id || isCardUpdating}
                    isSelected={isRejected}
                    isMuted={hasSelectedAction && !isRejected}
                    tone="rose"
                    onClick={() =>
                      quickUpdateDraft(draft, {
                        reviewStatus: "rejected",
                        successLabel: "已拒绝",
                      })
                    }
                  />
                  <ReviewActionButton
                    label="需进一步审核"
                    selectedLabel="需进一步审核中"
                    loading={updatingActionKey === `${draftUpdateKey}:needs_review`}
                    disabled={!draft.id || isCardUpdating}
                    isSelected={isNeedsReview}
                    isMuted={hasSelectedAction && !isNeedsReview}
                    tone="amber"
                    onClick={() =>
                      quickUpdateDraft(draft, {
                        reviewStatus: "needs_review",
                        successLabel: "已标记需进一步审核",
                      })
                    }
                  />
                  {hasReviewed ? (
                    <ReviewActionButton
                      label="撤销审核"
                      selectedLabel="撤销审核"
                      loading={updatingActionKey === `${draftUpdateKey}:pending`}
                      disabled={!draft.id || isCardUpdating}
                      isSelected={false}
                      isMuted={false}
                      tone="zinc"
                      onClick={() =>
                        quickUpdateDraft(draft, {
                          reviewStatus: "pending",
                          successLabel: "已撤销审核",
                        })
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedDraft(draft)}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    查看详情
                  </button>
                  {draft.sourceUrl ? (
                    <a
                      href={draft.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      访问官方链接
                    </a>
                  ) : null}
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDraft ? (
        <DraftDetailModal
          draft={selectedDraft}
          onClose={() => setSelectedDraft(null)}
        />
      ) : null}
    </section>
  );
}
