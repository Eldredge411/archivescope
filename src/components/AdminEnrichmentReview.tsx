"use client";

import { useEffect, useMemo, useState } from "react";
import { resourceTypeZh } from "@/lib/display";

type FilterValue = "all" | string;
type EnrichmentReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_revision"
  | "applied";

type ResourceInfo = {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string;
  sourceUrl: string;
  sourceDomain: string;
  resourceType: string;
  primaryTopicId: string;
  topicIds: string[];
  tags: string[];
};

type EnrichmentLike = {
  resourceId: string;
  titleZh: string;
  summaryShort: string;
  summaryZh: string;
  keyPoints: string[];
  researchValue: string;
  resourceType: string;
  primaryTopicId: string;
  topicIds: string[];
  tags: string[];
  status: string;
  versioningApplicable?: boolean;
  versionNote: string;
  sourceBasis?: string;
};

type EnrichmentDraft = EnrichmentLike & {
  reviewStatus: EnrichmentReviewStatus;
  aiGenerated?: boolean;
  manuallyEdited?: boolean;
  createdAt?: string;
  updatedAt?: string;
  currentEnrichment?: EnrichmentLike | null;
  resourceInfo: ResourceInfo;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  draft?: unknown;
  drafts?: unknown;
  updatedItems?: unknown;
  updatedCount?: number;
  appliedCount?: number;
  addedCount?: number;
  updatedExistingCount?: number;
  skippedCount?: number;
  failedItems?: Array<{ resourceId?: string; message?: string }>;
};

type EnrichmentDraftUpdates = {
  titleZh: string;
  summaryShort: string;
  summaryZh: string;
  keyPoints: string[];
  researchValue: string;
  resourceType: string;
  primaryTopicId: string;
  topicIds: string[];
  tags: string[];
  status: string;
  versioningApplicable: boolean;
  versionNote: string;
};

const reviewStatusOptions: Array<{
  value: EnrichmentReviewStatus;
  label: string;
}> = [
  { value: "pending", label: "待审核" },
  { value: "accepted", label: "已接受" },
  { value: "rejected", label: "已拒绝" },
  { value: "needs_revision", label: "需修改" },
  { value: "applied", label: "已应用" },
];

const reviewStatusZh: Record<EnrichmentReviewStatus, string> = {
  pending: "待审核",
  accepted: "已接受",
  rejected: "已拒绝",
  needs_revision: "需修改",
  applied: "已应用",
};

const reviewStatusBadge: Record<EnrichmentReviewStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  accepted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  needs_revision:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  applied:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const editableResourceTypes = Object.keys(resourceTypeZh);
const editableResourceStatuses = [
  "imported_draft",
  "draft",
  "published_draft",
  "reviewed",
  "published",
  "needs_review",
  "archived",
];
const editableTopicIds = [
  "laws-policies-governance",
  "electronic-records-management",
  "digital-resources-preservation",
  "access-outreach-public-participation",
  "ai-emerging-technologies",
  "social-actors-service-ecosystem",
];

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function normalize(value: unknown) {
  return stringValue(value).toLowerCase();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function normalizeReviewStatus(value: unknown): EnrichmentReviewStatus {
  const normalizedValue = stringValue(value);

  return reviewStatusOptions.some((status) => status.value === normalizedValue)
    ? (normalizedValue as EnrichmentReviewStatus)
    : "pending";
}

function normalizeResourceInfo(value: unknown): ResourceInfo {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: stringValue(record.id),
    slug: stringValue(record.slug),
    titleEn: stringValue(record.titleEn),
    titleZh: stringValue(record.titleZh),
    sourceUrl: stringValue(record.sourceUrl),
    sourceDomain: stringValue(record.sourceDomain),
    resourceType: stringValue(record.resourceType),
    primaryTopicId: stringValue(record.primaryTopicId),
    topicIds: stringArrayValue(record.topicIds),
    tags: stringArrayValue(record.tags),
  };
}

