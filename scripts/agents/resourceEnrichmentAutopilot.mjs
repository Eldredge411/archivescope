import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const reportPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAgentReport.json",
);
const autoFixLogPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAutoFixLog.json",
);
const autopilotMessagesPath = path.join(
  projectRoot,
  "src/data/admin/resourceEnrichmentAutopilotMessages.json",
);
const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);

const defaultLimit = 3;
const defaultAiTimeoutSeconds = 60;
const maxLimit = 20;
const maxStoredMessages = 500;

function cleanString(value) {
  return String(value ?? "").trim();
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function hasArg(argv, names) {
  return argv.some((arg) => names.includes(arg));
}

function readArgValue(argv, names) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const matchedName = names.find(
      (name) => arg === name || arg.startsWith(`${name}=`),
    );

    if (!matchedName) {
      continue;
    }

    if (arg.includes("=")) {
      return arg.slice(arg.indexOf("=") + 1);
    }

    return argv[index + 1] ?? "";
  }

  return "";
}

function normalizeSourceDomain(value) {
  const normalized = cleanString(value).toLowerCase().replace(/^www\./, "");

  return normalized === "all" ? "" : normalized;
}

function positiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(cleanString(value), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function parseArgs(argv) {
  const rawLimit = readArgValue(argv, ["--limit"]);
  const rawAiTimeout = readArgValue(argv, ["--ai-timeout", "--aiTimeout"]);
  const rawRounds = readArgValue(argv, ["--rounds"]);
  const rawSourceDomain = readArgValue(argv, [
    "--sourceDomain",
    "--source-domain",
  ]);

  return {
    help: hasArg(argv, ["--help", "-h"]),
    limit: positiveInteger(rawLimit, defaultLimit, maxLimit),
    rounds: Math.max(1, positiveInteger(rawRounds, 1, 5)),
    aiTimeout: positiveInteger(rawAiTimeout, defaultAiTimeoutSeconds, 600),
    sourceDomain: normalizeSourceDomain(rawSourceDomain),
    autoSafe: !hasArg(argv, ["--no-auto-safe", "--noAutoSafe"]),
    publishAll: hasArg(argv, ["--publish-all", "--publishAll"]),
    fallbackPending: !hasArg(argv, [
      "--no-fallback-pending",
      "--noFallbackPending",
    ]),
    includeExistingPending: hasArg(argv, ["--include-existing-pending"]),
    skipInitialCheck: hasArg(argv, ["--skip-initial-check"]),
    skipFinalCheck: hasArg(argv, ["--skip-final-check"]),
  };
}

function printHelp() {
  console.log(`Resource Enrichment Autopilot

用法：
  npm run agent:resource-enrichment:autopilot -- --limit 3 --ai-timeout 60

参数：
  --limit N                  本次最多自动处理多少条，默认 3，最大 20。
  --rounds N                 连续处理几轮，默认 1，最大 5。
  --sourceDomain DOMAIN      可选，按来源域名筛选。
  --ai-timeout N             AI 请求超时时间，默认 60 秒。
  --no-auto-safe             关闭自动安全模式，只生成待审核草稿。
  --publish-all              全量先发布模式：生成或复用草稿，字段完整即自动应用到前台。
  --no-fallback-pending      没有低风险资料时，不自动生成待复核草稿。
  --include-existing-pending 允许覆盖已有 pending 草稿。
  --skip-initial-check       不在开始时运行质量检查。
  --skip-final-check         不在结束时刷新质量检查。

说明：
  默认先自动应用低风险资料；如果没有低风险候选，会继续生成待人工复核草稿。`);
}

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }

    throw new Error(`${filePath} 读取失败：${getErrorMessage(error)}`);
  }
}

async function readJsonArray(filePath) {
  const parsed = await readJsonFile(filePath, []);

  return Array.isArray(parsed) ? parsed : [];
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runNpm(args) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: null,
        command: ["npm", ...args].join(" "),
        output: `${stdout}\n${stderr}`.trim(),
        errorMessage: getErrorMessage(error),
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        ok: exitCode === 0,
        exitCode,
        command: ["npm", ...args].join(" "),
        output: `${stdout}\n${stderr}`.trim(),
        errorMessage:
          exitCode === 0 ? "" : `命令退出码为 ${exitCode ?? "unknown"}。`,
      });
    });
  });
}

