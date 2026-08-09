"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type StatCard = {
  label: string;
  value: number;
  hint?: string;
};

type SourceStat = {
  sourceKey: string;
  labelZh: string;
  draftCount: number;
  accepted: number;
  pending: number;
  rejected: number;
  needsReview: number;
  published: number;
  readError?: string;
};

type MaintenanceTask = {
  id: string;
  label: string;
  count: number;
  status: "todo" | "done" | string;
};

type SnapshotResourceIssue = {
  resourceId: string;
  title: string;
  sourceDomain: string;
  sourceUrl: string;
  availableValidFileTypes: string[];
  missingFileTypes: string[];
  detailPath: string;
};

type SuspiciousSnapshotFile = {
  id: string;
  resourceId: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  minimumExpectedSize: number;
  detailPath: string;
};

type InstitutionManualReviewLink = {
  institutionId: string;
  nameZh: string;
  nameEn: string;
  website: string;
  status: string;
  statusCode: number;
  finalUrl: string;
  checkedAt: string;
  errorMessage: string;
  stateCode: string;
  stateName: string;
  stateNameZh: string;
  currentWebsite: string;
  currentLinkStatus: string;
  linkCheckNote: string;
  lastCheckedAt: string;
  previousWebsite: string;
};

type InstitutionLinkAudit = {
  hasReport: boolean;
  generatedAt: string;
  summary: {
    totalInstitutions: number;
    okCount: number;
    redirectedCount: number;
    blockedCount: number;
    notFoundCount: number;
    timeoutCount: number;
    networkErrorCount: number;
    needsManualReviewCount: number;
  };
  manualReviewLinks: InstitutionManualReviewLink[];
};

type AdminStats = {
  success?: boolean;
  generatedAt?: string;
  errors?: string[];
  overview: {
    acceptedResourcesTotal: number;
    draftsTotal: number;
    pendingDrafts: number;
    acceptedDrafts: number;
    rejectedDrafts: number;
    needsReviewDrafts: number;
  };
  enrichment: {
    enrichedResourcesTotal: number;
    unenrichedResourcesTotal: number;
    aiDraftsTotal: number;
    aiDraftsPending: number;
    aiDraftsAccepted: number;
    aiDraftsApplied: number;
  };
  snapshots: {
    totalResources: number;
    completeSnapshots: number;
    partialSnapshots: number;
    withoutSnapshots: number;
    missingFiles: number;
    suspiciousSmallFiles: number;
  };
  snapshotIssues: {
    partialSnapshotResources: SnapshotResourceIssue[];
    missingSnapshotResources: SnapshotResourceIssue[];
    suspiciousSmallFiles: SuspiciousSnapshotFile[];
  };
  institutionLinkAudit: InstitutionLinkAudit;
  bySource: SourceStat[];
  tasks: MaintenanceTask[];
};

const emptyStats: AdminStats = {
  overview: {
    acceptedResourcesTotal: 0,
    draftsTotal: 0,
    pendingDrafts: 0,
    acceptedDrafts: 0,
    rejectedDrafts: 0,
    needsReviewDrafts: 0,
  },
  enrichment: {
    enrichedResourcesTotal: 0,
    unenrichedResourcesTotal: 0,
    aiDraftsTotal: 0,
    aiDraftsPending: 0,
    aiDraftsAccepted: 0,
    aiDraftsApplied: 0,
  },
  snapshots: {
    totalResources: 0,
    completeSnapshots: 0,
    partialSnapshots: 0,
    withoutSnapshots: 0,
    missingFiles: 0,
    suspiciousSmallFiles: 0,
  },
  snapshotIssues: {
    partialSnapshotResources: [],
    missingSnapshotResources: [],
    suspiciousSmallFiles: [],
  },
  institutionLinkAudit: {
    hasReport: false,
    generatedAt: "",
    summary: {
      totalInstitutions: 0,
      okCount: 0,
      redirectedCount: 0,
      blockedCount: 0,
      notFoundCount: 0,
      timeoutCount: 0,
      networkErrorCount: 0,
      needsManualReviewCount: 0,
    },
    manualReviewLinks: [],
  },
  bySource: [],
  tasks: [],
};

