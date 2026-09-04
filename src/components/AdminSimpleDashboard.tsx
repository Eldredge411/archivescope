"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type SimpleDashboardProps = {
  initialActionsEnabled: boolean;
  autopilotMessages: unknown;
  manualUrlDrafts: unknown;
  enrichmentDrafts: unknown;
  snapshotFiles: unknown;
  qualityReport: unknown;
  institutionMessages: unknown;
};

type AutopilotMessage = {
  id: string;
  resourceId: string;
  title: string;
  status: string;
  message: string;
  detailUrl: string;
  editUrl: string;
  enrichmentReviewUrl: string;
  sourceDomain: string;
  actionSummary: string;
  createdAt: string;
};

type ManualUrlDraft = {
  id: string;
  titleEn: string;
  titleZh: string;
  sourceUrl: string;
  sourceDomain: string;
  reviewStatus: string;
  createdAt: string;
};

type InstitutionDiscoveryMessage = {
  id: string;
  institutionId: string;
  title: string;
  status: string;
  message: string;
  detailUrl: string;
  editUrl: string;
  sourceDomain: string;
  actionSummary: string;
  createdAt: string;
};

type EnrichmentDraftPreview = {
  resourceId: string;
  titleZh: string;
  summaryShort: string;
  summaryZh: string;
  keyPoints: string[];
  researchValue: string;
  tags: string[];
  reviewStatus: string;
  updatedAt: string;
};

type SnapshotFilePreview = {
  resourceId: string;
  fileType: string;
  captureStatus: string;
};

type SnapshotStatus = {
  label: string;
  description: string;
  className: string;
  complete: boolean;
};

type ActionResult = {
  success: boolean;
  command: string;
  output: string;
  error: string;
};

type SchedulerState = {
  enabled: boolean;
  status: "running" | "stopped" | string;
  pid: number | null;
  intervalMinutes: number;
  batchSize: number;
  command: string;
  startedAt: string;
  stoppedAt: string;
  updatedAt: string;
  lastError: string;
};

type SchedulerLog = {
  startedAt?: string;
  finishedAt?: string;
  success?: boolean;
  output?: string;
  errorMessage?: string;
  batchSize?: number;
  intervalMinutes?: number;
};

type DiscoveryRun = {
  startedAt?: string;
  finishedAt?: string;
  success?: boolean;
  resourcesAdded?: number;
  institutionsAdded?: number;
  stoppedReason?: string;
};

type SchedulerStatus = {
  success?: boolean;
  actionsEnabled?: boolean;
  running?: boolean;
  state?: SchedulerState;
  lastSchedulerLog?: SchedulerLog | null;
  lastDiscoveryRun?: DiscoveryRun | null;
  message?: string;
  error?: string;
};

type SnapshotActionResult = {
  success: boolean;
  output: string;
  error: string;
};

type QualityProgress = {
  generatedAt: string;
  checkedResources: number;
  passed: number;
  needsEnrichment: number;
  needsSnapshot: number;
  needsHumanReview: number;
};

type CrawlResult = {
  success?: boolean;
  duplicate?: boolean;
  message?: string;
  error?: string;
  draft?: ManualUrlDraft;
};

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function numberValue(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: string) {
  if (!value) {
    return "未记录时间";
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

function addMinutesToIso(value: string, minutes: number) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMinutes(date.getMinutes() + minutes);

  return date.toISOString();
}

function schedulerStatusLabel(status: SchedulerStatus | null) {
  if (!status) {
    return "正在读取状态";
  }

  if (status.running) {
    return "运行中";
  }

  return "已暂停";
}

function schedulerStatusClassName(status: SchedulerStatus | null) {
  if (status?.running) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function schedulerStopReasonLabel(value: string) {
  const labels: Record<string, string> = {
    completed: "已完成",
    no_new_candidates: "暂时没有新的安全候选",
    resource_discovery_failed: "资料发现失败",
    institution_discovery_failed: "机构发现失败",
    quality_check_failed: "质量检查失败",
  };

  return labels[value] ?? (value || "未记录");
}

function normalizeMessages(value: unknown): AutopilotMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      id: stringValue(item.id),
      resourceId: stringValue(item.resourceId),
      title: stringValue(item.title),
      status: stringValue(item.status),
      message: stringValue(item.message),
      detailUrl: stringValue(item.detailUrl),
      editUrl: stringValue(item.editUrl),
      enrichmentReviewUrl: stringValue(item.enrichmentReviewUrl),
      sourceDomain: stringValue(item.sourceDomain),
      actionSummary: stringValue(item.actionSummary),
      createdAt: stringValue(item.createdAt),
    }))
    .filter((item) => item.id && item.resourceId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function normalizeManualUrlDrafts(value: unknown): ManualUrlDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      id: stringValue(item.id),
      titleEn: stringValue(item.titleEn),
      titleZh: stringValue(item.titleZh),
      sourceUrl: stringValue(item.sourceUrl),
      sourceDomain: stringValue(item.sourceDomain),
      reviewStatus: stringValue(item.reviewStatus),
      createdAt: stringValue(item.createdAt),
    }))
    .filter((item) => item.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function normalizeInstitutionMessages(value: unknown): InstitutionDiscoveryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      id: stringValue(item.id),
      institutionId: stringValue(item.institutionId),
      title: stringValue(item.title),
      status: stringValue(item.status),
      message: stringValue(item.message),
      detailUrl: stringValue(item.detailUrl),
      editUrl: stringValue(item.editUrl),
      sourceDomain: stringValue(item.sourceDomain),
      actionSummary: stringValue(item.actionSummary),
      createdAt: stringValue(item.createdAt),
    }))
    .filter((item) => item.id && item.institutionId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function normalizeEnrichmentDrafts(value: unknown): EnrichmentDraftPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      titleZh: stringValue(item.titleZh),
      summaryShort: stringValue(item.summaryShort),
      summaryZh: stringValue(item.summaryZh),
      keyPoints: stringArrayValue(item.keyPoints),
      researchValue: stringValue(item.researchValue),
      tags: stringArrayValue(item.tags),
      reviewStatus: stringValue(item.reviewStatus),
      updatedAt: stringValue(item.updatedAt),
    }))
    .filter((item) => item.resourceId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function normalizeSnapshotFiles(value: unknown): SnapshotFilePreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      fileType: stringValue(item.fileType),
      captureStatus: stringValue(item.captureStatus),
    }))
    .filter((item) => item.resourceId && item.fileType);
}