function normalizeEnrichment(value: unknown): EnrichmentLike | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    resourceId: stringValue(record.resourceId),
    titleZh: stringValue(record.titleZh),
    summaryShort: stringValue(record.summaryShort),
    summaryZh: stringValue(record.summaryZh),
    keyPoints: stringArrayValue(record.keyPoints),
    researchValue: stringValue(record.researchValue),
    resourceType: stringValue(record.resourceType),
    primaryTopicId: stringValue(record.primaryTopicId),
    topicIds: stringArrayValue(record.topicIds),
    tags: stringArrayValue(record.tags),
    status: stringValue(record.status),
    versioningApplicable:
      typeof record.versioningApplicable === "boolean"
        ? record.versioningApplicable
        : undefined,
    versionNote: stringValue(record.versionNote),
    sourceBasis: stringValue(record.sourceBasis),
  };
}

function normalizeDraft(value: unknown): EnrichmentDraft {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const resourceInfo = normalizeResourceInfo(record.resourceInfo);

  return {
    resourceId: stringValue(record.resourceId),
    titleZh: stringValue(record.titleZh),
    summaryShort: stringValue(record.summaryShort),
    summaryZh: stringValue(record.summaryZh),
    keyPoints: stringArrayValue(record.keyPoints),
    researchValue: stringValue(record.researchValue),
    resourceType: stringValue(record.resourceType || resourceInfo.resourceType),
    primaryTopicId: stringValue(record.primaryTopicId || resourceInfo.primaryTopicId),
    topicIds: stringArrayValue(record.topicIds),
    tags: stringArrayValue(record.tags),
    status: stringValue(record.status),
    versioningApplicable:
      typeof record.versioningApplicable === "boolean"
        ? record.versioningApplicable
        : undefined,
    versionNote: stringValue(record.versionNote),
    sourceBasis: stringValue(record.sourceBasis),
    reviewStatus: normalizeReviewStatus(record.reviewStatus),
    aiGenerated: Boolean(record.aiGenerated),
    manuallyEdited: Boolean(record.manuallyEdited),
    createdAt: stringValue(record.createdAt),
    updatedAt: stringValue(record.updatedAt),
    currentEnrichment: normalizeEnrichment(record.currentEnrichment),
    resourceInfo,
  };
}

function normalizeDrafts(value: unknown) {
  return Array.isArray(value) ? value.map((draft) => normalizeDraft(draft)) : [];
}

function parseDraftResponse(value: unknown) {
  if (value && typeof value === "object") {
    const response = value as ApiResponse;

    return {
      drafts: normalizeDrafts(response.drafts),
      error: response.success === false ? response.error || response.message || "" : "",
    };
  }

  return {
    drafts: [],
    error: "AI enrichment 草稿数据格式异常。",
  };
}

function getApiErrorMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const response = value as ApiResponse;

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

function getSelectionKey(draft: EnrichmentDraft) {
  return draft.resourceId;
}