const quickLinks = [
  { href: "/admin/drafts", label: "草稿审核" },
  { href: "/resources", label: "查看资料库" },
  { href: "/countries", label: "查看国家页面" },
  { href: "/institutions", label: "查看机构页面" },
];

const maintenanceCommands = [
  "npm run ingest:fr",
  "npm run ingest:nara-web",
  "npm run ingest:nara-catalog",
  "npm run drafts:export",
  "npm run enrich:generate -- --limit 5",
  "npm run enrich:apply",
  "npm run snapshot:generate -- --limit 5",
  "npm run snapshot:validate",
];

const fileTypeZh: Record<string, string> = {
  pdf: "PDF 快照",
  screenshot: "网页截图",
  html: "HTML 快照",
  document: "文档",
  image: "图片",
  web_archive: "网页存档",
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function fileTypeLabel(fileType: string) {
  return fileTypeZh[fileType] ?? fileType;
}

function formatFileTypes(fileTypes: string[]) {
  return fileTypes.length > 0
    ? fileTypes.map(fileTypeLabel).join("、")
    : "无";
}

function formatFileSize(fileSize: number) {
  if (!fileSize || fileSize <= 0) {
    return "未记录";
  }

  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeSnapshotResourceIssue(value: unknown): SnapshotResourceIssue {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    resourceId: stringValue(record.resourceId),
    title: stringValue(record.title),
    sourceDomain: stringValue(record.sourceDomain),
    sourceUrl: stringValue(record.sourceUrl),
    availableValidFileTypes: stringArrayValue(record.availableValidFileTypes),
    missingFileTypes: stringArrayValue(record.missingFileTypes),
    detailPath: stringValue(record.detailPath),
  };
}

function normalizeSuspiciousSnapshotFile(value: unknown): SuspiciousSnapshotFile {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: stringValue(record.id),
    resourceId: stringValue(record.resourceId),
    fileType: stringValue(record.fileType),
    fileUrl: stringValue(record.fileUrl),
    fileSize: numberValue(record.fileSize),
    minimumExpectedSize: numberValue(record.minimumExpectedSize),
    detailPath: stringValue(record.detailPath),
  };
}

function normalizeManualReviewLink(value: unknown): InstitutionManualReviewLink {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    institutionId: stringValue(record.institutionId),
    nameZh: stringValue(record.nameZh),
    nameEn: stringValue(record.nameEn),
    website: stringValue(record.website),
    status: stringValue(record.status) || "unknown",
    statusCode: numberValue(record.statusCode),
    finalUrl: stringValue(record.finalUrl),
    checkedAt: stringValue(record.checkedAt),
    errorMessage: stringValue(record.errorMessage),
    stateCode: stringValue(record.stateCode),
    stateName: stringValue(record.stateName),
    stateNameZh: stringValue(record.stateNameZh),
    currentWebsite: stringValue(record.currentWebsite),
    currentLinkStatus: stringValue(record.currentLinkStatus),
    linkCheckNote: stringValue(record.linkCheckNote),
    lastCheckedAt: stringValue(record.lastCheckedAt),
    previousWebsite: stringValue(record.previousWebsite),
  };
}

function normalizeInstitutionLinkAudit(value: unknown): InstitutionLinkAudit {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const summary =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : {};

  return {
    hasReport: Boolean(record.hasReport),
    generatedAt: stringValue(record.generatedAt),
    summary: {
      totalInstitutions: numberValue(summary.totalInstitutions),
      okCount: numberValue(summary.okCount),
      redirectedCount: numberValue(summary.redirectedCount),
      blockedCount: numberValue(summary.blockedCount),
      notFoundCount: numberValue(summary.notFoundCount),
      timeoutCount: numberValue(summary.timeoutCount),
      networkErrorCount: numberValue(summary.networkErrorCount),
      needsManualReviewCount: numberValue(summary.needsManualReviewCount),
    },
    manualReviewLinks: Array.isArray(record.manualReviewLinks)
      ? record.manualReviewLinks.map(normalizeManualReviewLink)
      : [],
  };
}