function normalizeQualityProgress(value: unknown): QualityProgress {
  const report =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const summary =
    report.summary &&
    typeof report.summary === "object" &&
    !Array.isArray(report.summary)
      ? (report.summary as Record<string, unknown>)
      : {};

  return {
    generatedAt: stringValue(report.generatedAt),
    checkedResources: numberValue(summary.checkedResources),
    passed: numberValue(summary.passed),
    needsEnrichment: numberValue(summary.needsEnrichment),
    needsSnapshot: numberValue(summary.needsSnapshot),
    needsHumanReview: numberValue(summary.needsHumanReview),
  };
}

function isSuccessfulSnapshotFile(file: SnapshotFilePreview) {
  return !file.captureStatus || file.captureStatus === "success";
}

function getSnapshotStatus(
  resourceId: string,
  snapshotTypesByResourceId: Map<string, Set<string>>,
  snapshotGeneratedResourceIds: Set<string>,
): SnapshotStatus {
  if (snapshotGeneratedResourceIds.has(resourceId)) {
    return {
      label: "快照已生成",
      description: "刚刚已执行快照保存。刷新后可在前台详情页看到最新状态。",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      complete: true,
    };
  }

  const types = snapshotTypesByResourceId.get(resourceId) ?? new Set<string>();
  const hasPdf = types.has("pdf");
  const hasScreenshot = types.has("screenshot");

  if (hasPdf && hasScreenshot) {
    return {
      label: "快照完整",
      description: "已有网页截图和 PDF 快照。",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      complete: true,
    };
  }

  if (hasPdf || hasScreenshot) {
    return {
      label: "部分快照",
      description: "已有部分快照，还可以补齐。",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      complete: false,
    };
  }

  return {
    label: "未生成快照",
    description: "AI 介绍不会自动等同于网页快照，可点击按钮单独保存来源页面。",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    complete: false,
  };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    applied: "已完成",
    accepted: "已接受，待发布",
    pending_review: "待人工看一下",
    needs_human_review: "需要你复核",
    skipped: "已跳过",
    failed: "失败",
  };

  return labels[status] ?? "已记录";
}

function statusClassName(status: string) {
  if (status === "applied" || status === "accepted") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  if (status === "failed") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  }

  if (status === "needs_human_review" || status === "pending_review") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function simpleOutputSummary(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const messageStartIndex = lines.findIndex((line) => line === "智能体消息：");
  const messageEndIndex =
    messageStartIndex >= 0
      ? lines.findIndex(
          (line, index) =>
            index > messageStartIndex && line.startsWith("智能体消息写入路径"),
        )
      : -1;
  const messageLines =
    messageStartIndex >= 0
      ? lines.slice(
          messageStartIndex,
          messageEndIndex >= 0 ? messageEndIndex : messageStartIndex + 8,
        )
      : [];
  const usefulLines = lines.filter(
    (line) =>
      line.includes("智能体消息") ||
      line.startsWith("- 《") ||
      line.includes("每轮最多自动处理") ||
      line.includes("连续处理轮数") ||
      line.includes("第 ") ||
      line.includes("本批资料部分完成") ||
      line.includes("本次生成智能体消息数量") ||
      line.includes("没有符合") ||
      line.includes("自动应用数量") ||
      line.includes("真实失败数量") ||
      line.includes("needs_enrichment") ||
      line.includes("官方资料扩充") ||
      line.includes("本次新增") ||
      line.includes("新增资料已发布") ||
      line.includes("可新增候选数量") ||
      line.startsWith("- "),
  );

  return (
    [...new Set([...usefulLines.slice(-8), ...messageLines])].join("\n") ||
    lines.slice(-8).join("\n")
  );
}

function snapshotOutputSummary(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const usefulLines = lines.filter(
    (line) =>
      line.includes("快照") ||
      line.includes("Federal Register") ||
      line.includes("本次待处理数量") ||
      line.includes("新生成快照记录数量") ||
      line.includes("没有需要生成快照") ||
      line.includes("开始时仍需常规补采") ||
      line.includes("结束时仍需常规补采") ||
      line.includes("停止原因") ||
      line.includes("循环补快照已结束") ||
      line.includes("是否成功") ||
      line.includes("失败原因") ||
      line.includes("写入路径"),
  );

  return (usefulLines.length > 0 ? usefulLines : lines).slice(-10).join("\n");
}

function getGeneratedSnapshotRecordCount(output: string) {
  const match = output.match(/新生成快照记录数量：(\d+)/);

  if (!match) {
    return null;
  }

  const count = Number.parseInt(match[1] ?? "", 10);

  return Number.isFinite(count) ? count : null;
}

function getBackfillRemainingCount(output: string) {
  const match = output.match(/结束时仍需常规补采：(\d+)/);

  if (!match) {
    return null;
  }

  const count = Number.parseInt(match[1] ?? "", 10);

  return Number.isFinite(count) ? count : null;
}

function snapshotResultText(output: string, batch = false) {
  if (output.includes("循环补快照已结束")) {
    const remaining = getBackfillRemainingCount(output);

    if (remaining === 0) {
      return "自动循环补快照已完成，普通官网资料的网页快照已补齐。";
    }

    if (remaining !== null) {
      return `自动循环补快照已结束，普通官网资料还剩 ${remaining} 条需要后续处理。`;
    }

    return "自动循环补快照已结束。";
  }

  if (output.includes("本次没有成功生成新的快照记录") || output.includes("是否成功：否")) {
    return batch
      ? "本批快照任务已结束，但有资料没有成功保存网页快照。"
      : "这条资料暂时没有成功保存网页快照。可能是外部网站阻止访问或页面无法生成快照。";
  }

  const generatedCount = getGeneratedSnapshotRecordCount(output);

  if (generatedCount !== null && generatedCount > 0) {
    return batch
      ? `本批网页快照任务已完成，实际写入 ${generatedCount} 条快照记录。`
      : `网页快照已实际写入 ${generatedCount} 条文件。刷新页面后可在前台“来源与保存”区域查看。`;
  }

  if (output.includes("是否成功：部分成功")) {
    return "网页快照部分保存成功，可能只生成了 PDF 或截图中的一种。";
  }

  if (output.includes("已有快照记录")) {
    return "系统检测到已有快照记录，本次没有重新生成。若前台仍未显示，说明旧文件可能不可用，需要到高级后台强制重新生成。";
  }

  return batch
    ? "本批快照任务已结束，但没有确认写入新的快照记录。"
    : "快照任务已结束，但没有确认写入新的 PDF 或截图文件。";
}