function slugify(value) {
  const slug = cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "resource";
}

function buildReportItemMap(report) {
  const lists = report?.lists && typeof report.lists === "object" ? report.lists : {};
  const items = Object.values(lists)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((item) => item && typeof item === "object" && !Array.isArray(item));

  return new Map(
    items
      .map((item) => [cleanString(item.resourceId), item])
      .filter(([resourceId]) => Boolean(resourceId)),
  );
}

function buildAcceptedResourceMap(resources) {
  return new Map(
    resources
      .filter((resource) => resource && typeof resource === "object")
      .map((resource) => [cleanString(resource.id), resource])
      .filter(([resourceId]) => Boolean(resourceId)),
  );
}

function getResourceLinkInfo(resourceId, reportItemsById, acceptedResourcesById) {
  const reportItem = reportItemsById.get(resourceId) ?? {};
  const acceptedResource = acceptedResourcesById.get(resourceId) ?? {};
  const title =
    cleanString(reportItem.title) ||
    cleanString(reportItem.titleZh) ||
    cleanString(acceptedResource.titleZh) ||
    cleanString(reportItem.titleEn) ||
    cleanString(acceptedResource.titleEn) ||
    resourceId;
  const slug =
    cleanString(reportItem.slug) ||
    cleanString(acceptedResource.slug) ||
    slugify(cleanString(acceptedResource.titleEn) || title || resourceId);
  const sourceDomain =
    normalizeSourceDomain(reportItem.sourceDomain) ||
    normalizeSourceDomain(acceptedResource.sourceDomain);

  return {
    title,
    sourceDomain,
    detailUrl: cleanString(reportItem.detailUrl) || `/resources/${slug}`,
    editUrl: `/admin/resources?resourceId=${encodeURIComponent(resourceId)}`,
    enrichmentReviewUrl: `/admin/enrichments?resourceId=${encodeURIComponent(
      resourceId,
    )}`,
  };
}

function logStatusRank(status) {
  const ranks = {
    failed: 100,
    auto_applied: 90,
    auto_accepted: 80,
    needs_human_review: 70,
    skipped_high_risk: 70,
    generated_pending: 65,
    success: 60,
    skipped: 10,
  };

  return ranks[status] ?? 0;
}

function selectFinalLog(logs) {
  return [...logs].sort(
    (left, right) => logStatusRank(right.status) - logStatusRank(left.status),
  )[0];
}

function messageStatusForLog(log) {
  switch (log.status) {
    case "auto_applied":
      return "applied";
    case "auto_accepted":
      return "accepted";
    case "generated_pending":
    case "success":
      return "pending_review";
    case "skipped_high_risk":
    case "needs_human_review":
      return "needs_human_review";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    default:
      return "info";
  }
}

function makeMessageText(title, log) {
  const displayTitle = `《${title}》`;

  switch (log.status) {
    case "auto_applied":
      return `${displayTitle}已生成详细信息，已接受并应用。`;
    case "auto_accepted":
      return `${displayTitle}已生成详细信息，已自动接受，等待应用。`;
    case "generated_pending":
    case "success":
      return `${displayTitle}已生成详细信息，等待人工审核。`;
    case "skipped_high_risk":
    case "needs_human_review":
      return `${displayTitle}已生成详细信息，但需要人工审核后再应用。`;
    case "failed":
      return `${displayTitle}自动生成详细信息失败。`;
    case "skipped":
      return `${displayTitle}本次已跳过，未重复生成草稿。`;
    default:
      return `${displayTitle}已记录智能体处理结果。`;
  }
}

function groupLogsByResourceId(logs) {
  const grouped = new Map();

  for (const log of logs) {
    const resourceId = cleanString(log?.resourceId);

    if (!resourceId) {
      continue;
    }

    const current = grouped.get(resourceId) ?? [];
    current.push(log);
    grouped.set(resourceId, current);
  }

  return grouped;
}

