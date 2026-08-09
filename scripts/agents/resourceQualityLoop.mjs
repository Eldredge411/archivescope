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
const loopRunsPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityLoopRuns.json",
);

const defaultRounds = 3;
const maxRounds = 10;
const defaultBatchSize = 5;
const maxBatchSize = 20;
const defaultAiTimeout = 60;
const maxAiTimeout = 600;

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function cleanString(value) {
  return String(value ?? "").trim();
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

function hasArg(argv, names) {
  return argv.some((arg) => names.includes(arg));
}

function parseBoundedInteger(value, fallback, max, label) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 0) {
    console.warn(`${label} 不能小于 0，已使用默认值 ${fallback}。`);
    return fallback;
  }

  if (parsed > max) {
    console.warn(`${label} 超过上限 ${max}，已自动限制为 ${max}。`);
    return max;
  }

  return parsed;
}

function parseArgs(argv) {
  const rawRounds = readArgValue(argv, ["--rounds"]);
  const rawBatchSize = readArgValue(argv, ["--batchSize", "--batch-size"]);
  const rawAiTimeout = readArgValue(argv, ["--ai-timeout", "--aiTimeout"]);
  const rawSourceDomain = readArgValue(argv, [
    "--sourceDomain",
    "--source-domain",
  ]);
  const autoSafe = hasArg(argv, ["--auto-safe", "--autoSafe"]);
  const sourceDomain = normalizeSourceDomain(rawSourceDomain);

  return {
    rounds: parseBoundedInteger(rawRounds, defaultRounds, maxRounds, "--rounds"),
    batchSize: parseBoundedInteger(
      rawBatchSize,
      defaultBatchSize,
      maxBatchSize,
      "--batchSize",
    ),
    autoSafe,
    sourceDomain: sourceDomain || (autoSafe ? "archives.gov" : ""),
    aiTimeout: parseBoundedInteger(
      rawAiTimeout,
      defaultAiTimeout,
      maxAiTimeout,
      "--ai-timeout",
    ),
    stopNoProgress: !hasArg(argv, ["--no-stop-no-progress"]),
  };
}

function normalizeSourceDomain(value) {
  return cleanString(value).toLowerCase().replace(/^www\./, "");
}

async function readJsonFile(filePath, fallback) {
  try {
    const content = await readFile(filePath, "utf8");

    return JSON.parse(content);
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

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getNeedsEnrichmentFromReport(report) {
  const value = report?.summary?.needsEnrichment;

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function readNeedsEnrichment() {
  const report = await readJsonFile(reportPath, null);

  return getNeedsEnrichmentFromReport(report);
}

function trimOutput(output) {
  const text = cleanString(output);

  if (text.length <= 2400) {
    return text;
  }

  return `...${text.slice(-2400)}`;
}

function displayCommand(args) {
  return ["npm", ...args].join(" ");
}

function outputIndicatesNoSafeCandidates(output) {
  return cleanString(output).includes(
    "没有符合 auto-safe 规则的低风险资料，剩余资料需要人工审核。",
  );
}

function runNpm(args) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const commandText = displayCommand(args);

    console.log(`执行命令：${commandText}`);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      resolve({
        command: commandText,
        success: false,
        exitCode: null,
        output: trimOutput(output),
        errorMessage: getErrorMessage(error),
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        command: commandText,
        success: exitCode === 0,
        exitCode,
        output: trimOutput(output),
        errorMessage:
          exitCode === 0 ? "" : `命令退出码为 ${exitCode ?? "unknown"}。`,
      });
    });
  });
}

