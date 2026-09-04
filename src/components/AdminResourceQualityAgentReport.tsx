"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AgentReportProps = {
  report: unknown;
  logs?: unknown;
  autoFixLogs?: unknown;
  loopRuns?: unknown;
  autopilotMessages?: unknown;
  enrichmentDrafts?: unknown;
  error?: string;
  missing?: boolean;
};

type AgentItem = {
  resourceId: string;
  title: string;
  titleZh: string;
  titleEn: string;
  detailUrl: string;
  adminUrl: string;
  resourceType: string;
  sourceDomain: string;
  sourceUrl: string;
  issueTags: string[];
  recommendedActions: string[];
  finalStatus: string;
  snapshotStatus: string;
  officialFileCount?: number;
};

type AgentLog = AgentItem & {
  checkedAt: string;
  checks: unknown;
  issues: unknown;
  flags: unknown;
};

type AutoFixLog = {
  resourceId: string;
  title: string;
  action: string;
  status: "success" | "failed" | "skipped" | string;
  reason: string;
  startedAt: string;
  finishedAt: string;
};

type AutopilotMessage = {
  id: string;
  runId: string;
  resourceId: string;
  title: string;
  status: string;
  message: string;
  detailUrl: string;
  editUrl: string;
  enrichmentReviewUrl: string;
  sourceDomain: string;
  actionSummary: string;
  autoFixStatus: string;
  safetyReasons: string[];
  createdAt: string;
};

type EnrichmentDraftSummary = {
  resourceId: string;
  reviewStatus: string;
  titleZh: string;
  updatedAt: string;
};

type LoopRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  roundsRequested: number;
  roundsCompleted: number;
  batchSize: number;
  autoSafe: boolean;
  aiTimeout: number;
  initialNeedsEnrichment: number | null;
  finalNeedsEnrichment: number | null;
  stoppedReason: string;
  rounds: Array<{
    round: number;
    beforeNeedsEnrichment: number | null;
    afterNeedsEnrichment: number | null;
    success: boolean;
    errorMessage: string;
  }>;
};

type WorkflowAction =
  | "resource-quality-check"
  | "resource-quality-fix"
  | "resource-quality-fix-auto-safe"
  | "resource-quality-loop"
  | "resource-enrichment-autopilot"
  | "enrich-apply-update-existing";

type WorkflowActionResult = {
  action: WorkflowAction;
  success: boolean;
  command: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  output: string;
  error: string;
};

type ActionPostResponse = {
  success?: boolean;
  action?: string;
  command?: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number | null;
  error?: string;
  output?: string;
};

type ActionsGetResponse = {
  success?: boolean;
  actionsEnabled?: boolean;
  error?: string;
};

type AgentReport = {
  generatedAt?: string;
  summary?: Record<string, unknown>;
  lists?: Record<string, unknown>;
};

const finalStatusLabels: Record<string, string> = {
  passed: "已通过",
  needs_enrichment: "需补全内容",
  needs_classification_review: "需分类复核",
  needs_snapshot: "缺少快照",
  needs_official_file: "缺少官方文件",
  needs_version_review: "需版本复核",
  suspect_low_relevance: "疑似低价值",
  needs_human_review: "需人工复核",
};

const draftStatusLabels: Record<string, string> = {
  pending: "待审核",
  accepted: "已接受",
  applied: "已应用",
  rejected: "已拒绝",
  needs_revision: "需修改",
};

const autoFixStatusLabels: Record<string, string> = {
  success: "成功",
  failed: "失败",
  skipped: "跳过",
  generated_pending: "待人工审核",
  auto_accepted: "自动接受",
  auto_applied: "自动应用",
  skipped_high_risk: "高风险待审",
  needs_human_review: "需人工复核",
};

const autopilotStatusLabels: Record<string, string> = {
  applied: "已接受并应用",
  accepted: "已自动接受",
  pending_review: "待人工审核",
  needs_human_review: "需人工复核",
  skipped: "已跳过",
  failed: "失败",
  info: "已记录",
};

const autoFixFilters = [
  { value: "all", label: "全部" },
  { value: "success", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "skipped", label: "跳过" },
];
const resourceQualityFixLimit = 3;
const resourceQualityFixAiTimeout = 60;
const resourceQualityAutoSafeLimit = 20;
const resourceQualityLoopRounds = 3;
const resourceQualityLoopBatchSize = 5;
const workflowClientTimeoutMs = 31 * 60 * 1000;