function buildMessagesFromLogs({
  logs,
  runId,
  reportItemsById,
  acceptedResourcesById,
  createdAt,
}) {
  const groupedLogs = groupLogsByResourceId(logs);
  const messages = [];

  for (const [resourceId, resourceLogs] of groupedLogs.entries()) {
    const finalLog = selectFinalLog(resourceLogs);
    const linkInfo = getResourceLinkInfo(
      resourceId,
      reportItemsById,
      acceptedResourcesById,
    );
    const title = cleanString(finalLog.title) || linkInfo.title;
    const status = messageStatusForLog(finalLog);

    messages.push({
      id: `${runId}-${resourceId}-${status}`,
      runId,
      resourceId,
      title,
      status,
      message: makeMessageText(title, finalLog),
      detailUrl: linkInfo.detailUrl,
      editUrl: linkInfo.editUrl,
      enrichmentReviewUrl: linkInfo.enrichmentReviewUrl,
      sourceDomain: linkInfo.sourceDomain,
      actionSummary:
        cleanString(finalLog.reason) ||
        cleanString(finalLog.failureReason) ||
        "未记录详细原因。",
      autoFixStatus: cleanString(finalLog.status),
      safetyReasons: Array.isArray(finalLog.safetyReasons)
        ? finalLog.safetyReasons.map(cleanString).filter(Boolean)
        : [],
      createdAt,
    });
  }

  return messages;
}

function getNewAutoFixLogs(beforeLogs, afterLogs, runStartedAt) {
  if (afterLogs.length >= beforeLogs.length) {
    return afterLogs.slice(beforeLogs.length);
  }

  const startedAt = new Date(runStartedAt).getTime();

  return afterLogs.filter((log) => {
    const logTime = new Date(cleanString(log?.startedAt)).getTime();

    return Number.isFinite(logTime) && logTime >= startedAt;
  });
}

async function appendMessages(nextMessages) {
  if (nextMessages.length === 0) {
    return [];
  }

  const previousMessages = await readJsonArray(autopilotMessagesPath);
  const mergedMessages = [...previousMessages, ...nextMessages].slice(
    -maxStoredMessages,
  );

  await writeJson(autopilotMessagesPath, mergedMessages);

  return mergedMessages;
}

function buildFixArgs(options, nextOptions = {}) {
  const autoSafe = nextOptions.autoSafe ?? options.autoSafe;
  const fixArgs = [
    "run",
    "agent:resource-quality:fix",
    "--",
    "--limit",
    String(options.limit),
    "--ai-timeout",
    String(options.aiTimeout),
  ];

  if (autoSafe) {
    fixArgs.push("--auto-safe");
  }

  if (options.publishAll) {
    fixArgs.push("--publish-all");
  }

  if (options.sourceDomain) {
    fixArgs.push("--sourceDomain", options.sourceDomain);
  }

  if (options.includeExistingPending) {
    fixArgs.push("--include-existing-pending");
  }

  return fixArgs;
}