function snapshotResultSucceeded(output: string) {
  if (output.includes("循环补快照已结束")) {
    return !output.includes("generate_failed") && !output.includes("validate_failed");
  }

  if (
    output.includes("本次没有成功生成新的快照记录") ||
    output.includes("是否成功：否")
  ) {
    return false;
  }

  const generatedCount = getGeneratedSnapshotRecordCount(output);

  if (generatedCount !== null) {
    return generatedCount > 0;
  }

  return output.includes("是否成功：是") || output.includes("是否成功：部分成功");
}

function canAutoBatchSnapshot(sourceDomain: string) {
  return stringValue(sourceDomain).toLowerCase() !== "federalregister.gov";
}

function PrimaryPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminSimpleDashboard({
  initialActionsEnabled,
  autopilotMessages,
  manualUrlDrafts,
  enrichmentDrafts,
  snapshotFiles,
  qualityReport,
  institutionMessages,
}: SimpleDashboardProps) {
  const router = useRouter();
  const messages = useMemo(
    () => normalizeMessages(autopilotMessages),
    [autopilotMessages],
  );
  const recentMessages = messages.slice(0, 20);
  const recentManualDrafts = useMemo(
    () => normalizeManualUrlDrafts(manualUrlDrafts).slice(0, 5),
    [manualUrlDrafts],
  );
  const recentInstitutionMessages = useMemo(
    () => normalizeInstitutionMessages(institutionMessages).slice(0, 12),
    [institutionMessages],
  );
  const allEnrichmentDrafts = useMemo(
    () => normalizeEnrichmentDrafts(enrichmentDrafts),
    [enrichmentDrafts],
  );
  const qualityProgress = useMemo(
    () => normalizeQualityProgress(qualityReport),
    [qualityReport],
  );
  const pendingDraftCount = allEnrichmentDrafts.filter(
    (draft) => draft.reviewStatus === "pending",
  ).length;
  const acceptedDraftCount = allEnrichmentDrafts.filter(
    (draft) => draft.reviewStatus === "accepted",
  ).length;
  const appliedDraftCount = allEnrichmentDrafts.filter(
    (draft) => draft.reviewStatus === "applied",
  ).length;
  const draftByResourceId = useMemo(() => {
    const draftMap = new Map<string, EnrichmentDraftPreview>();

    for (const draft of allEnrichmentDrafts) {
      if (!draftMap.has(draft.resourceId)) {
        draftMap.set(draft.resourceId, draft);
      }
    }

    return draftMap;
  }, [allEnrichmentDrafts]);
  const snapshotTypesByResourceId = useMemo(() => {
    const snapshotMap = new Map<string, Set<string>>();

    for (const file of normalizeSnapshotFiles(snapshotFiles)) {
      if (!isSuccessfulSnapshotFile(file)) {
        continue;
      }

      const currentTypes = snapshotMap.get(file.resourceId) ?? new Set<string>();

      currentTypes.add(file.fileType);
      snapshotMap.set(file.resourceId, currentTypes);
    }

    return snapshotMap;
  }, [snapshotFiles]);
  const [running, setRunning] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<ActionResult | null>(
    null,
  );
  const [schedulerStatus, setSchedulerStatus] =
    useState<SchedulerStatus | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState("");
  const [refreshingQuality, setRefreshingQuality] = useState(false);
  const [qualityRefreshMessage, setQualityRefreshMessage] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlNotes, setCrawlNotes] = useState("");
  const [crawlRunning, setCrawlRunning] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [hiddenResourceIds, setHiddenResourceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [publishedResourceIds, setPublishedResourceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [publishingResourceId, setPublishingResourceId] = useState("");
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<{
    draft: EnrichmentDraftPreview;
    message: AutopilotMessage;
  } | null>(null);
  const [snapshotResourceId, setSnapshotResourceId] = useState("");
  const [snapshotBatchRunning, setSnapshotBatchRunning] = useState(false);
  const [snapshotGeneratedResourceIds, setSnapshotGeneratedResourceIds] =
    useState<Set<string>>(() => new Set());
  const [snapshotMessage, setSnapshotMessage] = useState<{
    success: boolean;
    text: string;
    output: string;
  } | null>(null);
  const [hideMessage, setHideMessage] = useState("");

  function isPublishedMessage(
    message: AutopilotMessage,
    draft?: EnrichmentDraftPreview,
  ) {
    return (
      publishedResourceIds.has(message.resourceId) ||
      message.status === "applied" ||
      draft?.reviewStatus === "applied"
    );
  }

  function canPublishMessage(message: AutopilotMessage) {
    const draft = draftByResourceId.get(message.resourceId);

    return Boolean(
      draft &&
        !hiddenResourceIds.has(message.resourceId) &&
        !isPublishedMessage(message, draft) &&
        message.status !== "failed" &&
        draft.reviewStatus !== "rejected",
    );
  }

  const publishableMessages = recentMessages.filter((message) =>
    canPublishMessage(message),
  );

  async function loadSchedulerStatus() {
    try {
      const response = await fetch("/api/admin/archive-discovery-scheduler", {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | SchedulerStatus
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "自动扩库状态读取失败。");
      }

      setSchedulerStatus(body);
    } catch (error) {
      setSchedulerStatus({
        success: false,
        running: false,
        error:
          error instanceof Error ? error.message : "自动扩库状态读取失败。",
      });
    }
  }

  useEffect(() => {
    void loadSchedulerStatus();
  }, []);

  async function toggleScheduler(action: "start" | "stop") {
    if (!initialActionsEnabled) {
      setSchedulerMessage(
        "后台自动执行未开启。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      );
      return;
    }

    setSchedulerLoading(true);
    setSchedulerMessage(
      action === "start" ? "正在开启每小时自动扩库……" : "正在暂停自动扩库……",
    );

    try {
      const response = await fetch("/api/admin/archive-discovery-scheduler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          intervalMinutes: 60,
          batchSize: 8,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | SchedulerStatus
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "自动扩库开关操作失败。");
      }

      setSchedulerStatus(body);
      setSchedulerMessage(
        body.message ||
          (action === "start"
            ? "已开启每小时自动扩库。"
            : "已暂停每小时自动扩库。"),
      );
      router.refresh();
    } catch (error) {
      setSchedulerMessage(
        error instanceof Error ? error.message : "自动扩库开关操作失败。",
      );
    } finally {
      setSchedulerLoading(false);
    }
  }

  async function runAutopilot() {
    if (!initialActionsEnabled) {
      setActionResult({
        success: false,
        command: "",
        output: "",
        error:
          "后台命令执行未启用。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      });
      return;
    }

    setRunning(true);
    setActionResult(null);

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resource-enrichment-autopilot",
          params: {
            limit: 20,
            rounds: 5,
            aiTimeout: 60,
            autoSafe: true,
            publishAll: true,
            background: true,
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            command?: string;
            output?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "智能体启动失败。");
      }

      setActionResult({
        success: Boolean(body.success),
        command: stringValue(body.command),
        output: stringValue(body.output),
        error: stringValue(body.error),
      });

      if (
        body.success ||
        stringValue(body.output).includes("智能体消息写入路径")
      ) {
        router.refresh();
      }
    } catch (error) {
      setActionResult({
        success: false,
        command: "",
        output: "",
        error: error instanceof Error ? error.message : "智能体启动失败。",
      });
    } finally {
      setRunning(false);
    }
  }

  async function runDiscoveryAutopublish() {
    if (!initialActionsEnabled) {
      setDiscoveryResult({
        success: false,
        command: "",
        output: "",
        error:
          "后台命令执行未启用。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      });
      return;
    }

    setDiscoveryRunning(true);
    setDiscoveryResult(null);

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "archive-discovery-cycle",
          params: {
            batchSize: 8,
            resourceLimit: 8,
            institutionLimit: 8,
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            command?: string;
            output?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "安全巡检扩库失败。");
      }

      setDiscoveryResult({
        success: Boolean(body.success),
        command: stringValue(body.command),
        output: stringValue(body.output),
        error: stringValue(body.error),
      });

      if (body.success) {
        router.refresh();
      }
    } catch (error) {
      setDiscoveryResult({
        success: false,
        command: "",
        output: "",
        error: error instanceof Error ? error.message : "安全巡检扩库失败。",
      });
    } finally {
      setDiscoveryRunning(false);
    }
  }

  async function refreshQualityProgress() {
    if (!initialActionsEnabled) {
      setQualityRefreshMessage(
        "后台命令执行未启用，暂时不能更新统计。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      );
      return;
    }

    setRefreshingQuality(true);
    setQualityRefreshMessage("正在更新剩余数量……");

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resource-quality-check",
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
          }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "统计更新失败。");
      }

      setQualityRefreshMessage("剩余数量已更新。");
      router.refresh();
    } catch (error) {
      setQualityRefreshMessage(
        error instanceof Error ? error.message : "统计更新失败。",
      );
    } finally {
      setRefreshingQuality(false);
    }
  }

  async function crawlSingleUrl() {
    setCrawlRunning(true);
    setCrawlResult(null);

    try {
      const response = await fetch("/api/admin/crawl-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: crawlUrl,
          notes: crawlNotes,
        }),
      });
      const body = (await response.json().catch(() => null)) as CrawlResult | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "网址采集失败。");
      }

      setCrawlResult(body);

      if (body.success) {
        setCrawlUrl("");
        setCrawlNotes("");
        router.refresh();
      }
    } catch (error) {
      setCrawlResult({
        success: false,
        error: error instanceof Error ? error.message : "网址采集失败。",
      });
    } finally {
      setCrawlRunning(false);
    }
  }

  async function hideResource(resourceId: string) {
    const confirmed = window.confirm(
      "确定要把这条资料隐藏出前台资料库吗？这比真正删除更安全，以后可以恢复。",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/admin/resource-curation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId,
          decision: "hidden",
          hiddenFromLibrary: true,
          reason: "简易后台人工隐藏。",
          notes: "从智能体处理消息中执行隐藏。",
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "隐藏失败。");
      }

      setHiddenResourceIds((current) => new Set([...current, resourceId]));
      setHideMessage("已隐藏出前台资料库。刷新审计后会同步最新状态。");
    } catch (error) {
      setHideMessage(error instanceof Error ? error.message : "隐藏失败。");
    }
  }

  async function publishAiDraft(
    resourceId: string,
    options: {
      confirm?: boolean;
      quiet?: boolean;
      refresh?: boolean;
    } = {},
  ) {
    const shouldConfirm = options.confirm ?? true;

    if (shouldConfirm) {
      const confirmed = window.confirm(
        "确定把这条 AI 生成内容发布到前台吗？发布后前台会显示中文标题、摘要和资料解读。",
      );

      if (!confirmed) {
        return { success: false, error: "已取消发布。" };
      }
    }

    setPublishingResourceId(resourceId);

    if (!options.quiet) {
      setHideMessage("");
    }

    try {
      const acceptResponse = await fetch("/api/admin/enrichments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId,
          reviewStatus: "accepted",
        }),
      });
      const acceptBody = (await acceptResponse.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!acceptResponse.ok || !acceptBody?.success) {
        throw new Error(acceptBody?.error || "接受 AI 草稿失败。");
      }

      const applyResponse = await fetch("/api/admin/enrichments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "apply",
          resourceIds: [resourceId],
          updateExisting: true,
        }),
      });
      const applyBody = (await applyResponse.json().catch(() => null)) as
        | {
            success?: boolean;
            appliedCount?: number;
            error?: string;
            failedItems?: Array<{ message?: string }>;
          }
        | null;

      if (!applyResponse.ok || !applyBody?.success) {
        throw new Error(applyBody?.error || "应用 AI 草稿失败。");
      }

      if ((applyBody.appliedCount ?? 0) < 1) {
        const failureMessage = applyBody.failedItems?.[0]?.message;

        throw new Error(failureMessage || "没有成功应用到前台。");
      }

      setPublishedResourceIds((current) => new Set([...current, resourceId]));

      if (!options.quiet) {
        setHideMessage(
          "已发布到前台。重新打开或刷新资料详情页后即可看到中文标题和介绍；如果还没有网页快照，可以点击“生成网页快照”。",
        );
      }

      if (options.refresh !== false) {
        router.refresh();
      }

      return { success: true, error: "" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "发布 AI 内容失败。";

      if (!options.quiet) {
        setHideMessage(errorMessage);
      }

      return { success: false, error: errorMessage };
    } finally {
      setPublishingResourceId("");
    }
  }

  async function publishAllVisibleDrafts() {
    if (publishableMessages.length === 0) {
      setHideMessage("当前没有可一键发布的 AI 内容。");
      return;
    }

    const confirmed = window.confirm(
      `确定把当前列表中 ${publishableMessages.length} 条 AI 生成内容发布到前台吗？发布后普通用户会看到这些中文标题、摘要和资料解读。`,
    );

    if (!confirmed) {
      return;
    }

    setBatchPublishing(true);
    setHideMessage("正在逐条发布到前台，并同步补适合批量处理的网页快照，请稍等……");

    let successCount = 0;
    let snapshotSuccessCount = 0;
    let snapshotFailedCount = 0;
    let snapshotSkippedCount = 0;
    const failedItems: string[] = [];
    const snapshotFailedItems: string[] = [];
    const publishedMessages: AutopilotMessage[] = [];

    for (const message of publishableMessages) {
      const result = await publishAiDraft(message.resourceId, {
        confirm: false,
        quiet: true,
        refresh: false,
      });

      if (result.success) {
        successCount += 1;
        publishedMessages.push(message);
      } else {
        failedItems.push(`${message.title || message.resourceId}：${result.error}`);
      }
    }

    for (const message of publishedMessages) {
      const snapshotStatus = getSnapshotStatus(
        message.resourceId,
        snapshotTypesByResourceId,
        snapshotGeneratedResourceIds,
      );

      if (snapshotStatus.complete) {
        continue;
      }

      if (!canAutoBatchSnapshot(message.sourceDomain)) {
        snapshotSkippedCount += 1;
        continue;
      }

      const snapshotResult = await runSnapshotAction(message.resourceId);

      if (snapshotResult.success) {
        snapshotSuccessCount += 1;
        setSnapshotGeneratedResourceIds(
          (current) => new Set([...current, message.resourceId]),
        );
      } else {
        snapshotFailedCount += 1;
        snapshotFailedItems.push(
          `${message.title || message.resourceId}：${
            snapshotResult.error || snapshotOutputSummary(snapshotResult.output)
          }`,
        );
      }
    }

    setBatchPublishing(false);
    const resultParts = [`已发布 ${successCount} 条到前台`];

    if (snapshotSuccessCount > 0) {
      resultParts.push(`同步补快照 ${snapshotSuccessCount} 条`);
    }

    if (snapshotSkippedCount > 0) {
      resultParts.push(
        `${snapshotSkippedCount} 条 Federal Register 资料未批量补快照，可在卡片上单条尝试`,
      );
    }

    if (snapshotFailedCount > 0) {
      resultParts.push(`${snapshotFailedCount} 条快照生成失败`);
    }

    if (failedItems.length > 0) {
      resultParts.push(`${failedItems.length} 条未发布成功：${failedItems.join("；")}`);
    }

    if (snapshotFailedItems.length > 0) {
      resultParts.push(`快照问题：${snapshotFailedItems.join("；")}`);
    }

    setHideMessage(`${resultParts.join("；")}。`);
    router.refresh();
  }

  async function runSnapshotAction(
    resourceId: string,
  ): Promise<SnapshotActionResult> {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "snapshot-generate",
          params: {
            resourceId,
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            output?: string;
            error?: string;
          }
        | null;
      const output = stringValue(body?.output);

      if (!response.ok || !body?.success) {
        return {
          success: false,
          output,
          error: body?.error || output || "网页快照生成失败。",
        };
      }

      return {
        success: snapshotResultSucceeded(output),
        output,
        error: snapshotResultSucceeded(output) ? "" : snapshotResultText(output),
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : "网页快照生成失败。",
      };
    }
  }

  async function generateSnapshot(resourceId: string, sourceDomain = "") {
    if (!initialActionsEnabled) {
      setSnapshotMessage({
        success: false,
        text: "后台命令执行未启用，暂时不能生成网页快照。",
        output: "请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      });
      return;
    }

    if (sourceDomain === "federalregister.gov") {
      const confirmed = window.confirm(
        "这条资料来自 Federal Register。为避免触发官方访问验证，系统不会批量截图；如果你确实需要，可以单独尝试生成这一条的快照。是否继续？",
      );

      if (!confirmed) {
        return;
      }
    }

    setSnapshotResourceId(resourceId);
    setSnapshotMessage({
      success: true,
      text: "正在生成网页快照，可能需要半分钟到几分钟。",
      output: "",
    });

    try {
      const result = await runSnapshotAction(resourceId);
      const output = stringValue(result.output);

      if (result.success) {
        setSnapshotGeneratedResourceIds(
          (current) => new Set([...current, resourceId]),
        );
      }

      setSnapshotMessage({
        success: result.success,
        text: result.success
          ? snapshotResultText(output)
          : result.error || snapshotResultText(output),
        output,
      });
      router.refresh();
    } catch (error) {
      setSnapshotMessage({
        success: false,
        text: error instanceof Error ? error.message : "网页快照生成失败。",
        output: "",
      });
    } finally {
      setSnapshotResourceId("");
    }
  }

  async function generateSnapshotBatch() {
    if (!initialActionsEnabled) {
      setSnapshotMessage({
        success: false,
        text: "后台命令执行未启用，暂时不能生成网页快照。",
        output: "请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      });
      return;
    }

    setSnapshotBatchRunning(true);
    setSnapshotMessage({
      success: true,
      text: "正在自动循环补网页快照：每批 3 条，系统会避开 Federal Register 的批量截图。",
      output: "",
    });

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "snapshot-backfill",
          params: {
            batchSize: 3,
            rounds: 50,
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            output?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || body?.output || "循环补快照失败。");
      }

      const output = stringValue(body.output);

      setSnapshotMessage({
        success: snapshotResultSucceeded(output),
        text: snapshotResultText(output, true),
        output,
      });
      router.refresh();
    } catch (error) {
      setSnapshotMessage({
        success: false,
        text: error instanceof Error ? error.message : "循环补快照失败。",
        output: "",
      });
    } finally {
      setSnapshotBatchRunning(false);
    }
  }

  const schedulerState = schedulerStatus?.state;
  const lastDiscoveryRun = schedulerStatus?.lastDiscoveryRun;
  const lastSchedulerLog = schedulerStatus?.lastSchedulerLog;
  const nextSchedulerRunAt =
    schedulerStatus?.running && lastSchedulerLog?.finishedAt
      ? addMinutesToIso(
          stringValue(lastSchedulerLog.finishedAt),
          numberValue(schedulerState?.intervalMinutes) || 60,
        )
      : "";

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/20">
              简易后台
            </span>
            <Link
              href="/"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
            >
              返回前台
            </Link>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            ArchiveScope 管理后台
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-300">
            这里保留最常用的动作：让智能体批量完善资料、查看每条处理结果、粘贴网址扩充资料库。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        <PrimaryPanel
          title="资料完善进度"
          description="这里显示当前前台资料库还有多少条缺少详细介绍。智能体后台处理完成后，点击“更新剩余数量”刷新统计。"
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: "还缺详细信息",
                value: qualityProgress.needsEnrichment,
                tone: "text-rose-700 dark:text-rose-300",
              },
              {
                label: "已检查资料",
                value: qualityProgress.checkedResources,
                tone: "text-zinc-900 dark:text-zinc-50",
              },
              {
                label: "已完善通过",
                value: qualityProgress.passed,
                tone: "text-emerald-700 dark:text-emerald-300",
              },
              {
                label: "AI 草稿待确认",
                value: pendingDraftCount,
                tone: "text-amber-700 dark:text-amber-300",
              },
              {
                label: "已接受待发布",
                value: acceptedDraftCount,
                tone: "text-indigo-700 dark:text-indigo-300",
              },
              {
                label: "已发布累计",
                value: appliedDraftCount,
                tone: "text-emerald-700 dark:text-emerald-300",
              },
              {
                label: "需人工复核",
                value: qualityProgress.needsHumanReview,
                tone: "text-orange-700 dark:text-orange-300",
              },
              {
                label: "缺网页快照",
                value: qualityProgress.needsSnapshot,
                tone: "text-sky-700 dark:text-sky-300",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.label}
                </p>
                <p className={`mt-1 text-2xl font-semibold ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshQualityProgress()}
              disabled={refreshingQuality || !initialActionsEnabled}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              {refreshingQuality ? "正在更新剩余数量…" : "更新剩余数量"}
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              刷新页面
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              最近检查：
              {qualityProgress.generatedAt
                ? formatDateTime(qualityProgress.generatedAt)
                : "还没有统计文件"}
            </span>
          </div>

          {qualityRefreshMessage ? (
            <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
              {qualityRefreshMessage}
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            “AI 草稿待确认”和“已接受待发布”表示内容已经生成，但可能还没真正显示到前台；发布后再更新剩余数量，红色数字会继续下降。
          </p>
        </PrimaryPanel>

        <PrimaryPanel
          title="1. 自动扩库开关"
          description="开启后，智能体会在本机后台每小时安全巡检一次，发现合适的资料或机构就补到前台。"
        >
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${schedulerStatusClassName(
                      schedulerStatus,
                    )}`}
                  >
                    {schedulerStatusLabel(schedulerStatus)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    默认每 60 分钟运行一次，每轮最多补入 8 条。
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  开关只在你的电脑和本地网站服务运行时有效。电脑睡眠、关机或开发服务关闭后，自动扩库也会停止。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void toggleScheduler("start")}
                  disabled={
                    schedulerLoading ||
                    schedulerStatus?.running ||
                    !initialActionsEnabled
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {schedulerLoading && !schedulerStatus?.running
                    ? "正在开启…"
                    : "开启每小时自动扩库"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleScheduler("stop")}
                  disabled={
                    schedulerLoading ||
                    !schedulerStatus?.running ||
                    !initialActionsEnabled
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {schedulerLoading && schedulerStatus?.running
                    ? "正在暂停…"
                    : "暂停自动扩库"}
                </button>
                <button
                  type="button"
                  onClick={() => void loadSchedulerStatus()}
                  disabled={schedulerLoading}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  刷新开关状态
                </button>
              </div>
            </div>

            {!initialActionsEnabled ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                后台自动执行未开启。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。
              </p>
            ) : null}

            {schedulerMessage ? (
              <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
                {schedulerMessage}
              </p>
            ) : null}

            {schedulerStatus?.error || schedulerState?.lastError ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
                {schedulerStatus?.error || schedulerState?.lastError}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  最近一次巡检
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {lastDiscoveryRun?.finishedAt
                    ? formatDateTime(stringValue(lastDiscoveryRun.finishedAt))
                    : "还没有文件"}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  最近新增
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  资料 {numberValue(lastDiscoveryRun?.resourcesAdded)} 条，
                  机构 {numberValue(lastDiscoveryRun?.institutionsAdded)} 个
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  下次运行
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {schedulerStatus?.running
                    ? nextSchedulerRunAt
                      ? formatDateTime(nextSchedulerRunAt)
                      : "正在准备第一轮"
                    : "暂停中"}
                </p>
              </div>
            </div>

            {lastDiscoveryRun ? (
              <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                最近结果：
                {schedulerStopReasonLabel(
                  stringValue(lastDiscoveryRun.stoppedReason),
                )}
                。如果显示“暂时没有新的安全候选”，意思是当前安全清单暂时跑完了，不是网站坏了。
              </p>
            ) : null}
          </div>
        </PrimaryPanel>

        <PrimaryPanel
          title="2. 手动运行一次安全巡检扩库"
          description="如果你不想开启定时，也可以手动运行一次：系统会按白名单来源，分批补入美国档案法律法规、电子文件资料、专业学会和大学档案馆等条目。"
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runDiscoveryAutopublish()}
              disabled={discoveryRunning || !initialActionsEnabled}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {discoveryRunning ? "正在安全巡检扩库…" : "运行一次安全巡检扩库"}
            </button>
            <Link
              href="/resources"
              className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              去前台资料库查看
            </Link>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            当前采用安全清单模式：不做无边界高频爬取。每次小批量补入资料和机构；学者人物会先保留为后续独立模块，不会硬塞进机构表。
          </p>

          {discoveryResult ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                discoveryResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
              }`}
            >
              <p className="font-medium">
                {discoveryResult.success
                  ? "安全巡检扩库已完成。"
                  : "安全巡检扩库失败。"}
              </p>
              {discoveryResult.error ? (
                <p className="mt-1">{discoveryResult.error}</p>
              ) : null}
              {discoveryResult.output ? (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200">
                  {simpleOutputSummary(discoveryResult.output)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </PrimaryPanel>

        <PrimaryPanel
          title="3. 一键自动完善资料库"
          description="点击后，智能体会先补全并发布资料详细介绍；之后你可以从前台预览，不需要的条目再用管理员工具修改或移出资料库。"
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runAutopilot()}
              disabled={running || !initialActionsEnabled}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? "正在交给后台…" : "一键补全并发布"}
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              刷新反馈
            </button>
            <Link
              href="/admin/quality-agent"
              className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              查看详细文件
            </Link>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            默认连续处理 5 轮，每轮最多 20 条。任务会在后台慢慢跑，几分钟后点击“刷新反馈”查看新消息。
          </p>

          {!initialActionsEnabled ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              后台自动执行未开启。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。
            </p>
          ) : null}

          {actionResult ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                actionResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
              }`}
            >
              <p className="font-medium">
                {actionResult.success ? "后台任务已开始。" : "本批处理失败。"}
              </p>
              {actionResult.error ? <p className="mt-1">{actionResult.error}</p> : null}
              {actionResult.output ? (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200">
                  {simpleOutputSummary(actionResult.output)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </PrimaryPanel>

        <PrimaryPanel
          title="4. 智能体反馈"
          description="智能体每处理一条资料，就会在这里留一条消息。你可以一键发布这一批，也可以单条预览、编辑和生成网页快照。"
        >
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
            AI 生成介绍和网页快照是两个步骤：发布会让中文标题、摘要和资料解读显示到前台；发布当前批次时会同步补适合批量处理的网页快照。Federal Register 不会批量自动截图，避免触发官方访问验证，单条资料可按需尝试。
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void publishAllVisibleDrafts()}
              disabled={
                batchPublishing ||
                publishingResourceId !== "" ||
                publishableMessages.length === 0
              }
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {batchPublishing
                ? "正在一键发布…"
                : publishableMessages.length > 0
                  ? `一键发布当前可发布的 ${publishableMessages.length} 条`
                  : "当前没有待发布内容"}
            </button>
            <button
              type="button"
              onClick={() => void generateSnapshotBatch()}
              disabled={snapshotBatchRunning || !initialActionsEnabled}
              className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {snapshotBatchRunning
                ? "正在补快照…"
                : "自动循环补快照（每批 3 条）"}
            </button>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            “可发布”只统计当前反馈列表里已有 AI 草稿、尚未真正发布、且没有失败或隐藏的条目；不是全站所有待完善资料数量。
          </p>

          {hideMessage ? (
            <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
              {hideMessage}
            </p>
          ) : null}

          {snapshotMessage ? (
            <div
              className={`mb-3 rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                snapshotMessage.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
              }`}
            >
              <p className="font-medium">{snapshotMessage.text}</p>
              {snapshotMessage.output ? (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200">
                  {snapshotOutputSummary(snapshotMessage.output)}
                </pre>
              ) : null}
            </div>
          ) : null}

          {recentMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              暂无智能体处理消息。先点击上面的“开始自动完善资料库”。
            </div>
          ) : (
            <div className="space-y-3">
              {recentMessages.map((message) => {
                const hidden = hiddenResourceIds.has(message.resourceId);
                const draft = draftByResourceId.get(message.resourceId);
                const published =
                  isPublishedMessage(message, draft);
                const acceptedButNotApplied =
                  !published &&
                  (message.status === "accepted" ||
                    draft?.reviewStatus === "accepted");
                const canPublish = canPublishMessage(message);
                const snapshotStatus = getSnapshotStatus(
                  message.resourceId,
                  snapshotTypesByResourceId,
                  snapshotGeneratedResourceIds,
                );

                return (
                  <article
                    key={message.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium leading-relaxed text-zinc-950 dark:text-zinc-50">
                          {message.message}
                        </h3>
                        <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                          {message.resourceId}
                          {message.sourceDomain ? ` · ${message.sourceDomain}` : ""}
                          {" · "}
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(
                          hidden
                            ? "skipped"
                            : published
                              ? "applied"
                              : message.status,
                        )}`}
                      >
                        {hidden
                          ? "已隐藏"
                          : published
                            ? "已发布"
                            : acceptedButNotApplied
                              ? "待发布"
                            : statusLabel(message.status)}
                      </span>
                    </div>

                    {message.actionSummary ? (
                      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {message.actionSummary}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${snapshotStatus.className}`}
                        title={snapshotStatus.description}
                      >
                        {snapshotStatus.label}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {snapshotStatus.description}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {published && message.detailUrl ? (
                        <Link
                          href={message.detailUrl}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          查看前台页面
                        </Link>
                      ) : null}
                      {!published && draft ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDraft({ draft, message })}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                        >
                          预览 AI 生成内容
                        </button>
                      ) : null}
                      {!published && !draft && message.detailUrl ? (
                        <Link
                          href={message.detailUrl}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          title="这会打开当前前台页面；AI 内容未发布前，前台仍可能显示旧内容。"
                        >
                          查看当前前台
                        </Link>
                      ) : null}
                      <Link
                        href={message.enrichmentReviewUrl}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        修改 / 编辑 / 重新应用
                      </Link>
                      {canPublish ? (
                        <button
                          type="button"
                          disabled={publishingResourceId === message.resourceId}
                          onClick={() => void publishAiDraft(message.resourceId)}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {publishingResourceId === message.resourceId
                            ? "正在发布…"
                            : "确认发布到前台"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={
                          snapshotResourceId === message.resourceId ||
                          snapshotBatchRunning ||
                          !initialActionsEnabled ||
                          snapshotStatus.complete
                        }
                        onClick={() =>
                          void generateSnapshot(
                            message.resourceId,
                            message.sourceDomain,
                          )
                        }
                        className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
                      >
                        {snapshotResourceId === message.resourceId
                          ? "正在生成快照…"
                          : snapshotStatus.complete
                            ? "已有网页快照"
                            : "生成网页快照"}
                      </button>
                      <Link
                        href={message.editUrl}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        查看后台资料
                      </Link>
                      <button
                        type="button"
                        disabled={hidden}
                        onClick={() => void hideResource(message.resourceId)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        {hidden ? "已隐藏" : "隐藏 / 删除展示"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </PrimaryPanel>

        <PrimaryPanel
          title="5. 机构扩充反馈"
          description="这里显示安全巡检 Agent 新补入的机构，例如专业学会、大学档案馆、研究图书馆和联邦相关机构。"
        >
          {recentInstitutionMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              暂无机构扩充消息。点击上面的“运行一次安全巡检扩库”后，如果有新机构，会显示在这里。
            </div>
          ) : (
            <div className="space-y-3">
              {recentInstitutionMessages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium leading-relaxed text-zinc-950 dark:text-zinc-50">
                        {message.message}
                      </h3>
                      <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                        {message.institutionId}
                        {message.sourceDomain ? ` · ${message.sourceDomain}` : ""}
                        {" · "}
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      已补入
                    </span>
                  </div>
                  {message.actionSummary ? (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {message.actionSummary}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.detailUrl ? (
                      <Link
                        href={message.detailUrl}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        查看前台机构页
                      </Link>
                    ) : null}
                    {message.editUrl ? (
                      <Link
                        href={message.editUrl}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        去后台查看
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </PrimaryPanel>

        <PrimaryPanel
          title="6. 粘贴网址，扩充资料库"
          description="把你发现的资料网页粘贴到这里，后台会抓取标题和简介，生成候选草稿。确认后再收录进前台。"
        >
          <div className="grid grid-cols-1 gap-3">
            <input
              value={crawlUrl}
              onChange={(event) => setCrawlUrl(event.target.value)}
              placeholder="粘贴一个资料网址，例如 https://www.archives.gov/..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <textarea
              value={crawlNotes}
              onChange={(event) => setCrawlNotes(event.target.value)}
              placeholder="可选：写一句你为什么想收录它"
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void crawlSingleUrl()}
                disabled={crawlRunning || !crawlUrl.trim()}
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                {crawlRunning ? "正在读取网页…" : "生成候选草稿"}
              </button>
              <Link
                href="/admin/drafts"
                className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                去审核候选资料
              </Link>
            </div>
          </div>

          {crawlResult ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                crawlResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
              }`}
            >
              {crawlResult.error ||
                crawlResult.message ||
                (crawlResult.success ? "已生成候选草稿。" : "采集失败。")}
            </p>
          ) : null}

          {recentManualDrafts.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                最近粘贴生成的候选
              </h3>
              <div className="mt-3 space-y-2">
                {recentManualDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {draft.titleZh || draft.titleEn || draft.id}
                    </p>
                    <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                      {draft.sourceDomain || "未知来源"} ·{" "}
                      {draft.reviewStatus || "pending"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </PrimaryPanel>

        <details className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            高级入口
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["/admin/quality-agent", "质量 Agent 详细页"],
              ["/admin/enrichments", "AI 草稿审核"],
              ["/admin/drafts", "采集草稿审核"],
              ["/admin/resources", "资料后台编辑"],
              ["/admin/dashboard", "维护工作台"],
              ["/admin/console", "管理员操作台"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {label}
              </Link>
            ))}
          </div>
        </details>
      </div>

      {previewDraft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                  AI 生成内容预览
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {previewDraft.draft.titleZh ||
                    previewDraft.message.title ||
                    previewDraft.message.resourceId}
                </h2>
                <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                  {previewDraft.message.resourceId} · 草稿状态：
                  {previewDraft.draft.reviewStatus || "pending"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDraft(null)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                关闭
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  资料卡片简介
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                  {previewDraft.draft.summaryShort || "暂未生成卡片简介。"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    中文摘要
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {previewDraft.draft.summaryZh || "暂未生成中文摘要。"}
                  </p>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    研究价值
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {previewDraft.draft.researchValue || "暂未生成研究价值。"}
                  </p>
                </section>
              </div>

              <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  内容要点
                </h3>
                {previewDraft.draft.keyPoints.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {previewDraft.draft.keyPoints.map((point) => (
                      <li key={point} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    暂未生成内容要点。
                  </p>
                )}
              </section>

              {previewDraft.draft.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {previewDraft.draft.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:justify-end dark:border-zinc-800 dark:bg-zinc-950">
              <Link
                href={previewDraft.message.enrichmentReviewUrl}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                进入编辑页面
              </Link>
              <button
                type="button"
                onClick={() => setPreviewDraft(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                暂不发布
              </button>
              <button
                type="button"
                disabled={publishingResourceId === previewDraft.message.resourceId}
                onClick={() => {
                  const resourceId = previewDraft.message.resourceId;

                  setPreviewDraft(null);
                  void publishAiDraft(resourceId);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishingResourceId === previewDraft.message.resourceId
                  ? "正在发布…"
                  : "确认发布到前台"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
