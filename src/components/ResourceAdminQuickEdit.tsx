"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ResourceAdminQuickEditProps = {
  resource: {
    id: string;
    titleZh: string;
    titleEn: string;
    summaryShort?: string;
    summaryZh: string;
    keyPoints: string[];
    researchValue: string;
    tags: string[];
    sourceDomain: string;
  };
  actionsEnabled: boolean;
};

type ActionMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

type SnapshotActionInterpretation = {
  success: boolean;
  tone: ActionMessage["tone"];
  text: string;
};

function linesFromArray(items: string[]) {
  return items.join("\n");
}

function arrayFromLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayFromCommaText(value: string) {
  return value
    .split(/,|，|\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getMessageClassName(tone: ActionMessage["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100";
  }

  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100";
  }

  return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100";
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function getGeneratedSnapshotRecordCount(output: string) {
  const match = output.match(/新生成快照记录数量：(\d+)/);

  if (!match) {
    return null;
  }

  const count = Number.parseInt(match[1] ?? "", 10);

  return Number.isFinite(count) ? count : null;
}

function summarizeSnapshotOutput(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const usefulLines = lines.filter(
    (line) =>
      line.includes("本次待处理数量") ||
      line.includes("新生成快照记录数量") ||
      line.includes("本次没有成功生成新的快照记录") ||
      line.includes("已有快照记录") ||
      line.includes("是否成功") ||
      line.includes("失败原因") ||
      line.includes("Federal Register") ||
      line.includes("来源快照生成脚本执行失败"),
  );

  return (usefulLines.length > 0 ? usefulLines : lines).slice(-4).join("；");
}

function interpretSnapshotAction(output: string): SnapshotActionInterpretation {
  const normalizedOutput = stringValue(output);
  const generatedCount = getGeneratedSnapshotRecordCount(normalizedOutput);
  const summary = summarizeSnapshotOutput(normalizedOutput);

  if (
    normalizedOutput.includes("来源快照生成脚本执行失败") ||
    normalizedOutput.includes("本次没有成功生成新的快照记录") ||
    normalizedOutput.includes("是否成功：否")
  ) {
    return {
      success: false,
      tone: "error",
      text:
        summary ||
        "这条资料暂时没有成功保存网页快照。可能是外部网站阻止访问、页面超时或浏览器快照生成失败。",
    };
  }

  if (generatedCount !== null && generatedCount > 0) {
    return {
      success: true,
      tone: "success",
      text: `已实际写入 ${generatedCount} 条快照记录。刷新页面后可在“来源与保存”区域查看。`,
    };
  }

  if (normalizedOutput.includes("是否成功：部分成功")) {
    return {
      success: true,
      tone: "info",
      text: "网页快照部分保存成功，可能只生成了 PDF 或截图中的一种。刷新页面后查看“来源与保存”区域。",
    };
  }

  if (normalizedOutput.includes("已有快照记录")) {
    return {
      success: false,
      tone: "info",
      text:
        "系统检测到已有快照记录，本次没有重新生成。若下方仍未显示，说明旧记录可能不可用，需要到高级后台强制重新生成。",
    };
  }

  return {
    success: false,
    tone: "info",
    text:
      summary ||
      "快照任务已结束，但没有确认写入新的 PDF 或截图记录。请查看后台输出或稍后重试。",
  };
}

export function ResourceAdminQuickEdit({
  resource,
  actionsEnabled,
}: ResourceAdminQuickEditProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState("");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [titleZh, setTitleZh] = useState(resource.titleZh);
  const [summaryShort, setSummaryShort] = useState(resource.summaryShort ?? "");
  const [summaryZh, setSummaryZh] = useState(resource.summaryZh);
  const [keyPointsText, setKeyPointsText] = useState(
    linesFromArray(resource.keyPoints),
  );
  const [researchValue, setResearchValue] = useState(resource.researchValue);
  const [tagsText, setTagsText] = useState(resource.tags.join(", "));

  async function saveEdits() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/resource-edits", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: resource.id,
          updates: {
            titleZh,
            summaryShort,
            summaryZh,
            keyPoints: arrayFromLines(keyPointsText),
            researchValue,
            tags: arrayFromCommaText(tagsText),
          },
          note: "从前台资料详情页快速修正。",
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "保存失败。");
      }

      setMessage({
        tone: "success",
        text: "已保存修改。页面刷新后会显示新的内容。",
      });
      router.refresh();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "保存失败。",
      });
    } finally {
      setSaving(false);
    }
  }

  async function hideResource() {
    const confirmed = window.confirm(
      "确定把这条资料隐藏出前台资料库吗？隐藏比删除更安全，以后可以恢复。",
    );

    if (!confirmed) {
      return;
    }

    setRunningAction("hide");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/resource-curation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: resource.id,
          decision: "hidden",
          hiddenFromLibrary: true,
          reason: "从前台资料详情页隐藏展示。",
          notes: "管理员在前台检查时执行隐藏。",
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "隐藏失败。");
      }

      setMessage({
        tone: "success",
        text: "已隐藏出前台资料库。刷新后列表中将不再显示它。",
      });
      router.refresh();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "隐藏失败。",
      });
    } finally {
      setRunningAction("");
    }
  }

  async function runAdminAction(action: "regenerate" | "snapshot") {
    if (!actionsEnabled) {
      setMessage({
        tone: "error",
        text: "后台命令执行未启用。请先在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      });
      return;
    }

    if (
      action === "snapshot" &&
      resource.sourceDomain.toLowerCase() === "federalregister.gov"
    ) {
      const confirmed = window.confirm(
        "这条资料来自 Federal Register。为避免触发官方访问验证，系统不会批量截图；如果确实需要，可以单条尝试。是否继续？",
      );

      if (!confirmed) {
        return;
      }
    }

    setRunningAction(action);
    setMessage({
      tone: "info",
      text:
        action === "regenerate"
          ? "正在重新生成 AI 草稿，可能需要一会儿。"
          : "正在生成网页快照，可能需要一会儿。",
    });

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          action === "regenerate"
            ? {
                action: "enrich-generate",
                params: {
                  forceId: resource.id,
                },
              }
            : {
                action: "snapshot-generate",
                params: {
                  resourceId: resource.id,
                },
              },
        ),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; output?: string }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || body?.output || "操作失败。");
      }

      if (action === "snapshot") {
        const snapshotResult = interpretSnapshotAction(body.output || "");

        setMessage({
          tone: snapshotResult.tone,
          text: snapshotResult.text,
        });

        if (snapshotResult.success) {
          router.refresh();
        }

        return;
      }

      setMessage({
        tone: "success",
        text: "AI 草稿已重新生成。可以到后台 AI 草稿审核，或继续在前台查看后手动修正。",
      });
      router.refresh();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "操作失败。",
      });
    } finally {
      setRunningAction("");
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            管理员快速修正
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            本入口仅用于本地维护：在前台看到问题时，直接修改、隐藏、重新生成或补快照。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            {open ? "收起编辑" : "编辑这条资料"}
          </button>
          <button
            type="button"
            onClick={() => void runAdminAction("regenerate")}
            disabled={runningAction !== ""}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-800 dark:bg-zinc-950 dark:text-amber-200"
          >
            {runningAction === "regenerate" ? "正在生成…" : "重新生成 AI 草稿"}
          </button>
          <button
            type="button"
            onClick={() => void runAdminAction("snapshot")}
            disabled={runningAction !== ""}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900 dark:bg-zinc-950 dark:text-sky-300"
          >
            {runningAction === "snapshot" ? "正在补快照…" : "补网页快照"}
          </button>
          <button
            type="button"
            onClick={() => void hideResource()}
            disabled={runningAction !== ""}
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-zinc-950 dark:text-rose-300"
          >
            {runningAction === "hide" ? "正在隐藏…" : "隐藏展示"}
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${getMessageClassName(
            message.tone,
          )}`}
        >
          {message.text}
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            中文标题
            <input
              value={titleZh}
              onChange={(event) => setTitleZh(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            卡片简介
            <textarea
              value={summaryShort}
              onChange={(event) => setSummaryShort(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            中文摘要
            <textarea
              value={summaryZh}
              onChange={(event) => setSummaryZh(event.target.value)}
              rows={5}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            内容要点，每行一条
            <textarea
              value={keyPointsText}
              onChange={(event) => setKeyPointsText(event.target.value)}
              rows={5}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            研究价值
            <textarea
              value={researchValue}
              onChange={(event) => setResearchValue(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            标签，用逗号分隔
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void saveEdits()}
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "正在保存…" : "保存并刷新前台"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