async function runAutofixRound(options, round) {
  console.log(`\n第 ${round} 轮：正在运行 AI 资料完善智能体……`);
  const beforeAutoFixLogs = await readJsonArray(autoFixLogPath);
  let fixResult = await runNpm(buildFixArgs(options));
  let afterAutoFixLogs = await readJsonArray(autoFixLogPath);
  let newAutoFixLogs = getNewAutoFixLogs(
    beforeAutoFixLogs,
    afterAutoFixLogs,
    new Date().toISOString(),
  );

  if (
    fixResult.ok &&
    !options.publishAll &&
    options.autoSafe &&
    options.fallbackPending &&
    options.limit > 0 &&
    newAutoFixLogs.length === 0
  ) {
    console.log(
      "没有自动安全候选，改为生成待人工复核的 AI 内容草稿……",
    );

    const fallbackBeforeLogs = afterAutoFixLogs;
    const fallbackResult = await runNpm(
      buildFixArgs(options, { autoSafe: false }),
    );

    afterAutoFixLogs = await readJsonArray(autoFixLogPath);
    newAutoFixLogs = [
      ...newAutoFixLogs,
      ...getNewAutoFixLogs(
        fallbackBeforeLogs,
        afterAutoFixLogs,
        new Date().toISOString(),
      ),
    ];

    if (!fallbackResult.ok) {
      fixResult = fallbackResult;
    }
  }

  console.log(`第 ${round} 轮新增处理结果：${newAutoFixLogs.length} 条`);

  return {
    fixResult,
    newAutoFixLogs,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const runStartedAt = new Date().toISOString();
  const runId = `resource-enrichment-autopilot-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  console.log("Resource Enrichment Autopilot 启动。");
  console.log(`runId：${runId}`);
  console.log(`每轮最多自动处理：${options.limit} 条`);
  console.log(`连续处理轮数：${options.rounds} 轮`);
  console.log(`来源域名筛选：${options.sourceDomain || "全部"}`);
  console.log(`AI 请求超时：${options.aiTimeout} 秒`);
  console.log(`自动安全模式：${options.autoSafe ? "开启" : "关闭"}`);
  console.log(`全量先发布模式：${options.publishAll ? "开启" : "关闭"}`);
  console.log(
    `无安全候选时生成待复核草稿：${options.fallbackPending ? "开启" : "关闭"}`,
  );

  if (!options.skipInitialCheck) {
    console.log("正在运行资料质量检查，刷新待处理清单……");
    const checkResult = await runNpm(["run", "agent:resource-quality"]);

    if (!checkResult.ok) {
      console.error("资料质量检查失败，已停止 Autopilot。");
      console.error(checkResult.errorMessage);
      process.exitCode = 1;
      return;
    }
  }

  const allNewAutoFixLogs = [];
  let fixResult = {
    ok: true,
    exitCode: 0,
    command: "",
    output: "",
    errorMessage: "",
  };

  for (let round = 1; round <= options.rounds; round += 1) {
    const roundResult = await runAutofixRound(options, round);

    fixResult = roundResult.fixResult;
    allNewAutoFixLogs.push(...roundResult.newAutoFixLogs);

    if (!roundResult.fixResult.ok) {
      console.log("本轮出现真实失败，已停止后续轮次，保留已完成结果。");
      break;
    }

    if (roundResult.newAutoFixLogs.length === 0) {
      console.log("本轮没有新的资料处理结果，已停止后续轮次。");
      break;
    }

    if (options.publishAll && round < options.rounds) {
      console.log("全量发布模式：正在刷新质量检查，准备下一轮继续处理剩余资料……");
      const refreshResult = await runNpm(["run", "agent:resource-quality"]);

      if (!refreshResult.ok) {
        console.log("刷新质量检查失败，已停止后续轮次。");
        fixResult = refreshResult;
        break;
      }
    }
  }

  if (!options.skipFinalCheck) {
    console.log("正在重新运行资料质量检查，更新后台统计……");
    const finalCheckResult = await runNpm(["run", "agent:resource-quality"]);

    if (!finalCheckResult.ok) {
      console.warn("最终质量检查失败，但已保留本次智能体处理消息。");
      console.warn(finalCheckResult.errorMessage);
    }
  }

  const [report, acceptedResources] = await Promise.all([
    readJsonFile(reportPath, null),
    readJsonArray(acceptedResourcesPath),
  ]);
  const messages = buildMessagesFromLogs({
    logs: allNewAutoFixLogs,
    runId,
    reportItemsById: buildReportItemMap(report),
    acceptedResourcesById: buildAcceptedResourceMap(acceptedResources),
    createdAt: new Date().toISOString(),
  });

  await appendMessages(messages);

  console.log(`本次生成智能体消息数量：${messages.length}`);

  if (messages.length === 0) {
    console.log("本次没有新的资料处理消息。可能没有符合自动安全规则的待补全资料。");
  } else {
    console.log("智能体消息：");

    for (const message of messages) {
      console.log(`- ${message.message}`);
    }
  }

  console.log(`智能体消息写入路径：${autopilotMessagesPath}`);

  const failedMessageCount = messages.filter(
    (message) => message.status === "failed",
  ).length;
  const completedMessageCount = messages.length - failedMessageCount;

  if (!fixResult.ok && completedMessageCount > 0) {
    console.log(
      `本批资料部分完成：${completedMessageCount} 条已生成，${failedMessageCount} 条需要稍后重试。`,
    );
    return;
  }

  if (!fixResult.ok) {
    console.error("AI 资料完善智能体执行失败。");
    console.error(fixResult.errorMessage);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Resource Enrichment Autopilot 运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