const workflowActionLabels: Record<WorkflowAction, string> = {
  "resource-quality-check": "运行质量检查",
  "resource-quality-fix": "生成下一批 AI 补全草稿",
  "resource-quality-fix-auto-safe": "自动安全补全一批",
  "resource-quality-loop": "运行循环修复",
  "resource-enrichment-autopilot": "资料完善智能体",
  "enrich-apply-update-existing": "应用已接受 AI 草稿",
};

const workflowCommandActions: Array<{
  action: WorkflowAction;
  title: string;
  description: string;
  command: string;
  variant: "primary" | "secondary";
}> = [
  {
    action: "resource-enrichment-autopilot",
    title: "启动资料完善智能体",
    description:
      "优先自动应用低风险资料；没有低风险候选时，生成待人工复核草稿，默认 3 条。",
    command:
      "npm run agent:resource-enrichment:autopilot -- --limit 3 --ai-timeout 60",
    variant: "primary",
  },
  {
    action: "resource-quality-check",
    title: "运行质量检查",
    description: "重新执行 Resource Quality Agent，刷新质量报告和问题列表。",
    command: "npm run agent:resource-quality",
    variant: "primary",
  },
  {
    action: "resource-quality-fix",
    title: "生成下一批 AI 补全草稿",
    description: "针对内容不完整资料生成下一批 AI enrichment 草稿，默认 3 条。",
    command: "npm run agent:resource-quality:fix -- --limit 3 --ai-timeout 60",
    variant: "primary",
  },
  {
    action: "resource-quality-fix-auto-safe",
    title: "自动安全补全一批",
    description: "自动生成、判断并应用低风险资料，默认 20 条；高风险资料保留人工审核。",
    command:
      "npm run agent:resource-quality:fix -- --limit 20 --auto-safe --ai-timeout 60",
    variant: "secondary",
  },
  {
    action: "resource-quality-loop",
    title: "运行循环修复",
    description: "自动执行检查、低风险修复、应用和再检查，默认 3 轮、每轮 5 条。",
    command:
      "npm run agent:resource-quality:loop -- --rounds 3 --batchSize 5 --auto-safe --sourceDomain archives.gov --ai-timeout 60",
    variant: "primary",
  },
  {
    action: "enrich-apply-update-existing",
    title: "应用已接受 AI 草稿",
    description: "将已接受草稿写入 enrichment 数据，并允许更新已有条目。",
    command: "npm run enrich:apply -- --update-existing",
    variant: "secondary",
  },
];

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeReport(value: unknown): AgentReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as AgentReport;
}

function toAgentItems(value: unknown): AgentItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      title: stringValue(item.title),
      titleZh: stringValue(item.titleZh),
      titleEn: stringValue(item.titleEn),
      detailUrl: stringValue(item.detailUrl),
      adminUrl: stringValue(item.adminUrl),
      resourceType: stringValue(item.resourceType),
      sourceDomain: stringValue(item.sourceDomain),
      sourceUrl: stringValue(item.sourceUrl),
      issueTags: stringArrayValue(item.issueTags),
      recommendedActions: stringArrayValue(item.recommendedActions),
      finalStatus: stringValue(item.finalStatus),
      snapshotStatus: stringValue(item.snapshotStatus),
      officialFileCount:
        typeof item.officialFileCount === "number"
          ? item.officialFileCount
          : undefined,
    }))
    .filter((item) => item.resourceId);
}

function toAgentLogs(value: unknown): AgentLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      ...toAgentItems([item])[0],
      checkedAt: stringValue(item.checkedAt),
      checks: item.checks ?? {},
      issues: item.issues ?? [],
      flags: item.flags ?? {},
    }))
    .filter((item) => item.resourceId);
}

function toAutoFixLogs(value: unknown): AutoFixLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      title: stringValue(item.title),
      action: stringValue(item.action),
      status: stringValue(item.status),
      reason: stringValue(item.reason),
      startedAt: stringValue(item.startedAt),
      finishedAt: stringValue(item.finishedAt),
    }))
    .filter((item) => item.resourceId);
}

function toAutopilotMessages(value: unknown): AutopilotMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      id: stringValue(item.id),
      runId: stringValue(item.runId),
      resourceId: stringValue(item.resourceId),
      title: stringValue(item.title),
      status: stringValue(item.status),
      message: stringValue(item.message),
      detailUrl: stringValue(item.detailUrl),
      editUrl: stringValue(item.editUrl),
      enrichmentReviewUrl: stringValue(item.enrichmentReviewUrl),
      sourceDomain: stringValue(item.sourceDomain),
      actionSummary: stringValue(item.actionSummary),
      autoFixStatus: stringValue(item.autoFixStatus),
      safetyReasons: stringArrayValue(item.safetyReasons),
      createdAt: stringValue(item.createdAt),
    }))
    .filter((item) => item.id && item.resourceId)
    .sort((left, right) =>
      stringValue(right.createdAt).localeCompare(left.createdAt),
    );
}

