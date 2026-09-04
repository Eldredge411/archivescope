"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminAction =
  | "ingest-fr"
  | "ingest-nara-web"
  | "ingest-nara-catalog"
  | "drafts-export"
  | "enrich-generate"
  | "enrich-apply"
  | "snapshot-generate"
  | "snapshot-backfill"
  | "snapshot-validate";

type ActionRun = {
  id: string;
  action: string;
  command: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  exitCode: number | null;
  output: string;
};

type ActionsGetResponse = {
  success?: boolean;
  actionsEnabled?: boolean;
  runs?: unknown[];
  error?: string;
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

type ActionParams = Record<string, string | number | boolean | undefined>;

const actionLabels: Record<AdminAction | string, string> = {
  "ingest-fr": "采集 Federal Register",
  "ingest-nara-web": "采集 NARA 官网资料",
  "ingest-nara-catalog": "采集 NARA Catalog",
  "drafts-export": "导出已接受资料",
  "enrich-generate": "生成 AI 完善草稿",
  "enrich-apply": "应用已接受 AI 草稿",
  "snapshot-generate": "生成来源快照",
  "snapshot-backfill": "循环补网页快照",
  "snapshot-validate": "校验来源快照",
};

const quickLinks = [
  { href: "/admin/drafts", label: "草稿审核页" },
  { href: "/admin/enrichments", label: "AI 草稿审核页" },
  { href: "/admin/dashboard", label: "维护工作台" },
  { href: "/resources", label: "资料库" },
];

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRun(value: unknown): ActionRun {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: stringValue(record.id) || `${stringValue(record.action)}-${Date.now()}`,
    action: stringValue(record.action),
    command: stringValue(record.command),
    startedAt: stringValue(record.startedAt),
    finishedAt: stringValue(record.finishedAt),
    success: Boolean(record.success),
    exitCode: numberOrNull(record.exitCode),
    output: stringValue(record.output),
  };
}

function formatDateTime(value: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function ActionButton({
  action,
  activeAction,
  enabled,
  onRun,
  children,
  variant = "primary",
}: {
  action: AdminAction;
  activeAction: string;
  enabled: boolean;
  onRun: () => void;
  children: string;
  variant?: "primary" | "secondary";
}) {
  const isRunning = activeAction === action;
  const disabled = !enabled || Boolean(activeAction);
  const className =
    variant === "primary"
      ? "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onRun}
      className={className}
    >
      {isRunning ? "正在执行..." : children}
    </button>
  );
}

function ConsoleCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <input
        type="number"
        min={1}
        max={50}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 1)}
        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
      />
    </label>
  );
}