function makeRunId() {
  return `resource-quality-loop-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function summarizeCommands(commands) {
  return commands
    .map((command) => {
      const status = command.success ? "成功" : "失败";
      const output = trimOutput(command.output);

      return `${command.command}\n状态：${status}；退出码：${
        command.exitCode ?? "unknown"
      }${command.errorMessage ? `；错误：${command.errorMessage}` : ""}${
        output ? `\n${output}` : ""
      }`;
    })
    .join("\n\n---\n\n");
}

async function appendLoopRun(run) {
  const previousRuns = await readJsonArray(loopRunsPath);

  previousRuns.push(run);
  await writeJson(loopRunsPath, previousRuns);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const run = {
    id: makeRunId(),
    startedAt,
    finishedAt: "",
    roundsRequested: options.rounds,
    roundsCompleted: 0,
    batchSize: options.batchSize,
    autoSafe: options.autoSafe,
    sourceDomain: options.sourceDomain,
    aiTimeout: options.aiTimeout,
    initialNeedsEnrichment: null,
    finalNeedsEnrichment: null,
    stoppedReason: "",
    rounds: [],
  };

  console.log("Resource Quality Agent 循环工作流启动。");
  console.log(`最大轮数：${options.rounds}`);
  console.log(`每轮 batchSize：${options.batchSize}`);
  console.log(`是否启用 auto-safe：${options.autoSafe ? "是" : "否"}`);
  console.log(`来源域名筛选：${options.sourceDomain || "未指定"}`);
  console.log(`AI 请求超时：${options.aiTimeout} 秒`);
  console.log(`无进展停止：${options.stopNoProgress ? "是" : "否"}`);

  try {
    if (options.rounds === 0) {
      run.stoppedReason = "rounds_zero";
      console.log("rounds 为 0，本次只生成空运行记录。");
      return;
    }

    for (let round = 1; round <= options.rounds; round += 1) {
      const roundRecord = {
        round,
        beforeNeedsEnrichment: null,
        afterNeedsEnrichment: null,
        commands: [],
        success: false,
        outputSummary: "",
        errorMessage: "",
      };

      console.log(`\n========== 第 ${round} 轮 ==========\n`);

      const checkBefore = await runNpm(["run", "agent:resource-quality"]);
      roundRecord.commands.push(checkBefore);

      if (!checkBefore.success) {
        roundRecord.errorMessage =
          checkBefore.errorMessage || "质量检查命令执行失败。";
        run.rounds.push(roundRecord);
        run.stoppedReason = "command_failed";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }

      const beforeNeedsEnrichment = await readNeedsEnrichment();
      roundRecord.beforeNeedsEnrichment = beforeNeedsEnrichment;

      if (run.initialNeedsEnrichment === null) {
        run.initialNeedsEnrichment = beforeNeedsEnrichment;
      }

      console.log(`修复前 needs_enrichment：${beforeNeedsEnrichment}`);

      if (beforeNeedsEnrichment === 0) {
        roundRecord.afterNeedsEnrichment = 0;
        roundRecord.success = true;
        roundRecord.outputSummary = summarizeCommands(roundRecord.commands);
        run.rounds.push(roundRecord);
        run.roundsCompleted += 1;
        run.stoppedReason = "no_needs_enrichment";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }

      const fixArgs = [
        "run",
        "agent:resource-quality:fix",
        "--",
        "--limit",
        String(options.batchSize),
        "--ai-timeout",
        String(options.aiTimeout),
      ];

      if (options.autoSafe) {
        fixArgs.push("--auto-safe");
      }

      if (options.sourceDomain) {
        fixArgs.push("--sourceDomain", options.sourceDomain);
      }

      const fixResult = await runNpm(fixArgs);
      roundRecord.commands.push(fixResult);

      if (!fixResult.success) {
        roundRecord.errorMessage =
          fixResult.errorMessage || "资料修复命令执行失败。";
        roundRecord.outputSummary = summarizeCommands(roundRecord.commands);
        run.rounds.push(roundRecord);
        run.stoppedReason = "command_failed";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }

      if (options.autoSafe && outputIndicatesNoSafeCandidates(fixResult.output)) {
        roundRecord.afterNeedsEnrichment = beforeNeedsEnrichment;
        roundRecord.success = true;
        roundRecord.outputSummary = summarizeCommands(roundRecord.commands);
        run.rounds.push(roundRecord);
        run.roundsCompleted += 1;
        run.stoppedReason = "no_safe_candidates";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }

      if (options.autoSafe) {
        const applyResult = await runNpm([
          "run",
          "enrich:apply",
          "--",
          "--update-existing",
        ]);
        roundRecord.commands.push(applyResult);

        if (!applyResult.success) {
          roundRecord.errorMessage =
            applyResult.errorMessage || "enrichment 应用命令执行失败。";
          roundRecord.outputSummary = summarizeCommands(roundRecord.commands);
          run.rounds.push(roundRecord);
          run.stoppedReason = "command_failed";
          console.log(`停止原因：${run.stoppedReason}`);
          break;
        }
      }

      const checkAfter = await runNpm(["run", "agent:resource-quality"]);
      roundRecord.commands.push(checkAfter);

      if (!checkAfter.success) {
        roundRecord.errorMessage =
          checkAfter.errorMessage || "修复后质量检查命令执行失败。";
        roundRecord.outputSummary = summarizeCommands(roundRecord.commands);
        run.rounds.push(roundRecord);
        run.stoppedReason = "command_failed";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }

      const afterNeedsEnrichment = await readNeedsEnrichment();
      const madeProgress = afterNeedsEnrichment < beforeNeedsEnrichment;

      roundRecord.afterNeedsEnrichment = afterNeedsEnrichment;
      roundRecord.success = true;
      roundRecord.outputSummary = summarizeCommands(roundRecord.commands);
      run.rounds.push(roundRecord);
      run.roundsCompleted += 1;

      console.log(`修复后 needs_enrichment：${afterNeedsEnrichment}`);
      console.log(`本轮是否有进展：${madeProgress ? "是" : "否"}`);

      if (options.stopNoProgress && !madeProgress) {
        run.stoppedReason = "no_progress";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }

      if (afterNeedsEnrichment === 0) {
        run.stoppedReason = "no_needs_enrichment";
        console.log(`停止原因：${run.stoppedReason}`);
        break;
      }
    }

    if (!run.stoppedReason) {
      run.stoppedReason = "rounds_completed";
      console.log(`停止原因：${run.stoppedReason}`);
    }
  } catch (error) {
    run.stoppedReason = "command_failed";
    run.rounds.push({
      round: run.rounds.length + 1,
      beforeNeedsEnrichment: null,
      afterNeedsEnrichment: null,
      commands: [],
      success: false,
      outputSummary: "",
      errorMessage: getErrorMessage(error),
    });
    console.error(`循环工作流失败：${getErrorMessage(error)}`);
  } finally {
    run.finishedAt = new Date().toISOString();

    try {
      run.finalNeedsEnrichment = await readNeedsEnrichment();
    } catch {
      run.finalNeedsEnrichment = run.rounds.at(-1)?.afterNeedsEnrichment ?? null;
    }

    if (run.initialNeedsEnrichment === null) {
      run.initialNeedsEnrichment = run.finalNeedsEnrichment;
    }

    await appendLoopRun(run);

    console.log("\n========== 循环工作流结束 ==========");
    console.log(`完成轮数：${run.roundsCompleted}`);
    console.log(`初始 needs_enrichment：${run.initialNeedsEnrichment ?? "未记录"}`);
    console.log(`最终 needs_enrichment：${run.finalNeedsEnrichment ?? "未记录"}`);
    console.log(`停止原因：${run.stoppedReason}`);
    console.log(`循环日志写入：${loopRunsPath}`);

    if (run.stoppedReason === "command_failed") {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(`Resource Quality Loop 运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