function normalizeStats(value: unknown): AdminStats {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const overview =
    record.overview && typeof record.overview === "object"
      ? (record.overview as Record<string, unknown>)
      : {};
  const enrichment =
    record.enrichment && typeof record.enrichment === "object"
      ? (record.enrichment as Record<string, unknown>)
      : {};
  const snapshots =
    record.snapshots && typeof record.snapshots === "object"
      ? (record.snapshots as Record<string, unknown>)
      : {};
  const snapshotIssues =
    record.snapshotIssues && typeof record.snapshotIssues === "object"
      ? (record.snapshotIssues as Record<string, unknown>)
      : {};

  return {
    success: Boolean(record.success),
    generatedAt: String(record.generatedAt ?? ""),
    errors: Array.isArray(record.errors)
      ? record.errors.map((error) => String(error)).filter(Boolean)
      : [],
    overview: {
      acceptedResourcesTotal: numberValue(overview.acceptedResourcesTotal),
      draftsTotal: numberValue(overview.draftsTotal),
      pendingDrafts: numberValue(overview.pendingDrafts),
      acceptedDrafts: numberValue(overview.acceptedDrafts),
      rejectedDrafts: numberValue(overview.rejectedDrafts),
      needsReviewDrafts: numberValue(overview.needsReviewDrafts),
    },
    enrichment: {
      enrichedResourcesTotal: numberValue(enrichment.enrichedResourcesTotal),
      unenrichedResourcesTotal: numberValue(enrichment.unenrichedResourcesTotal),
      aiDraftsTotal: numberValue(enrichment.aiDraftsTotal),
      aiDraftsPending: numberValue(enrichment.aiDraftsPending),
      aiDraftsAccepted: numberValue(enrichment.aiDraftsAccepted),
      aiDraftsApplied: numberValue(enrichment.aiDraftsApplied),
    },
    snapshots: {
      totalResources: numberValue(snapshots.totalResources),
      completeSnapshots: numberValue(snapshots.completeSnapshots),
      partialSnapshots: numberValue(snapshots.partialSnapshots),
      withoutSnapshots: numberValue(snapshots.withoutSnapshots),
      missingFiles: numberValue(snapshots.missingFiles),
      suspiciousSmallFiles: numberValue(snapshots.suspiciousSmallFiles),
    },
    snapshotIssues: {
      partialSnapshotResources: Array.isArray(
        snapshotIssues.partialSnapshotResources,
      )
        ? snapshotIssues.partialSnapshotResources.map(normalizeSnapshotResourceIssue)
        : [],
      missingSnapshotResources: Array.isArray(
        snapshotIssues.missingSnapshotResources,
      )
        ? snapshotIssues.missingSnapshotResources.map(normalizeSnapshotResourceIssue)
        : [],
      suspiciousSmallFiles: Array.isArray(snapshotIssues.suspiciousSmallFiles)
        ? snapshotIssues.suspiciousSmallFiles.map(normalizeSuspiciousSnapshotFile)
        : [],
    },
    institutionLinkAudit: normalizeInstitutionLinkAudit(
      record.institutionLinkAudit,
    ),
    bySource: Array.isArray(record.bySource)
      ? record.bySource.map((source) => {
          const sourceRecord =
            source && typeof source === "object"
              ? (source as Record<string, unknown>)
              : {};

          return {
            sourceKey: String(sourceRecord.sourceKey ?? ""),
            labelZh: String(sourceRecord.labelZh ?? "未命名来源"),
            draftCount: numberValue(sourceRecord.draftCount),
            accepted: numberValue(sourceRecord.accepted),
            pending: numberValue(sourceRecord.pending),
            rejected: numberValue(sourceRecord.rejected),
            needsReview: numberValue(sourceRecord.needsReview),
            published: numberValue(sourceRecord.published),
            readError: String(sourceRecord.readError ?? ""),
          };
        })
      : [],
    tasks: Array.isArray(record.tasks)
      ? record.tasks.map((task) => {
          const taskRecord =
            task && typeof task === "object"
              ? (task as Record<string, unknown>)
              : {};

          return {
            id: String(taskRecord.id ?? taskRecord.label ?? ""),
            label: String(taskRecord.label ?? ""),
            count: numberValue(taskRecord.count),
            status: String(taskRecord.status ?? "todo"),
          };
        })
      : [],
  };
}