export function AdminConsole({
  initialActionsEnabled,
}: {
  initialActionsEnabled: boolean;
}) {
  const [actionsEnabled, setActionsEnabled] = useState(initialActionsEnabled);
  const [runs, setRuns] = useState<ActionRun[]>([]);
  const [activeAction, setActiveAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastOutput, setLastOutput] = useState("");
  const [enrichLimit, setEnrichLimit] = useState(5);
  const [enrichForceId, setEnrichForceId] = useState("");
  const [enrichRefresh, setEnrichRefresh] = useState(false);
  const [applyUpdateExisting, setApplyUpdateExisting] = useState(false);
  const [applyResourceId, setApplyResourceId] = useState("");
  const [snapshotLimit, setSnapshotLimit] = useState(5);
  const [snapshotSourceDomain, setSnapshotSourceDomain] = useState("");
  const [snapshotResourceId, setSnapshotResourceId] = useState("");
  const [snapshotForce, setSnapshotForce] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/actions", {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | ActionsGetResponse
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "最近任务日志读取失败。");
      }

      setActionsEnabled(Boolean(body.actionsEnabled));
      setRuns(Array.isArray(body.runs) ? body.runs.map(normalizeRun) : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "最近任务日志读取失败。",
      );
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const enabled = actionsEnabled && !activeAction;

  async function runAction(action: AdminAction, params: ActionParams = {}) {
    setActiveAction(action);
    setErrorMessage("");
    setSuccessMessage("");
    setLastOutput("");

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, params }),
      });
      const body = (await response.json().catch(() => null)) as
        | ActionPostResponse
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "后台任务执行失败。");
      }

      setLastOutput(body.output || "");

      if (body.success) {
        setSuccessMessage(
          `${actionLabels[action] ?? action} 执行完成。命令：${body.command ?? ""}`,
        );
      } else {
        setErrorMessage(
          `${actionLabels[action] ?? action} 执行失败：${
            body.error || "请查看输出日志。"
          }`,
        );
      }

      await loadRuns();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "后台任务执行失败。",
      );
    } finally {
      setActiveAction("");
    }
  }

  const latestRuns = useMemo(() => runs.slice(0, 20), [runs]);

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          该页面仅用于本地开发阶段，不建议在公开生产环境暴露。
        </div>

        {!actionsEnabled ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            当前未启用后台命令执行。请在 .env.local 中设置
            ADMIN_ACTIONS_ENABLED=true。
          </div>
        ) : null}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                快速入口
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                常用后台页面与前台检查入口。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ConsoleCard
            title="数据采集"
            description="从外部来源采集候选资料草稿。"
          >
            <div className="flex flex-wrap gap-2">
              <ActionButton
                action="ingest-fr"
                activeAction={activeAction}
                enabled={enabled}
                onRun={() => runAction("ingest-fr")}
              >
                采集 Federal Register
              </ActionButton>
              <ActionButton
                action="ingest-nara-web"
                activeAction={activeAction}
                enabled={enabled}
                onRun={() => runAction("ingest-nara-web")}
                variant="secondary"
              >
                采集 NARA 官网资料
              </ActionButton>
              <ActionButton
                action="ingest-nara-catalog"
                activeAction={activeAction}
                enabled={enabled}
                onRun={() => runAction("ingest-nara-catalog")}
                variant="secondary"
              >
                采集 NARA Catalog（实验性）
              </ActionButton>
            </div>
          </ConsoleCard>

          <ConsoleCard
            title="草稿处理"
            description="将已接受的采集草稿导出到正式导入数据。"
          >
            <ActionButton
              action="drafts-export"
              activeAction={activeAction}
              enabled={enabled}
              onRun={() => runAction("drafts-export")}
            >
              导出已接受资料
            </ActionButton>
          </ConsoleCard>

          <ConsoleCard
            title="AI 资料完善"
            description="生成或应用 AI enrichment 草稿。"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberInput
                  label="生成数量 limit"
                  value={enrichLimit}
                  onChange={setEnrichLimit}
                />
                <TextInput
                  label="单条 force-id"
                  value={enrichForceId}
                  onChange={setEnrichForceId}
                  placeholder="可选 resourceId"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={enrichRefresh}
                  onChange={(event) => setEnrichRefresh(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
                重新抓取 Firecrawl 缓存
              </label>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  action="enrich-generate"
                  activeAction={activeAction}
                  enabled={enabled}
                  onRun={() =>
                    runAction("enrich-generate", {
                      limit: enrichLimit,
                      forceId: enrichForceId || undefined,
                      refresh: enrichRefresh,
                    })
                  }
                >
                  生成 AI 完善草稿
                </ActionButton>
              </div>
              <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextInput
                    label="指定 resourceId"
                    value={applyResourceId}
                    onChange={setApplyResourceId}
                    placeholder="可选"
                  />
                  <label className="flex items-end gap-2 pb-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={applyUpdateExisting}
                      onChange={(event) =>
                        setApplyUpdateExisting(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    更新已有 enrichment
                  </label>
                </div>
                <div className="mt-3">
                  <ActionButton
                    action="enrich-apply"
                    activeAction={activeAction}
                    enabled={enabled}
                    onRun={() =>
                      runAction("enrich-apply", {
                        resourceId: applyResourceId || undefined,
                        updateExisting: applyUpdateExisting,
                      })
                    }
                    variant="secondary"
                  >
                    应用已接受 AI 草稿
                  </ActionButton>
                </div>
              </div>
            </div>
          </ConsoleCard>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ConsoleCard
            title="来源快照"
            description="生成 Playwright PDF 快照和网页截图，并校验快照质量。"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberInput
                  label="生成数量 limit"
                  value={snapshotLimit}
                  onChange={setSnapshotLimit}
                />
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    sourceDomain
                  </span>
                  <select
                    value={snapshotSourceDomain}
                    onChange={(event) =>
                      setSnapshotSourceDomain(event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
                  >
                    <option value="">全部</option>
                    <option value="archives.gov">archives.gov</option>
                    <option value="federalregister.gov">
                      federalregister.gov
                    </option>
                  </select>
                </label>
                <TextInput
                  label="单条 resourceId"
                  value={snapshotResourceId}
                  onChange={setSnapshotResourceId}
                  placeholder="可选"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={snapshotForce}
                  onChange={(event) => setSnapshotForce(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
                强制重新生成
              </label>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  action="snapshot-generate"
                  activeAction={activeAction}
                  enabled={enabled}
                  onRun={() =>
                    runAction("snapshot-generate", {
                      limit: snapshotLimit,
                      sourceDomain: snapshotSourceDomain || undefined,
                      resourceId: snapshotResourceId || undefined,
                      force: snapshotForce,
                    })
                  }
                >
                  生成来源快照
                </ActionButton>
                <ActionButton
                  action="snapshot-backfill"
                  activeAction={activeAction}
                  enabled={enabled}
                  onRun={() =>
                    runAction("snapshot-backfill", {
                      batchSize: 3,
                      rounds: 50,
                      sourceDomain: snapshotSourceDomain || undefined,
                    })
                  }
                  variant="secondary"
                >
                  循环补快照（每批 3 条）
                </ActionButton>
                <ActionButton
                  action="snapshot-validate"
                  activeAction={activeAction}
                  enabled={enabled}
                  onRun={() => runAction("snapshot-validate")}
                  variant="secondary"
                >
                  校验来源快照
                </ActionButton>
              </div>
            </div>
          </ConsoleCard>

          <ConsoleCard
            title="本次输出"
            description="最近一次按钮执行返回的 stdout / stderr。"
          >
            <pre className="max-h-72 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
              {lastOutput || "尚未执行任务。"}
            </pre>
          </ConsoleCard>
        </div>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                最近任务日志
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                显示最近 20 条后台任务执行文件。
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadRuns()}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              刷新日志
            </button>
          </div>

          {latestRuns.length === 0 ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              暂无任务日志。
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {latestRuns.map((run) => (
                <details
                  key={run.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              run.success
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                            }`}
                          >
                            {run.success ? "success" : "failed"}
                          </span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {actionLabels[run.action] ?? run.action}
                          </span>
                        </div>
                        <p className="mt-2 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {run.command}
                        </p>
                      </div>
                      <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                        <p>开始：{formatDateTime(run.startedAt)}</p>
                        <p>结束：{formatDateTime(run.finishedAt)}</p>
                        <p>退出码：{run.exitCode ?? "未记录"}</p>
                      </div>
                    </div>
                  </summary>
                  <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
                    {run.output || "无输出。"}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