function toEnrichmentDrafts(value: unknown): EnrichmentDraftSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      reviewStatus: stringValue(item.reviewStatus),
      titleZh: stringValue(item.titleZh),
      updatedAt: stringValue(item.updatedAt),
    }))
    .filter((item) => item.resourceId);
}

function nullableNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toLoopRuns(value: unknown): LoopRun[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      id: stringValue(item.id),
      startedAt: stringValue(item.startedAt),
      finishedAt: stringValue(item.finishedAt),
      roundsRequested: numberValue(item.roundsRequested),
      roundsCompleted: numberValue(item.roundsCompleted),
      batchSize: numberValue(item.batchSize),
      autoSafe: item.autoSafe === true,
      aiTimeout: numberValue(item.aiTimeout),
      initialNeedsEnrichment: nullableNumberValue(item.initialNeedsEnrichment),
      finalNeedsEnrichment: nullableNumberValue(item.finalNeedsEnrichment),
      stoppedReason: stringValue(item.stoppedReason),
      rounds: Array.isArray(item.rounds)
        ? item.rounds
            .filter(
              (round): round is Record<string, unknown> =>
                Boolean(round && typeof round === "object" && !Array.isArray(round)),
            )
            .map((round) => ({
              round: numberValue(round.round),
              beforeNeedsEnrichment: nullableNumberValue(
                round.beforeNeedsEnrichment,
              ),
              afterNeedsEnrichment: nullableNumberValue(
                round.afterNeedsEnrichment,
              ),
              success: round.success === true,
              errorMessage: stringValue(round.errorMessage),
            }))
        : [],
    }))
    .filter((item) => item.id)
    .sort((left, right) => stringValue(right.startedAt).localeCompare(left.startedAt));
}

function getItemTitle(item: AgentItem | AgentLog | AutoFixLog) {
  return (
    "title" in item && item.title
      ? item.title
      : "titleZh" in item && item.titleZh
        ? item.titleZh
        : "titleEn" in item && item.titleEn
          ? item.titleEn
          : item.resourceId
  );
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

function statusClassName(status: string) {
  if (
    status === "success" ||
    status === "passed" ||
    status === "accepted" ||
    status === "applied" ||
    status === "auto_accepted" ||
    status === "auto_applied"
  ) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (status === "failed" || status === "rejected") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  }

  if (
    status === "skipped" ||
    status === "needs_revision" ||
    status === "generated_pending" ||
    status === "skipped_high_risk" ||
    status === "pending_review" ||
    status === "needs_human_review"
  ) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
}

function StatCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {typeof value === "number" || typeof value === "string" ? value : 0}
      </p>
    </div>
  );
}

function normalizeSourceDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function buildNeedsEnrichmentSourceStats(
  items: AgentItem[],
  allSiteTotal: number,
) {
  let archivesGovCount = 0;
  let federalRegisterCount = 0;
  let otherCount = 0;

  for (const item of items) {
    const sourceDomain = normalizeSourceDomain(item.sourceDomain);

    if (sourceDomain === "archives.gov") {
      archivesGovCount += 1;
      continue;
    }

    if (sourceDomain === "federalregister.gov") {
      federalRegisterCount += 1;
      continue;
    }

    otherCount += 1;
  }

  const countedTotal = archivesGovCount + federalRegisterCount + otherCount;

  if (allSiteTotal > countedTotal) {
    otherCount += allSiteTotal - countedTotal;
  }

  return [
    { label: "archives.gov", value: archivesGovCount },
    { label: "federalregister.gov", value: federalRegisterCount },
    { label: "其他", value: otherCount },
  ];
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function WorkflowButton({
  action,
  title,
  description,
  command,
  variant,
  activeAction,
  enabled,
  onRun,
}: {
  action: WorkflowAction;
  title: string;
  description: string;
  command: string;
  variant: "primary" | "secondary";
  activeAction: WorkflowAction | "";
  enabled: boolean;
  onRun: (action: WorkflowAction) => void;
}) {
  const isRunning = activeAction === action;
  const disabled = !enabled || Boolean(activeAction);
  const buttonClassName =
    variant === "primary"
      ? "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-full flex-col gap-3">
        <div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
          <code className="mt-2 inline-block max-w-full break-all rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {command}
          </code>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRun(action)}
          className={`mt-auto ${buttonClassName}`}
        >
          {isRunning && action === "resource-quality-fix"
            ? "正在生成 AI 补全草稿..."
            : isRunning && action === "resource-quality-fix-auto-safe"
              ? "正在自动安全补全..."
            : isRunning && action === "resource-enrichment-autopilot"
              ? "智能体处理中..."
            : isRunning && action === "resource-quality-loop"
              ? "正在循环修复..."
            : isRunning
              ? "执行中..."
              : title}
        </button>
      </div>
    </article>
  );
}