function StatGrid({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {card.label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {card.value}
          </p>
          {card.hint ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {card.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TaskBadge({ status }: { status: MaintenanceTask["status"] }) {
  const done = status === "done";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        done
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      }`}
    >
      {done ? "已完成" : "待处理"}
    </span>
  );
}

function EmptyIssue() {
  return (
    <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      暂无相关问题。
    </p>
  );
}

function ResourceIssueList({
  issues,
  mode,
}: {
  issues: SnapshotResourceIssue[];
  mode: "partial" | "missing";
}) {
  if (issues.length === 0) {
    return <EmptyIssue />;
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <div
          key={`${mode}-${issue.resourceId}`}
          className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {issue.title || issue.resourceId}
              </h4>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {issue.resourceId}
              </p>
            </div>
            {issue.detailPath ? (
              <Link
                href={issue.detailPath}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
              >
                查看资料
              </Link>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
            {mode === "partial" ? (
              <>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    已保存类型
                  </dt>
                  <dd className="mt-0.5">
                    {formatFileTypes(issue.availableValidFileTypes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">缺少类型</dt>
                  <dd className="mt-0.5">
                    {formatFileTypes(issue.missingFileTypes)}
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">来源域名</dt>
                <dd className="mt-0.5">{issue.sourceDomain || "未记录"}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">sourceUrl</dt>
              <dd className="mt-0.5 break-all">
                {issue.sourceUrl ? (
                  <a
                    href={issue.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                  >
                    {issue.sourceUrl}
                  </a>
                ) : (
                  "未记录"
                )}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function SuspiciousFileList({ files }: { files: SuspiciousSnapshotFile[] }) {
  if (files.length === 0) {
    return <EmptyIssue />;
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div
          key={file.id || `${file.resourceId}-${file.fileUrl}`}
          className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {file.resourceId}
              </h4>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {fileTypeLabel(file.fileType)}
              </p>
            </div>
            {file.detailPath ? (
              <Link
                href={file.detailPath}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
              >
                查看资料
              </Link>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">文件大小</dt>
              <dd className="mt-0.5">{formatFileSize(file.fileSize)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">最低期望大小</dt>
              <dd className="mt-0.5">
                {formatFileSize(file.minimumExpectedSize)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">fileUrl</dt>
              <dd className="mt-0.5 break-all">{file.fileUrl || "未记录"}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

type InstitutionReviewGroupId =
  | "not_found"
  | "access_error"
  | "blocked"
  | "other";

type InstitutionReviewGroup = {
  id: InstitutionReviewGroupId;
  title: string;
  priorityLabel: string;
  description: string;
  statuses: string[];
  emptyText: string;
};

const institutionReviewGroups: InstitutionReviewGroup[] = [
  {
    id: "not_found",
    title: "疑似失效链接（404）",
    priorityLabel: "高优先级",
    description: "这些链接返回 404，建议优先查找新的官网地址。",
    statuses: ["not_found"],
    emptyText: "暂无 404 疑似失效链接。",
  },
  {
    id: "access_error",
    title: "访问异常",
    priorityLabel: "中优先级",
    description:
      "这些链接自动检测失败，可能是网络、TLS、超时或站点策略问题，建议人工打开确认。",
    statuses: ["timeout", "network_error"],
    emptyText: "暂无超时或网络异常链接。",
  },
  {
    id: "blocked",
    title: "自动检测受限",
    priorityLabel: "低优先级",
    description:
      "这些站点返回 403，可能阻止脚本访问，但浏览器人工访问可能正常。",
    statuses: ["blocked"],
    emptyText: "暂无自动检测受限链接。",
  },
];

const linkStatusZh: Record<string, string> = {
  ok: "链接正常",
  redirected: "重定向正常",
  blocked: "自动检测受限",
  manual_ok: "人工确认可访问",
  needs_recheck: "待重新校验",
  not_found: "疑似失效",
  timeout: "检测超时",
  network_error: "网络错误",
  unavailable: "暂无法访问",
  server_error: "服务器错误",
  unknown: "未知状态",
};

function linkStatusLabel(status: string) {
  return linkStatusZh[status] ?? (status || "未记录");
}

function institutionStatusBadgeClass(status: string) {
  if (status === "not_found") {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900";
  }

  if (status === "manual_ok" || status === "ok" || status === "redirected") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900";
  }

  if (status === "needs_recheck") {
    return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900";
  }

  if (status === "timeout" || status === "network_error") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900";
  }

  if (status === "blocked" || status === "unavailable") {
    return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
  }

  return "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700";
}

function priorityBadgeClass(groupId: InstitutionReviewGroupId) {
  if (groupId === "not_found") {
    return "bg-rose-600 text-white";
  }

  if (groupId === "access_error") {
    return "bg-amber-500 text-white";
  }

  return "bg-slate-600 text-white";
}

function formatStatusCode(statusCode: number) {
  return statusCode > 0 ? String(statusCode) : "未记录";
}

function getStateLabel(link: InstitutionManualReviewLink) {
  const stateName = link.stateNameZh || link.stateName;

  if (stateName && link.stateCode) {
    return `${stateName}（${link.stateCode}）`;
  }

  return stateName || link.stateCode;
}

function getInstitutionSearchUrl(link: InstitutionManualReviewLink) {
  const searchText = `${
    link.nameEn || link.nameZh || link.institutionId || link.website
  } state archives`.trim();

  return `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
}

type InstitutionRepairAction =
  | "updateWebsite"
  | "markManuallyVerified"
  | "markUnavailable";

function InstitutionLinkCard({ link }: { link: InstitutionManualReviewLink }) {
  const title = link.nameZh || link.nameEn || link.institutionId;
  const stateLabel = getStateLabel(link);
  const initialWebsite = link.currentWebsite || link.website;
  const initialStatus = link.currentLinkStatus || link.status;
  const [currentWebsite, setCurrentWebsite] = useState(initialWebsite);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [linkCheckNote, setLinkCheckNote] = useState(link.linkCheckNote);
  const [lastCheckedAt, setLastCheckedAt] = useState(link.lastCheckedAt);
  const [previousWebsite, setPreviousWebsite] = useState(link.previousWebsite);
  const [newWebsite, setNewWebsite] = useState("");
  const [savingAction, setSavingAction] = useState<InstitutionRepairAction | "">(
    "",
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setCurrentWebsite(initialWebsite);
    setCurrentStatus(initialStatus);
    setLinkCheckNote(link.linkCheckNote);
    setLastCheckedAt(link.lastCheckedAt);
    setPreviousWebsite(link.previousWebsite);
  }, [
    initialWebsite,
    initialStatus,
    link.linkCheckNote,
    link.lastCheckedAt,
    link.previousWebsite,
  ]);

  async function repairInstitutionLink(action: InstitutionRepairAction) {
    setSavingAction(action);
    setSuccessMessage("");
    setErrorMessage("");

    const body: Record<string, unknown> = {
      institutionId: link.institutionId,
      action,
    };

    if (action === "updateWebsite") {
      const website = newWebsite.trim();

      if (!website) {
        setErrorMessage("请输入新的官网链接。");
        setSavingAction("");
        return;
      }

      body.website = website;
    }

    try {
      const response = await fetch("/api/admin/institutions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const responseBody = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            institution?: {
              website?: string;
              linkStatus?: string;
              lastCheckedAt?: string;
              linkCheckNote?: string;
              previousWebsite?: string;
            };
          }
        | null;

      if (!response.ok || !responseBody?.success) {
        throw new Error(responseBody?.error || "机构链接更新失败。");
      }

      const updatedInstitution = responseBody.institution ?? {};

      setCurrentWebsite(updatedInstitution.website || currentWebsite);
      setCurrentStatus(updatedInstitution.linkStatus || currentStatus);
      setLastCheckedAt(updatedInstitution.lastCheckedAt || lastCheckedAt);
      setLinkCheckNote(updatedInstitution.linkCheckNote || linkCheckNote);
      setPreviousWebsite(updatedInstitution.previousWebsite || previousWebsite);

      if (action === "updateWebsite") {
        setNewWebsite("");
        setSuccessMessage("已更新官网链接，请重新运行链接校验。");
      }

      if (action === "markManuallyVerified") {
        setSuccessMessage("已标记为人工确认可访问。");
      }

      if (action === "markUnavailable") {
        setSuccessMessage("已标记为暂无法访问。");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "机构链接更新失败。",
      );
    } finally {
      setSavingAction("");
    }
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title || "未命名机构"}
          </h4>
          {link.nameEn && link.nameEn !== title ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {link.nameEn}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {link.institutionId || "未记录 institutionId"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${institutionStatusBadgeClass(
              link.status,
            )}`}
          >
            校验：{linkStatusLabel(link.status)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${institutionStatusBadgeClass(
              currentStatus,
            )}`}
          >
            当前：{linkStatusLabel(currentStatus)}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
        {stateLabel ? (
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">州名</dt>
            <dd className="mt-0.5">{stateLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">statusCode</dt>
          <dd className="mt-0.5">{formatStatusCode(link.statusCode)}</dd>
        </div>
        {lastCheckedAt ? (
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">lastCheckedAt</dt>
            <dd className="mt-0.5">{lastCheckedAt}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">当前官网链接</dt>
          <dd className="mt-0.5 break-all">{currentWebsite || "未记录"}</dd>
        </div>
        {link.website && link.website !== currentWebsite ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">
              校验报告中的 website
            </dt>
            <dd className="mt-0.5 break-all">{link.website}</dd>
          </div>
        ) : null}
        {previousWebsite ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">previousWebsite</dt>
            <dd className="mt-0.5 break-all">{previousWebsite}</dd>
          </div>
        ) : null}
        {linkCheckNote ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">处理备注</dt>
            <dd className="mt-0.5 break-words">{linkCheckNote}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">校验报告状态</dt>
          <dd className="mt-0.5">{linkStatusLabel(link.status)}</dd>
        </div>
        {link.finalUrl ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">finalUrl</dt>
            <dd className="mt-0.5 break-all">{link.finalUrl}</dd>
          </div>
        ) : null}
        {link.errorMessage ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">errorMessage</dt>
            <dd className="mt-0.5 break-words">{link.errorMessage}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
          链接修复
        </p>
        <label className="mt-3 block text-xs text-zinc-500 dark:text-zinc-400">
          新官网链接
          <input
            type="url"
            value={newWebsite}
            onChange={(event) => setNewWebsite(event.target.value)}
            placeholder={currentWebsite || "https://example.gov"}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-indigo-500 dark:focus:ring-indigo-950"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void repairInstitutionLink("updateWebsite")}
            disabled={Boolean(savingAction)}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAction === "updateWebsite" ? "保存中…" : "保存新链接"}
          </button>
          <button
            type="button"
            onClick={() => void repairInstitutionLink("markManuallyVerified")}
            disabled={Boolean(savingAction)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAction === "markManuallyVerified"
              ? "标记中…"
              : "标记人工确认可访问"}
          </button>
          <button
            type="button"
            onClick={() => void repairInstitutionLink("markUnavailable")}
            disabled={Boolean(savingAction)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {savingAction === "markUnavailable"
              ? "标记中…"
              : "标记暂无法访问"}
          </button>
        </div>
        {successMessage ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {currentWebsite ? (
          <a
            href={currentWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
          >
            打开官网
          </a>
        ) : null}
        <a
          href={getInstitutionSearchUrl(link)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
        >
          搜索机构
        </a>
      </div>
    </div>
  );
}

function InstitutionReviewGroupList({
  group,
  links,
  expanded,
  onToggle,
}: {
  group: InstitutionReviewGroup;
  links: InstitutionManualReviewLink[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const visibleLinks = expanded ? links : links.slice(0, 10);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityBadgeClass(
                group.id,
              )}`}
            >
              {group.priorityLabel}
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {group.title}
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {group.description}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {links.length} 条
        </span>
      </div>

      {links.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          {group.emptyText}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visibleLinks.map((link) => (
              <InstitutionLinkCard
                key={`${group.id}-${link.institutionId}-${link.website}`}
                link={link}
              />
            ))}
          </div>
          {links.length > 10 ? (
            <button
              type="button"
              onClick={onToggle}
              className="mt-4 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
            >
              {expanded ? "收起" : `展开全部 ${links.length} 条`}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedInstitutionGroups, setExpandedInstitutionGroups] = useState<
    Record<InstitutionReviewGroupId, boolean>
  >({
    not_found: false,
    access_error: false,
    blocked: false,
    other: false,
  });

  async function loadStats() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/stats", {
        cache: "no-store",
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;
      const normalizedStats = normalizeStats(responseBody);

      setStats(normalizedStats);

      if (!response.ok) {
        setErrorMessage("资料维护统计读取失败。");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "资料维护统计读取失败。",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const overviewCards = useMemo<StatCard[]>(
    () => [
      {
        label: "acceptedResources 总数",
        value: stats.overview.acceptedResourcesTotal,
      },
      { label: "草稿总数", value: stats.overview.draftsTotal },
      { label: "待审核草稿数", value: stats.overview.pendingDrafts },
      { label: "已接受草稿数", value: stats.overview.acceptedDrafts },
      { label: "已拒绝草稿数", value: stats.overview.rejectedDrafts },
      { label: "需进一步审核草稿数", value: stats.overview.needsReviewDrafts },
    ],
    [stats.overview],
  );
  const enrichmentCards = useMemo<StatCard[]>(
    () => [
      {
        label: "内容已完善资料数量",
        value: stats.enrichment.enrichedResourcesTotal,
      },
      {
        label: "未完善资料数量",
        value: stats.enrichment.unenrichedResourcesTotal,
      },
      {
        label: "AI enrichment 草稿数量",
        value: stats.enrichment.aiDraftsTotal,
      },
      {
        label: "AI enrichment pending 数量",
        value: stats.enrichment.aiDraftsPending,
      },
      {
        label: "AI enrichment accepted 数量",
        value: stats.enrichment.aiDraftsAccepted,
      },
      {
        label: "AI enrichment applied 数量",
        value: stats.enrichment.aiDraftsApplied,
      },
    ],
    [stats.enrichment],
  );
  const snapshotCards = useMemo<StatCard[]>(
    () => [
      { label: "总资料数", value: stats.snapshots.totalResources },
      { label: "完整快照数", value: stats.snapshots.completeSnapshots },
      { label: "部分快照数", value: stats.snapshots.partialSnapshots },
      { label: "无快照数", value: stats.snapshots.withoutSnapshots },
      { label: "缺失文件数", value: stats.snapshots.missingFiles },
      { label: "疑似异常文件数", value: stats.snapshots.suspiciousSmallFiles },
    ],
    [stats.snapshots],
  );
  const institutionAuditCards = useMemo<StatCard[]>(
    () => [
      {
        label: "机构总数",
        value: stats.institutionLinkAudit.summary.totalInstitutions,
      },
      { label: "ok 数量", value: stats.institutionLinkAudit.summary.okCount },
      {
        label: "redirected 数量",
        value: stats.institutionLinkAudit.summary.redirectedCount,
      },
      {
        label: "blocked 数量",
        value: stats.institutionLinkAudit.summary.blockedCount,
      },
      {
        label: "not_found 数量",
        value: stats.institutionLinkAudit.summary.notFoundCount,
      },
      {
        label: "timeout 数量",
        value: stats.institutionLinkAudit.summary.timeoutCount,
      },
      {
        label: "network_error 数量",
        value: stats.institutionLinkAudit.summary.networkErrorCount,
      },
      {
        label: "需人工复核数量",
        value: stats.institutionLinkAudit.summary.needsManualReviewCount,
      },
    ],
    [stats.institutionLinkAudit.summary],
  );
  const institutionReviewLinksByGroup = useMemo(
    () =>
      institutionReviewGroups.map((group) => ({
        group,
        links: stats.institutionLinkAudit.manualReviewLinks.filter((link) =>
          group.statuses.includes(link.status),
        ),
      })),
    [stats.institutionLinkAudit.manualReviewLinks],
  );
  const otherInstitutionReviewLinks = useMemo(() => {
    const groupedStatuses = new Set(
      institutionReviewGroups.flatMap((group) => group.statuses),
    );

    return stats.institutionLinkAudit.manualReviewLinks.filter(
      (link) => !groupedStatuses.has(link.status),
    );
  }, [stats.institutionLinkAudit.manualReviewLinks]);

  function toggleInstitutionGroup(groupId: InstitutionReviewGroupId) {
    setExpandedInstitutionGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          该页面为本地开发阶段的资料维护工作台，暂不建议在公开生产环境暴露。
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadStats()}
              className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              重新读取统计
            </button>
          </div>
        ) : null}

        {stats.errors?.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">部分数据文件读取异常：</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {stats.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            正在读取资料维护统计……
          </div>
        ) : (
          <>
            <Section title="资料总览">
              <StatGrid cards={overviewCards} />
            </Section>

            <Section title="Enrichment 状态">
              <StatGrid cards={enrichmentCards} />
            </Section>

            <Section title="快照状态">
              <StatGrid cards={snapshotCards} />
            </Section>

            <Section title="快照问题清单">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    label: "完整快照资料数",
                    value: stats.snapshots.completeSnapshots,
                  },
                  {
                    label: "部分快照资料数",
                    value: stats.snapshots.partialSnapshots,
                  },
                  {
                    label: "无快照资料数",
                    value: stats.snapshots.withoutSnapshots,
                  },
                  {
                    label: "异常小文件数",
                    value: stats.snapshots.suspiciousSmallFiles,
                  },
                  {
                    label: "缺失文件数",
                    value: stats.snapshots.missingFiles,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    部分快照资料
                  </h3>
                  <div className="mt-3">
                    <ResourceIssueList
                      issues={stats.snapshotIssues.partialSnapshotResources}
                      mode="partial"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    无快照资料
                  </h3>
                  <div className="mt-3">
                    <ResourceIssueList
                      issues={stats.snapshotIssues.missingSnapshotResources}
                      mode="missing"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    异常文件
                  </h3>
                  <div className="mt-3">
                    <SuspiciousFileList
                      files={stats.snapshotIssues.suspiciousSmallFiles}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="机构链接复核">
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
                修改官网链接后，请运行{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-sky-950">
                  npm run institutions:validate
                </code>
                ，或在管理员操作台中执行对应校验任务，以刷新校验报告。
              </div>
              {!stats.institutionLinkAudit.hasReport ? (
                <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  尚未生成机构校验报告，请先运行 npm run institutions:validate。
                </p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <StatGrid cards={institutionAuditCards} />
                    {stats.institutionLinkAudit.generatedAt ? (
                      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                        报告生成时间：{stats.institutionLinkAudit.generatedAt}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {institutionReviewLinksByGroup.map(({ group, links }) => (
                      <InstitutionReviewGroupList
                        key={group.id}
                        group={group}
                        links={links}
                        expanded={expandedInstitutionGroups[group.id]}
                        onToggle={() => toggleInstitutionGroup(group.id)}
                      />
                    ))}

                    {otherInstitutionReviewLinks.length > 0 ? (
                      <InstitutionReviewGroupList
                        group={{
                          id: "other",
                          title: "其他需人工复核链接",
                          priorityLabel: "补充复核",
                          description:
                            "这些链接属于报告中的其他异常状态，建议在处理完高、中、低优先级后再人工确认。",
                          statuses: [],
                          emptyText: "暂无其他需人工复核链接。",
                        }}
                        links={otherInstitutionReviewLinks}
                        expanded={expandedInstitutionGroups.other}
                        onToggle={() => toggleInstitutionGroup("other")}
                      />
                    ) : null}
                  </div>
                </div>
              )}
            </Section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Section title="按来源统计">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400">
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="py-2 pr-4 font-medium">来源</th>
                        <th className="py-2 pr-4 font-medium">草稿数量</th>
                        <th className="py-2 pr-4 font-medium">accepted</th>
                        <th className="py-2 pr-4 font-medium">pending</th>
                        <th className="py-2 pr-4 font-medium">rejected</th>
                        <th className="py-2 pr-4 font-medium">需进一步审核</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.bySource.map((source) => (
                        <tr
                          key={source.sourceKey}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                        >
                          <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                            {source.labelZh}
                            {source.readError ? (
                              <p className="mt-1 text-xs font-normal text-rose-600 dark:text-rose-300">
                                {source.readError}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                            {source.draftCount}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                            {source.accepted}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                            {source.pending}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                            {source.rejected}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                            {source.needsReview}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="待处理任务">
                <div className="space-y-3">
                  {stats.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {task.label}
                      </p>
                      <TaskBadge status={task.status} />
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title="快捷入口">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </Section>

              <Section title="常用命令">
                <div className="space-y-2">
                  {maintenanceCommands.map((command) => (
                    <code
                      key={command}
                      className="block rounded-lg bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
                    >
                      {command}
                    </code>
                  ))}
                </div>
              </Section>
            </div>

            {stats.generatedAt ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                统计生成时间：{stats.generatedAt}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