function matchesSearch(draft: EnrichmentDraft, keyword: string) {
  if (!keyword) {
    return true;
  }

  return [
    draft.resourceId,
    draft.titleZh,
    draft.resourceInfo.titleZh,
    draft.resourceInfo.titleEn,
    draft.summaryShort,
    draft.summaryZh,
    draft.resourceInfo.sourceUrl,
    ...draft.tags,
  ].some((value) => normalize(value).includes(keyword));
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map(stringValue).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function linesFromArray(values: string[]) {
  return values.join("\n");
}

function arrayFromLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayFromCommaText(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function StatusBadge({ status }: { status: EnrichmentReviewStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${reviewStatusBadge[status]}`}
    >
      {reviewStatusZh[status]}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 break-words text-zinc-900 dark:text-zinc-50">
        {value || "未填写"}
      </dd>
    </div>
  );
}

function KeyPointList({ points }: { points: string[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无内容要点。</p>;
  }

  return (
    <ul className="space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
      {points.map((point) => (
        <li key={point} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function DraftEditModal({
  draft,
  saving,
  onClose,
  onSave,
}: {
  draft: EnrichmentDraft;
  saving: boolean;
  onClose: () => void;
  onSave: (resourceId: string, updates: EnrichmentDraftUpdates) => Promise<void>;
}) {
  const [titleZh, setTitleZh] = useState(draft.titleZh);
  const [summaryShort, setSummaryShort] = useState(draft.summaryShort);
  const [summaryZh, setSummaryZh] = useState(draft.summaryZh);
  const [keyPointsText, setKeyPointsText] = useState(linesFromArray(draft.keyPoints));
  const [researchValue, setResearchValue] = useState(draft.researchValue);
  const [resourceType, setResourceType] = useState(draft.resourceType);
  const [primaryTopicId, setPrimaryTopicId] = useState(draft.primaryTopicId);
  const [topicIdsText, setTopicIdsText] = useState(linesFromArray(draft.topicIds));
  const [tagsText, setTagsText] = useState(draft.tags.join(", "));
  const [status, setStatus] = useState(draft.status || "published_draft");
  const [versioningApplicable, setVersioningApplicable] = useState(
    Boolean(draft.versioningApplicable),
  );
  const [versionNote, setVersionNote] = useState(draft.versionNote);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave(draft.resourceId, {
      titleZh,
      summaryShort,
      summaryZh,
      keyPoints: arrayFromLines(keyPointsText),
      researchValue,
      resourceType,
      primaryTopicId,
      topicIds: arrayFromLines(topicIdsText),
      tags: arrayFromCommaText(tagsText),
      status,
      versioningApplicable,
      versionNote,
    });
  }

  const inputClassName =
    "mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950";
  const labelClassName = "block text-sm font-medium text-zinc-700 dark:text-zinc-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrichment-edit-title"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:max-h-[90vh]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="shrink-0 border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={draft.reviewStatus} />
                {draft.reviewStatus === "needs_revision" ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    请修改后重新审核
                  </span>
                ) : null}
              </div>
              <h2
                id="enrichment-edit-title"
                className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50"
              >
                编辑 AI enrichment 草稿
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {draft.resourceId} · 保存后状态会恢复为待审核。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="关闭编辑"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 text-lg text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className={labelClassName}>
              titleZh
              <input
                value={titleZh}
                onChange={(event) => setTitleZh(event.target.value)}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              resourceType
              <select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value)}
                className={inputClassName}
              >
                {editableResourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {getResourceTypeLabel(type)}（{type}）
                  </option>
                ))}
                {!editableResourceTypes.includes(resourceType) ? (
                  <option value={resourceType}>{resourceType || "未填写"}</option>
                ) : null}
              </select>
            </label>

            <label className={labelClassName}>
              summaryShort
              <textarea
                value={summaryShort}
                onChange={(event) => setSummaryShort(event.target.value)}
                rows={3}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              summaryZh
              <textarea
                value={summaryZh}
                onChange={(event) => setSummaryZh(event.target.value)}
                rows={5}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              keyPoints（每行一个要点）
              <textarea
                value={keyPointsText}
                onChange={(event) => setKeyPointsText(event.target.value)}
                rows={7}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              researchValue
              <textarea
                value={researchValue}
                onChange={(event) => setResearchValue(event.target.value)}
                rows={7}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              primaryTopicId
              <select
                value={primaryTopicId}
                onChange={(event) => setPrimaryTopicId(event.target.value)}
                className={inputClassName}
              >
                {editableTopicIds.map((topicId) => (
                  <option key={topicId} value={topicId}>
                    {topicId}
                  </option>
                ))}
                {!editableTopicIds.includes(primaryTopicId) ? (
                  <option value={primaryTopicId}>
                    {primaryTopicId || "未填写"}
                  </option>
                ) : null}
              </select>
            </label>

            <label className={labelClassName}>
              topicIds（每行一个 topicId）
              <textarea
                value={topicIdsText}
                onChange={(event) => setTopicIdsText(event.target.value)}
                rows={4}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              tags（逗号分隔）
              <input
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                className={inputClassName}
              />
            </label>

            <label className={labelClassName}>
              status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={inputClassName}
              >
                {editableResourceStatuses.map((resourceStatus) => (
                  <option key={resourceStatus} value={resourceStatus}>
                    {resourceStatus}
                  </option>
                ))}
                {!editableResourceStatuses.includes(status) ? (
                  <option value={status}>{status || "未填写"}</option>
                ) : null}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={versioningApplicable}
                onChange={(event) => setVersioningApplicable(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
              versioningApplicable
            </label>

            <label className={`${labelClassName} lg:col-span-2`}>
              versionNote
              <textarea
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                rows={3}
                className={inputClassName}
              />
            </label>
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5 sm:py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? "正在保存…" : "保存草稿"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function DraftDetailModal({
  draft,
  onClose,
}: {
  draft: EnrichmentDraft;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrichment-detail-title"
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={draft.reviewStatus} />
              {draft.currentEnrichment ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  已有正式 enrichment
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  暂无正式 enrichment
                </span>
              )}
            </div>
            <h2
              id="enrichment-detail-title"
              className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {draft.titleZh || draft.resourceInfo.titleZh || draft.resourceId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 text-lg text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DetailBlock title="资料基础信息">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <FieldRow label="resourceId" value={draft.resourceId} />
                <FieldRow label="titleEn" value={draft.resourceInfo.titleEn} />
                <FieldRow
                  label="当前正式 titleZh"
                  value={draft.currentEnrichment?.titleZh}
                />
                <FieldRow label="sourceDomain" value={draft.resourceInfo.sourceDomain} />
                <FieldRow label="resourceType" value={draft.resourceInfo.resourceType} />
                <FieldRow label="primaryTopicId" value={draft.resourceInfo.primaryTopicId} />
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">sourceUrl</dt>
                  <dd className="mt-0.5 break-all text-zinc-900 dark:text-zinc-50">
                    {draft.resourceInfo.sourceUrl ? (
                      <a
                        href={draft.resourceInfo.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-700 hover:underline dark:text-indigo-300"
                      >
                        {draft.resourceInfo.sourceUrl}
                      </a>
                    ) : (
                      "未填写"
                    )}
                  </dd>
                </div>
              </dl>
            </DetailBlock>

            <DetailBlock title="AI 草稿内容">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <FieldRow label="titleZh" value={draft.titleZh} />
                <FieldRow label="reviewStatus" value={reviewStatusZh[draft.reviewStatus]} />
                <FieldRow label="resourceType" value={draft.resourceType} />
                <FieldRow label="primaryTopicId" value={draft.primaryTopicId} />
                <FieldRow label="topicIds" value={draft.topicIds.join(" / ")} />
                <FieldRow label="tags" value={draft.tags.join(" / ")} />
                <FieldRow
                  label="versioningApplicable"
                  value={
                    typeof draft.versioningApplicable === "boolean"
                      ? draft.versioningApplicable
                        ? "true"
                        : "false"
                      : ""
                  }
                />
                <FieldRow label="sourceBasis" value={draft.sourceBasis} />
              </dl>
            </DetailBlock>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DetailBlock title="AI 摘要与研究价值">
              <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    summaryShort
                  </p>
                  <p className="mt-2">{draft.summaryShort || "未填写"}</p>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    summaryZh
                  </p>
                  <p className="mt-2">{draft.summaryZh || "未填写"}</p>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    keyPoints
                  </p>
                  <div className="mt-2">
                    <KeyPointList points={draft.keyPoints} />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    researchValue
                  </p>
                  <p className="mt-2">{draft.researchValue || "未填写"}</p>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    versionNote
                  </p>
                  <p className="mt-2">{draft.versionNote || "未填写"}</p>
                </div>
              </div>
            </DetailBlock>

            <DetailBlock title="当前正式 enrichment 对比">
              {draft.currentEnrichment ? (
                <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      当前 titleZh
                    </p>
                    <p className="mt-2">{draft.currentEnrichment.titleZh || "未填写"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      当前 summaryShort
                    </p>
                    <p className="mt-2">
                      {draft.currentEnrichment.summaryShort || "未填写"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      当前 summaryZh
                    </p>
                    <p className="mt-2">
                      {draft.currentEnrichment.summaryZh || "未填写"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      当前 keyPoints
                    </p>
                    <div className="mt-2">
                      <KeyPointList points={draft.currentEnrichment.keyPoints} />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      当前 researchValue
                    </p>
                    <p className="mt-2">
                      {draft.currentEnrichment.researchValue || "未填写"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  当前资料还没有正式 enrichment，应用后将新增条目。
                </p>
              )}
            </DetailBlock>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminEnrichmentReview() {
  const [drafts, setDrafts] = useState<EnrichmentDraft[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [sourceDomainFilter, setSourceDomainFilter] = useState<FilterValue>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<FilterValue>("all");
  const [existingFilter, setExistingFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [bulkUpdatingStatus, setBulkUpdatingStatus] =
    useState<EnrichmentReviewStatus | null>(null);
  const [applyingId, setApplyingId] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [selectedDraft, setSelectedDraft] = useState<EnrichmentDraft | null>(null);
  const [editingDraft, setEditingDraft] = useState<EnrichmentDraft | null>(null);
  const [savingEditId, setSavingEditId] = useState("");

  async function loadDrafts(options?: { preserveMessages?: boolean }) {
    setLoading(true);

    if (!options?.preserveMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    try {
      const response = await fetch("/api/admin/enrichments", {
        cache: "no-store",
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const parsedResponse = parseDraftResponse(responseBody);

      setDrafts(parsedResponse.drafts);

      if (!response.ok || parsedResponse.error) {
        setErrorMessage(parsedResponse.error || "AI enrichment 草稿读取失败。");
      } else if (!options?.preserveMessages) {
        setErrorMessage("");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI enrichment 草稿读取失败。",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
  }, []);

  const stats = useMemo(
    () => ({
      total: drafts.length,
      pending: drafts.filter((draft) => draft.reviewStatus === "pending").length,
      accepted: drafts.filter((draft) => draft.reviewStatus === "accepted").length,
      rejected: drafts.filter((draft) => draft.reviewStatus === "rejected").length,
      needsRevision: drafts.filter((draft) => draft.reviewStatus === "needs_revision")
        .length,
      applied: drafts.filter((draft) => draft.reviewStatus === "applied").length,
    }),
    [drafts],
  );

  const filterOptions = useMemo(
    () => ({
      sourceDomains: uniqueValues(
        drafts.map((draft) => draft.resourceInfo.sourceDomain),
      ),
      resourceTypes: uniqueValues(drafts.map((draft) => draft.resourceType)),
    }),
    [drafts],
  );

  const filteredDrafts = useMemo(() => {
    const normalizedKeyword = normalize(keyword);

    return drafts.filter((draft) => {
      const statusMatched =
        statusFilter === "all" || draft.reviewStatus === statusFilter;
      const sourceDomainMatched =
        sourceDomainFilter === "all" ||
        draft.resourceInfo.sourceDomain === sourceDomainFilter;
      const resourceTypeMatched =
        resourceTypeFilter === "all" || draft.resourceType === resourceTypeFilter;
      const existingMatched =
        existingFilter === "all" ||
        (existingFilter === "with" && Boolean(draft.currentEnrichment)) ||
        (existingFilter === "without" && !draft.currentEnrichment);

      return (
        statusMatched &&
        sourceDomainMatched &&
        resourceTypeMatched &&
        existingMatched &&
        matchesSearch(draft, normalizedKeyword)
      );
    });
  }, [
    drafts,
    existingFilter,
    keyword,
    resourceTypeFilter,
    sourceDomainFilter,
    statusFilter,
  ]);

  const selectedDrafts = useMemo(
    () =>
      drafts.filter(
        (draft) => draft.resourceId && selectedKeys.has(getSelectionKey(draft)),
      ),
    [drafts, selectedKeys],
  );
  const selectableFilteredDrafts = useMemo(
    () => filteredDrafts.filter((draft) => draft.resourceId),
    [filteredDrafts],
  );
  const allFilteredSelected =
    selectableFilteredDrafts.length > 0 &&
    selectableFilteredDrafts.every((draft) =>
      selectedKeys.has(getSelectionKey(draft)),
    );

  function toggleSelection(draft: EnrichmentDraft) {
    const key = getSelectionKey(draft);

    if (!key) {
      return;
    }

    setSelectedKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  }

  function selectFilteredDrafts() {
    setSelectedKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      selectableFilteredDrafts.forEach((draft) => nextKeys.add(getSelectionKey(draft)));
      return nextKeys;
    });
  }

  async function updateReviewStatus(
    resourceId: string,
    reviewStatus: EnrichmentReviewStatus,
  ) {
    if (!resourceId) {
      setErrorMessage("该草稿缺少 resourceId，无法更新审核状态。");
      return;
    }

    setUpdatingId(resourceId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/enrichments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, reviewStatus }),
      });
      const responseBody = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(getApiErrorMessage(responseBody, "草稿状态更新失败。"));
      }

      await loadDrafts({ preserveMessages: true });
      setSuccessMessage(
        reviewStatus === "needs_revision"
          ? `已将 ${resourceId} 标记为需修改。请点击编辑草稿进行修改。`
          : `已更新 ${resourceId}。`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "草稿状态更新失败。");
    } finally {
      setUpdatingId("");
    }
  }

  async function updateSelectedReviewStatus(
    reviewStatus: EnrichmentReviewStatus,
    confirmLabel: string,
  ) {
    const items = selectedDrafts.map((draft) => ({ resourceId: draft.resourceId }));

    if (items.length === 0) {
      return;
    }

    if (!window.confirm(`确定要将选中的 ${items.length} 条草稿标记为${confirmLabel}吗？`)) {
      return;
    }

    setBulkUpdatingStatus(reviewStatus);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/enrichments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, reviewStatus }),
      });
      const responseBody = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(getApiErrorMessage(responseBody, "批量更新失败。"));
      }

      setSelectedKeys(new Set());
      setSuccessMessage(`已更新 ${responseBody.updatedCount ?? 0} 条草稿。`);
      await loadDrafts({ preserveMessages: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "批量更新失败。");
    } finally {
      setBulkUpdatingStatus(null);
    }
  }

  async function saveDraftUpdates(
    resourceId: string,
    updates: EnrichmentDraftUpdates,
  ) {
    if (!resourceId) {
      setErrorMessage("该草稿缺少 resourceId，无法保存。");
      return;
    }

    setSavingEditId(resourceId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/enrichments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateDraft",
          resourceId,
          updates,
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(getApiErrorMessage(responseBody, "草稿保存失败。"));
      }

      setEditingDraft(null);
      setSuccessMessage(`已保存 ${resourceId}，状态已恢复为待审核。`);
      await loadDrafts({ preserveMessages: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "草稿保存失败。");
    } finally {
      setSavingEditId("");
    }
  }

  async function applyDraft(draft: EnrichmentDraft) {
    if (draft.reviewStatus !== "accepted") {
      window.alert("请先接受该草稿，再应用。");
      return;
    }

    setApplyingId(draft.resourceId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/enrichments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          resourceIds: [draft.resourceId],
          updateExisting: true,
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(getApiErrorMessage(responseBody, "草稿应用失败。"));
      }

      setSuccessMessage(`已应用 ${responseBody.appliedCount ?? 0} 条草稿。`);
      await loadDrafts({ preserveMessages: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "草稿应用失败。");
    } finally {
      setApplyingId("");
    }
  }

  async function applySelectedDrafts() {
    const acceptedDrafts = selectedDrafts.filter(
      (draft) => draft.reviewStatus === "accepted",
    );
    const skippedCount = selectedDrafts.length - acceptedDrafts.length;

    if (acceptedDrafts.length === 0) {
      setErrorMessage("选中的草稿中没有 accepted 状态，无法应用。");
      return;
    }

    if (
      !window.confirm(
        `确定要应用 ${acceptedDrafts.length} 条已接受草稿吗？${
          skippedCount > 0 ? ` 其他 ${skippedCount} 条将跳过。` : ""
        }`,
      )
    ) {
      return;
    }

    setBulkApplying(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/enrichments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          resourceIds: acceptedDrafts.map((draft) => draft.resourceId),
          updateExisting: true,
        }),
      });
      const responseBody = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(getApiErrorMessage(responseBody, "批量应用失败。"));
      }

      setSelectedKeys(new Set());
      setSuccessMessage(
        `已应用 ${responseBody.appliedCount ?? 0} 条草稿。${
          skippedCount > 0 ? `已跳过 ${skippedCount} 条非 accepted 草稿。` : ""
        }`,
      );
      await loadDrafts({ preserveMessages: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "批量应用失败。");
    } finally {
      setBulkApplying(false);
    }
  }

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          该页面为本地开发阶段的 AI 草稿审核工具，暂不建议在公开生产环境暴露。
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="草稿总数" value={stats.total} />
          <StatCard label="待审核" value={stats.pending} />
          <StatCard label="已接受" value={stats.accepted} />
          <StatCard label="已拒绝" value={stats.rejected} />
          <StatCard label="需修改" value={stats.needsRevision} />
          <StatCard label="已应用" value={stats.applied} />
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
                placeholder="搜索 resourceId、标题、摘要、标签或链接"
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
                来源域名
              </span>
              <select
                value={sourceDomainFilter}
                onChange={(event) => setSourceDomainFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              >
                <option value="all">全部</option>
                {filterOptions.sourceDomains.map((sourceDomain) => (
                  <option key={sourceDomain} value={sourceDomain}>
                    {sourceDomain}
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
                onChange={(event) => setResourceTypeFilter(event.target.value)}
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
                正式 enrichment
              </span>
              <select
                value={existingFilter}
                onChange={(event) => setExistingFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
              >
                <option value="all">全部</option>
                <option value="with">已有正式 enrichment</option>
                <option value="without">暂无正式 enrichment</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              AI 草稿列表
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
                全选只会选择当前筛选结果。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectFilteredDrafts}
                disabled={selectableFilteredDrafts.length === 0 || allFilteredSelected}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                全选当前筛选结果
              </button>
              <button
                type="button"
                onClick={() => setSelectedKeys(new Set())}
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
              onClick={() => updateSelectedReviewStatus("needs_revision", "需修改")}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkUpdatingStatus === "needs_revision" ? "正在更新…" : "批量需修改"}
            </button>
            <button
              type="button"
              disabled={selectedDrafts.length === 0 || bulkApplying}
              onClick={applySelectedDrafts}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkApplying ? "正在应用…" : "批量应用 accepted 草稿"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            正在读取 AI enrichment 草稿……
          </div>
        ) : null}

        {!loading && filteredDrafts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {drafts.length === 0
                ? "暂无 AI enrichment 草稿。请先运行 npm run enrich:generate -- --limit 3。"
                : "暂无匹配草稿。你可以调整筛选条件。"}
            </p>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {filteredDrafts.map((draft) => (
            <article
              key={draft.resourceId}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start gap-4">
                <label className="mt-1 inline-flex shrink-0 items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(getSelectionKey(draft))}
                    disabled={!draft.resourceId}
                    onChange={() => toggleSelection(draft)}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
                    aria-label={`选择草稿 ${draft.resourceId}`}
                  />
                  <span className="sr-only">选择草稿</span>
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={draft.reviewStatus} />
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {getResourceTypeLabel(draft.resourceType)}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {draft.resourceInfo.sourceDomain || "未知来源"}
                    </span>
                    {draft.currentEnrichment ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        已有正式 enrichment
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        暂无正式 enrichment
                      </span>
                    )}
                    {draft.manuallyEdited ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        已人工编辑
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {draft.resourceId}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {draft.titleZh || "未命名 AI 草稿"}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {draft.resourceInfo.titleEn || "英文标题未记录"}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-600 md:grid-cols-2 dark:text-zinc-300">
                    <p>主专题：{draft.primaryTopicId || "未填写"}</p>
                    <p>sourceBasis：{draft.sourceBasis || "未记录"}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {draft.summaryShort || draft.summaryZh || "暂无摘要。"}
                  </p>
                  <div className="mt-3">
                    <KeyPointList points={draft.keyPoints.slice(0, 3)} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDraft(draft)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  查看详情
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDraft(draft)}
                  className={
                    draft.reviewStatus === "needs_revision"
                      ? "rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                      : "rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  }
                >
                  {draft.reviewStatus === "needs_revision"
                    ? "编辑草稿（需修改）"
                    : "编辑草稿"}
                </button>
                <button
                  type="button"
                  disabled={updatingId === draft.resourceId}
                  onClick={() => updateReviewStatus(draft.resourceId, "accepted")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  接受
                </button>
                <button
                  type="button"
                  disabled={updatingId === draft.resourceId}
                  onClick={() => updateReviewStatus(draft.resourceId, "rejected")}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  拒绝
                </button>
                <button
                  type="button"
                  disabled={updatingId === draft.resourceId}
                  onClick={() => updateReviewStatus(draft.resourceId, "needs_revision")}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  需修改
                </button>
                <button
                  type="button"
                  disabled={updatingId === draft.resourceId}
                  onClick={() => updateReviewStatus(draft.resourceId, "pending")}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  恢复待审核
                </button>
                <button
                  type="button"
                  disabled={applyingId === draft.resourceId}
                  onClick={() => applyDraft(draft)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applyingId === draft.resourceId ? "正在应用…" : "应用该草稿"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selectedDraft ? (
        <DraftDetailModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
      ) : null}
      {editingDraft ? (
        <DraftEditModal
          draft={editingDraft}
          saving={savingEditId === editingDraft.resourceId}
          onClose={() => {
            if (!savingEditId) {
              setEditingDraft(null);
            }
          }}
          onSave={saveDraftUpdates}
        />
      ) : null}
    </section>
  );
}