function ResourceCompletionWorkflow({
  summary,
  drafts,
  needsEnrichmentItems = [],
}: {
  summary: Record<string, unknown>;
  drafts: EnrichmentDraftSummary[];
  needsEnrichmentItems?: AgentItem[];
}) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<WorkflowAction | "">("");
  const [result, setResult] = useState<WorkflowActionResult | null>(null);
  const [actionsEnabled, setActionsEnabled] = useState<boolean | null>(null);
  const [actionsStatusError, setActionsStatusError] = useState("");

  const pendingDraftCount = drafts.filter(
    (draft) => draft.reviewStatus === "pending",
  ).length;
  const acceptedDraftCount = drafts.filter(
    (draft) => draft.reviewStatus === "accepted",
  ).length;
  const workflowStats = [
    { label: "需内容补全", value: numberValue(summary.needsEnrichment) },
    { label: "AI 待审核草稿", value: pendingDraftCount },
    { label: "已接受未应用", value: acceptedDraftCount },
    { label: "疑似低价值", value: numberValue(summary.suspectLowRelevance) },
    {
      label: "需分类复核",
      value: numberValue(summary.needsClassificationReview),
    },
    { label: "需人工复核", value: numberValue(summary.needsHumanReview) },
  ];
  const needsEnrichmentTotal = numberValue(summary.needsEnrichment);
  const needsEnrichmentSourceStats = buildNeedsEnrichmentSourceStats(
    needsEnrichmentItems,
    needsEnrichmentTotal,
  );

  const loadActionsStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/actions", {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | ActionsGetResponse
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "后台命令状态读取失败。");
      }

      setActionsEnabled(Boolean(body.actionsEnabled));
      setActionsStatusError("");
    } catch (error) {
      setActionsEnabled(false);
      setActionsStatusError(
        error instanceof Error ? error.message : "后台命令状态读取失败。",
      );
    }
  }, []);

  useEffect(() => {
    void loadActionsStatus();
  }, [loadActionsStatus]);

  async function runWorkflowAction(action: WorkflowAction) {
    if (actionsEnabled === false) {
      setResult({
        action,
        success: false,
        command: "",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        exitCode: null,
        output: "",
        error:
          "后台命令执行未启用，请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      });
      return;
    }

    setActiveAction(action);
    setResult(null);

    let requestTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      const apiAction =
        action === "resource-quality-fix-auto-safe"
          ? "resource-quality-fix"
          : action;
      const params =
        action === "resource-enrichment-autopilot"
          ? {
              limit: resourceQualityFixLimit,
              aiTimeout: resourceQualityFixAiTimeout,
              autoSafe: true,
            }
          : action === "resource-quality-fix"
          ? {
              limit: resourceQualityFixLimit,
              aiTimeout: resourceQualityFixAiTimeout,
            }
          : action === "resource-quality-fix-auto-safe"
            ? {
                limit: resourceQualityAutoSafeLimit,
                aiTimeout: resourceQualityFixAiTimeout,
                autoSafe: true,
              }
          : action === "resource-quality-loop"
            ? {
                rounds: resourceQualityLoopRounds,
                batchSize: resourceQualityLoopBatchSize,
                aiTimeout: resourceQualityFixAiTimeout,
                autoSafe: true,
                sourceDomain: "archives.gov",
              }
          : {};
      const controller = new AbortController();
      requestTimeout = setTimeout(
        () => controller.abort(),
        workflowClientTimeoutMs,
      );
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: apiAction, params }),
        signal: controller.signal,
      });

      if (requestTimeout) {
        clearTimeout(requestTimeout);
        requestTimeout = null;
      }

      const body = (await response.json().catch(() => null)) as
        | ActionPostResponse
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "后台任务执行失败。");
      }

      const nextResult: WorkflowActionResult = {
        action,
        success: Boolean(body.success),
        command: stringValue(body.command),
        startedAt: stringValue(body.startedAt),
        finishedAt: stringValue(body.finishedAt),
        exitCode:
          typeof body.exitCode === "number" && Number.isFinite(body.exitCode)
            ? body.exitCode
            : null,
        output: stringValue(body.output),
        error: stringValue(body.error),
      };

      setResult(nextResult);

      if (nextResult.success) {
        router.refresh();
      }
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";

      setResult({
        action,
        success: false,
        command: "",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        exitCode: null,
        output: "",
        error: isAbortError
          ? "任务执行超时，请降低 limit 后重试。"
          : error instanceof Error
            ? error.message
            : "后台任务执行失败。",
      });
    } finally {
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }

      setActiveAction("");
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Full Enrichment Workflow
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            资料完善工作流
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            按顺序运行质量检查、生成 AI 补全草稿、进入 AI 草稿审核，再应用已接受的草稿。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/enrichments"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            打开 AI 草稿审核
          </Link>
          <Link
            href="/admin/resource-quality"
            className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-900 dark:bg-zinc-950 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
          >
            查看资料质量审计
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {workflowStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-indigo-100 bg-white p-3 dark:border-indigo-900/60 dark:bg-zinc-950"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-4 dark:border-indigo-900/60 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              需内容补全来源分布
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              全站 needs_enrichment 总数：{needsEnrichmentTotal}
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            sourceDomain
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {needsEnrichmentSourceStats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
            >
              <span className="text-zinc-600 dark:text-zinc-300">
                {stat.label}
              </span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        Agent 当前只会自动为内容不完整资料生成补全草稿。疑似低价值、分类错误、转入机构、版本沿革和官方文件问题仍需人工复核。
      </p>

      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        可使用自动安全模式批量处理低风险资料。系统只会自动应用来源可靠、分类明确、AI 输出完整的资料；高风险资料仍进入人工审核。
      </p>

      {actionsEnabled === false ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          后台命令执行未启用，请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。
          {actionsStatusError ? ` ${actionsStatusError}` : ""}
        </p>
      ) : actionsEnabled === null ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          正在检查后台命令执行状态……
        </p>
      ) : null}

      {activeAction === "resource-quality-fix" ||
      activeAction === "resource-quality-fix-auto-safe" ||
      activeAction === "resource-enrichment-autopilot" ? (
        <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          AI 补全任务可能需要数分钟，请勿重复点击。
        </p>
      ) : null}

      {activeAction === "resource-quality-loop" ? (
        <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          循环修复会连续执行多轮检查、补全和再检查，可能需要较长时间，请勿重复点击。
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {workflowCommandActions.map((item) => (
          <WorkflowButton
            key={item.action}
            action={item.action}
            title={item.title}
            description={item.description}
            command={item.command}
            variant={item.variant}
            activeAction={activeAction}
            enabled={actionsEnabled === true}
            onRun={runWorkflowAction}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              执行反馈
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {activeAction
                ? activeAction === "resource-quality-fix"
                  ? "正在生成 AI 补全草稿……"
                  : activeAction === "resource-quality-fix-auto-safe"
                    ? "正在自动安全补全低风险资料……"
                  : activeAction === "resource-enrichment-autopilot"
                    ? "资料完善智能体正在生成、审核并应用低风险资料……"
                  : activeAction === "resource-quality-loop"
                    ? "正在运行循环修复工作流……"
                  : `执行中：${workflowActionLabels[activeAction]}`
                : result
                  ? result.success && result.action === "resource-quality-fix"
                    ? "AI 补全草稿生成任务已完成。"
                    : result.success &&
                        result.action === "resource-quality-fix-auto-safe"
                      ? "自动安全补全任务已完成。"
                    : result.success &&
                        result.action === "resource-enrichment-autopilot"
                      ? "资料完善智能体已完成本批处理。"
                    : result.success && result.action === "resource-quality-loop"
                      ? "循环修复工作流已完成。"
                    : `${result.success ? "成功" : "失败"}：${
                        workflowActionLabels[result.action]
                      }`
                  : "尚未执行工作流任务。"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              activeAction
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"
                : result
                  ? statusClassName(result.success ? "success" : "failed")
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {activeAction ? "执行中" : result ? (result.success ? "成功" : "失败") : "待执行"}
          </span>
        </div>

        {result ? (
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-3 dark:text-zinc-400">
            <p>最近执行时间：{formatDateTime(result.finishedAt)}</p>
            <p className="break-all">命令：{result.command || "未记录"}</p>
            <p>退出码：{result.exitCode ?? "未记录"}</p>
          </div>
        ) : null}

        {result?.error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-relaxed text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            {result.error}
          </p>
        ) : null}

        <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
          {activeAction
            ? "任务正在执行，完成后会在这里显示 command、exitCode、output 和 error。"
            : result?.output || "暂无输出日志。"}
        </pre>
      </div>
    </section>
  );
}

function AutopilotMessagesSection({
  messages,
}: {
  messages: AutopilotMessage[];
}) {
  const recentMessages = messages.slice(0, 20);

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Autopilot Messages
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            智能体处理消息
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            每条资料一条消息，显示智能体是否已生成详细信息、自动接受并应用，或是否需要人工复核。
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-zinc-950 dark:text-emerald-300">
          最近 {recentMessages.length} 条
        </span>
      </div>

      {recentMessages.length === 0 ? (
        <p className="mt-4 rounded-lg border border-emerald-100 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-zinc-400">
          暂无智能体处理消息。点击“启动资料完善智能体”后，这里会按资料显示处理结果。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {recentMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-lg border border-emerald-100 bg-white p-4 dark:border-emerald-900/60 dark:bg-zinc-950"
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
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(message.status)}`}
                >
                  {autopilotStatusLabels[message.status] ?? message.status}
                </span>
              </div>

              {message.actionSummary ? (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {message.actionSummary}
                </p>
              ) : null}

              {message.safetyReasons.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {message.safetyReasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {message.detailUrl ? (
                  <Link
                    href={message.detailUrl}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    查看资料
                  </Link>
                ) : null}
                <Link
                  href={message.enrichmentReviewUrl}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  查看并编辑后重新应用
                </Link>
                <Link
                  href={message.editUrl}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  打开后台资料
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AutoFixSection({ logs }: { logs: AutoFixLog[] }) {
  const [filter, setFilter] = useState("all");
  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.status === filter);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            自动修复文件
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            展示 Resource Quality Auto Fix 最近一次生成 AI 补全草稿的执行结果。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {autoFixFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={
                filter === item.value
                  ? "rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white"
                  : "rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          暂无自动修复文件。可运行 npm run agent:resource-quality:fix -- --limit 5 生成补全草稿。
        </p>
      ) : filteredLogs.length === 0 ? (
        <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          当前筛选下暂无文件。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredLogs.map((log, index) => (
            <article
              key={`${log.resourceId}-${log.startedAt}-${index}`}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                    {getItemTitle(log)}
                  </h3>
                  <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                    {log.resourceId} · {log.action}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(log.status)}`}
                >
                  {autoFixStatusLabels[log.status] ?? log.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {log.reason || "未记录原因。"}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-2 dark:text-zinc-400">
                <p>开始：{formatDateTime(log.startedAt)}</p>
                <p>结束：{formatDateTime(log.finishedAt)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function stoppedReasonLabel(value: string) {
  const labels: Record<string, string> = {
    no_needs_enrichment: "无待补全资料",
    no_progress: "无进展停止",
    no_safe_candidates: "无安全候选",
    command_failed: "命令失败",
    rounds_completed: "达到轮数上限",
    rounds_zero: "未执行轮次",
  };

  return labels[value] ?? (value || "未记录");
}

function LoopRunsSection({ runs }: { runs: LoopRun[] }) {
  const recentRuns = runs.slice(0, 5);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            循环工作流文件
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            展示最近 5 次 Resource Quality Loop 的检查、修复、应用和再检查结果。
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {runs.length} 次
        </span>
      </div>

      {recentRuns.length === 0 ? (
        <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          暂无循环工作流文件。可运行 npm run agent:resource-quality:loop -- --rounds 3 --batchSize 5 --auto-safe --ai-timeout 60。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {recentRuns.map((run) => {
            const estimatedFixed =
              run.initialNeedsEnrichment !== null &&
              run.finalNeedsEnrichment !== null
                ? Math.max(
                    0,
                    run.initialNeedsEnrichment - run.finalNeedsEnrichment,
                  )
                : 0;

            return (
              <article
                key={run.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatDateTime(run.startedAt)}
                    </h3>
                    <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                      {run.id}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(
                      run.stoppedReason === "command_failed"
                        ? "failed"
                        : run.stoppedReason === "no_progress"
                          ? "skipped"
                          : "success",
                    )}`}
                  >
                    {stoppedReasonLabel(run.stoppedReason)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-3 dark:text-zinc-400">
                  <p>完成时间：{formatDateTime(run.finishedAt)}</p>
                  <p>
                    需补全：{run.initialNeedsEnrichment ?? "未记录"} →{" "}
                    {run.finalNeedsEnrichment ?? "未记录"}
                  </p>
                  <p>轮数：{run.roundsCompleted}/{run.roundsRequested}</p>
                  <p>批量：{run.batchSize}</p>
                  <p>自动安全：{run.autoSafe ? "开启" : "关闭"}</p>
                  <p>自动修复数量估算：{estimatedFixed}</p>
                </div>

                <details className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    查看每轮摘要
                  </summary>
                  {run.rounds.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {run.rounds.map((round) => (
                        <div
                          key={`${run.id}-${round.round}`}
                          className="rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
                        >
                          第 {round.round} 轮：{round.beforeNeedsEnrichment ?? "?"} →{" "}
                          {round.afterNeedsEnrichment ?? "?"}；
                          {round.success ? "成功" : "失败"}
                          {round.errorMessage ? `；${round.errorMessage}` : ""}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                      暂无轮次详情。
                    </p>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function IssueSection({
  title,
  description,
  notice,
  items,
  logByResourceId,
  draftByResourceId,
}: {
  title: string;
  description: string;
  notice?: string;
  items: AgentItem[];
  logByResourceId: Map<string, AgentLog>;
  draftByResourceId: Map<string, EnrichmentDraftSummary>;
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
          {notice ? (
            <p className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm leading-relaxed text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-100">
              {notice}
            </p>
          ) : null}
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
            const agentLog = logByResourceId.get(item.resourceId);
            const draft = draftByResourceId.get(item.resourceId);
            const enrichmentsUrl = `/admin/enrichments?resourceId=${encodeURIComponent(
              item.resourceId,
            )}`;
            const singleFixCommand = `npm run agent:resource-quality:fix -- --resourceId ${item.resourceId}`;

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
                      {item.resourceId} · {item.resourceType || "未知类型"} ·{" "}
                      {item.sourceDomain || "未知来源"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(item.finalStatus)}`}
                  >
                    {finalStatusLabels[item.finalStatus] ?? item.finalStatus}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.issueTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {draft ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(draft.reviewStatus)}`}
                    >
                      AI 草稿：{draftStatusLabels[draft.reviewStatus] ?? draft.reviewStatus}
                    </span>
                  ) : null}
                </div>

                {item.recommendedActions.length > 0 ? (
                  <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                    推荐操作：{item.recommendedActions.join("；")}
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-3 dark:text-zinc-400">
                  <p>快照：{item.snapshotStatus || "未记录"}</p>
                  {typeof item.officialFileCount === "number" ? (
                    <p>官方文件：{item.officialFileCount}</p>
                  ) : null}
                  <p className="break-all">sourceUrl：{item.sourceUrl || "未记录"}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.detailUrl ? (
                    <Link
                      href={item.detailUrl}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      查看前台
                    </Link>
                  ) : null}
                  <Link
                    href={item.adminUrl || `/admin/resources?resourceId=${item.resourceId}`}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    编辑资料
                  </Link>
                  <Link
                    href={enrichmentsUrl}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    {draft ? "查看 AI 草稿" : "打开 AI 审核"}
                  </Link>
                  {draft ? (
                    <Link
                      href={enrichmentsUrl}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      打开 AI 审核
                    </Link>
                  ) : null}
                </div>

                {!draft ? (
                  <p className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                    生成 AI 修复草稿：
                    <code className="ml-1 break-all rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                      {singleFixCommand}
                    </code>
                  </p>
                ) : null}

                <details className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    查看 Agent 检查日志
                  </summary>
                  {agentLog ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          checks
                        </p>
                        <JsonBlock value={agentLog.checks} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          issues
                        </p>
                        <JsonBlock value={agentLog.issues} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          recommendedActions / finalStatus
                        </p>
                        <JsonBlock
                          value={{
                            recommendedActions: agentLog.recommendedActions,
                            finalStatus: agentLog.finalStatus,
                            checkedAt: agentLog.checkedAt,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                      暂无该资料的详细检查日志。
                    </p>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AdminResourceQualityAgentReport({
  report,
  logs = [],
  autoFixLogs = [],
  loopRuns = [],
  autopilotMessages = [],
  enrichmentDrafts = [],
  error = "",
  missing = false,
}: AgentReportProps) {
  const normalizedReport = normalizeReport(report);
  const agentLogs = useMemo(() => toAgentLogs(logs), [logs]);
  const fixLogs = useMemo(() => toAutoFixLogs(autoFixLogs), [autoFixLogs]);
  const qualityLoopRuns = useMemo(() => toLoopRuns(loopRuns), [loopRuns]);
  const autopilotMessageItems = useMemo(
    () => toAutopilotMessages(autopilotMessages),
    [autopilotMessages],
  );
  const drafts = useMemo(
    () => toEnrichmentDrafts(enrichmentDrafts),
    [enrichmentDrafts],
  );
  const logByResourceId = useMemo(
    () => new Map(agentLogs.map((log) => [log.resourceId, log])),
    [agentLogs],
  );
  const draftByResourceId = useMemo(
    () => new Map(drafts.map((draft) => [draft.resourceId, draft])),
    [drafts],
  );

  if (missing || !normalizedReport) {
    return (
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
          <ResourceCompletionWorkflow summary={{}} drafts={drafts} />
          <AutopilotMessagesSection messages={autopilotMessageItems} />
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            尚未生成资料质量 Agent 报告，请先运行 npm run agent:resource-quality。
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
          <ResourceCompletionWorkflow summary={{}} drafts={drafts} />
          <AutopilotMessagesSection messages={autopilotMessageItems} />
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
            资料质量 Agent 文件读取失败：{error}
          </p>
        </div>
      </section>
    );
  }

  const summary = normalizedReport.summary ?? {};
  const lists = normalizedReport.lists ?? {};
  const needsEnrichmentItems = toAgentItems(lists.needsEnrichmentResources);
  const suspectLowRelevanceItems = toAgentItems(
    lists.suspectLowRelevanceResources,
  );
  const needsClassificationItems = toAgentItems(
    lists.needsClassificationReviewResources,
  );
  const needsSnapshotItems = toAgentItems(lists.needsSnapshotResources);
  const needsOfficialFileItems = toAgentItems(lists.needsOfficialFileResources);
  const needsVersionItems = toAgentItems(lists.needsVersionReviewResources);
  const needsHumanReviewItems = toAgentItems(lists.needsHumanReviewResources);
  const autoFixSuccessCount = fixLogs.filter((log) => log.status === "success").length;
  const autoFixFailedCount = fixLogs.filter((log) => log.status === "failed").length;
  const overviewStats = [
    { label: "最近检查时间", value: formatDateTime(stringValue(normalizedReport.generatedAt)) },
    { label: "检查资料数", value: summary.checkedResources },
    { label: "通过资料数", value: summary.passed },
    { label: "需内容补全数", value: summary.needsEnrichment },
    { label: "需分类复核数", value: summary.needsClassificationReview },
    { label: "疑似低价值资料数", value: summary.suspectLowRelevance },
    { label: "缺少快照数", value: summary.needsSnapshot },
    { label: "缺少官方文件数", value: summary.needsOfficialFile },
    { label: "需要人工复核数", value: summary.needsHumanReview },
    { label: "自动修复成功数", value: autoFixSuccessCount },
    { label: "自动修复失败数", value: autoFixFailedCount },
    { label: "已生成 AI 草稿数", value: drafts.length },
  ];

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <ResourceCompletionWorkflow
          summary={summary}
          drafts={drafts}
          needsEnrichmentItems={needsEnrichmentItems}
        />

        <AutopilotMessagesSection messages={autopilotMessageItems} />

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          Resource Quality Agent 文件中心只展示检查与修复文件，不自动修改资料。内容补全草稿生成后，请到 /admin/enrichments 审核。
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>

        <AutoFixSection logs={fixLogs} />

        <LoopRunsSection runs={qualityLoopRuns} />

        <IssueSection
          title="需要补全内容的资料"
          description="这些资料缺少短简介、中文摘要、内容要点、研究价值或足够标签。"
          notice="可运行 npm run agent:resource-quality:fix -- --limit 5 自动生成 AI 补全草稿，然后到 /admin/enrichments 审核。"
          items={needsEnrichmentItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />

        <IssueSection
          title="疑似低价值资料"
          description="这些资料命中任命、人员、信息收集、会议通知等弱相关关键词，建议人工判断是否保留。"
          items={suspectLowRelevanceItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />

        <IssueSection
          title="需要分类复核的资料"
          description="这些资料可能存在类型、专题不一致，或标题显示更像机构条目。"
          items={needsClassificationItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />

        <IssueSection
          title="缺少快照的资料"
          description="这些资料缺少 PDF、网页截图或只有部分快照，后续可进入来源快照流程。"
          items={needsSnapshotItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />

        <IssueSection
          title="缺少官方文件的资料"
          description="法规、规章、战略、报告类资料如果缺少 officialFiles，建议优先补充官方文本或文件入口。"
          items={needsOfficialFileItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />

        <IssueSection
          title="需要版本复核的资料"
          description="这些资料标记为适用版本沿革，但缺少真实版本记录或只有占位版本。"
          items={needsVersionItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />

        <IssueSection
          title="需要人工复核的资料"
          description="这些资料存在来源链接、基础字段或受保护关键词下的弱相关判断，需要人工确认。"
          items={needsHumanReviewItems}
          logByResourceId={logByResourceId}
          draftByResourceId={draftByResourceId}
        />
      </div>
    </section>
  );
}
