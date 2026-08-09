import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const snapshotAuditReportPath = path.join(
  projectRoot,
  "src/data/imports/us/snapshotAuditReport.json",
);
const runLogPath = path.join(
  projectRoot,
  "src/data/imports/us/snapshotBackfillRuns.json",
);

const defaultBatchSize = 10;
const defaultMaxRounds = 20;
const maxAllowedBatchSize = 25;
const maxAllowedRounds = 50;

function parsePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ""), 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function readArgValue(argv, name) {
  const inlineArg = argv.find((arg) => arg.startsWith(`${name}=`));

  if (inlineArg) {
    return inlineArg.slice(name.length + 1);
  }

  const index = argv.indexOf(name);

  if (index >= 0) {
    return argv[index + 1] || "";
  }

  return "";
}

function parseArgs(argv) {
  const batchSize = parsePositiveInteger(
    readArgValue(argv, "--batchSize") || readArgValue(argv, "--limit"),
    defaultBatchSize,
    maxAllowedBatchSize,
  );
  const maxRounds = parsePositiveInteger(
    readArgValue(argv, "--maxRounds") || readArgValue(argv, "--rounds"),
    defaultMaxRounds,
    maxAllowedRounds,
  );

  return {
    batchSize,
    maxRounds,
    sourceDomain: String(readArgValue(argv, "--sourceDomain") || "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, ""),
    includeFederalRegister: argv.includes("--includeFederalRegister"),
    force: argv.includes("--force"),
  };
}

function commandToString(command, args) {
  return [command, ...args].join(" ");
}

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

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

    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        output,
        command: commandToString("node", [scriptPath, ...args]),
      });
    });

    child.on("error", (error) => {
      const message = error?.message || String(error);
      output += message;
      resolve({
        exitCode: 1,
        output,
        command: commandToString("node", [scriptPath, ...args]),
        errorMessage: message,
      });
    });
  });
}

async function readJsonObject(filePath, fallback = {}) {
  try {
    const content = await readFile(filePath, "utf8");
    const data = JSON.parse(content);

    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function readJsonArray(filePath, fallback = []) {
  try {
    const content = await readFile(filePath, "utf8");
    const data = JSON.parse(content);

    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonArray(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getRemainingCaptureCount(report) {
  const summary = report?.summary || {};
  const requiringCapture = summary.resourcesWithoutSnapshotsRequiringCapture;

  if (typeof requiringCapture === "number") {
    return requiringCapture;
  }

  const missing = Number(summary.resourcesWithoutSnapshots || 0);
  const officialApiPreferred = Number(
    summary.resourcesWithoutSnapshotsOfficialApiPreferred || 0,
  );

  return Math.max(0, missing - officialApiPreferred);
}

function getMissingByDomain(report) {
  return (report?.bySourceDomain || [])
    .filter((entry) => Number(entry.resourcesWithoutSnapshots || 0) > 0)
    .map((entry) => ({
      sourceDomain: entry.sourceDomain || "unknown",
      resourcesWithoutSnapshots: Number(entry.resourcesWithoutSnapshots || 0),
    }));
}

function summarizeOutput(output) {
  return String(output || "")
    .split("\n")
    .filter((line) =>
      /本次待处理数量|新生成快照记录数量|本次新增失败记录数量|没有需要生成快照|仍需常规快照补采|完全没有快照|是否成功|失败原因/.test(
        line,
      ),
    )
    .slice(-40)
    .join("\n");
}

async function runValidate() {
  return runNodeScript(path.join(projectRoot, "scripts/snapshots/validateSnapshots.mjs"));
}

async function runGenerate(options) {
  const args = ["--limit", String(options.batchSize)];

  if (options.sourceDomain) {
    args.push("--sourceDomain", options.sourceDomain);
  }

  if (options.includeFederalRegister) {
    args.push("--includeFederalRegister");
  }

  if (options.force) {
    args.push("--force");
  }

  return runNodeScript(
    path.join(projectRoot, "scripts/snapshots/generateSnapshots.mjs"),
    args,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runStartedAt = new Date().toISOString();
  const rounds = [];
  let stoppedReason = "";
  let initialRemaining = 0;
  let finalRemaining = 0;

  console.log("开始循环补充网页快照。");
  console.log(`每批处理数量：${options.batchSize}`);
  console.log(`最大轮数：${options.maxRounds}`);

  if (options.sourceDomain) {
    console.log(`来源域名筛选：${options.sourceDomain}`);
  }

  if (!options.includeFederalRegister) {
    console.log(
      "Federal Register 默认跳过：该来源建议优先使用官方 API / PDF，避免高频浏览器截图。",
    );
  }

  console.log("\n先执行一次快照校验……");
  const initialValidate = await runValidate();

  if (initialValidate.exitCode !== 0) {
    stoppedReason = "initial_validate_failed";
    throw new Error("初始快照校验失败，已停止。");
  }

  let report = await readJsonObject(snapshotAuditReportPath);
  initialRemaining = getRemainingCaptureCount(report);
  finalRemaining = initialRemaining;

  console.log(`当前仍需常规快照补采数量：${initialRemaining}`);

  for (let round = 1; round <= options.maxRounds; round += 1) {
    const beforeRemaining = finalRemaining;

    if (beforeRemaining < 1) {
      stoppedReason = "no_remaining_snapshots";
      break;
    }

    console.log(`\n第 ${round} 轮开始。`);
    console.log(`本轮前仍需常规补采：${beforeRemaining}`);

    const generateResult = await runGenerate(options);

    if (generateResult.exitCode !== 0) {
      rounds.push({
        round,
        beforeRemaining,
        afterRemaining: beforeRemaining,
        success: false,
        command: generateResult.command,
        outputSummary: summarizeOutput(generateResult.output),
        errorMessage:
          generateResult.errorMessage || "快照生成命令执行失败，已停止。",
      });
      stoppedReason = "generate_failed";
      break;
    }

    const validateResult = await runValidate();

    if (validateResult.exitCode !== 0) {
      rounds.push({
        round,
        beforeRemaining,
        afterRemaining: beforeRemaining,
        success: false,
        command: validateResult.command,
        outputSummary: summarizeOutput(validateResult.output),
        errorMessage: "快照校验命令执行失败，已停止。",
      });
      stoppedReason = "validate_failed";
      break;
    }

    report = await readJsonObject(snapshotAuditReportPath);
    finalRemaining = getRemainingCaptureCount(report);
    const madeProgress = finalRemaining < beforeRemaining;

    rounds.push({
      round,
      beforeRemaining,
      afterRemaining: finalRemaining,
      success: true,
      command: generateResult.command,
      outputSummary: summarizeOutput(generateResult.output),
      errorMessage: "",
    });

    console.log(`本轮后仍需常规补采：${finalRemaining}`);
    console.log(`本轮是否有进展：${madeProgress ? "是" : "否"}`);

    if (!madeProgress) {
      stoppedReason = "no_progress";
      break;
    }
  }

  if (!stoppedReason) {
    stoppedReason =
      finalRemaining < 1 ? "no_remaining_snapshots" : "max_rounds_reached";
  }

  const finishedAt = new Date().toISOString();
  const missingByDomain = getMissingByDomain(report);
  const previousRuns = await readJsonArray(runLogPath);
  const runRecord = {
    id: `snapshot-backfill-${Date.now()}`,
    startedAt: runStartedAt,
    finishedAt,
    batchSize: options.batchSize,
    maxRounds: options.maxRounds,
    sourceDomain: options.sourceDomain || "",
    includeFederalRegister: options.includeFederalRegister,
    force: options.force,
    initialRemaining,
    finalRemaining,
    stoppedReason,
    missingByDomain,
    rounds,
  };

  await writeJsonArray(runLogPath, [runRecord, ...previousRuns].slice(0, 20));

  console.log("\n循环补快照已结束。");
  console.log(`停止原因：${stoppedReason}`);
  console.log(`开始时仍需常规补采：${initialRemaining}`);
  console.log(`结束时仍需常规补采：${finalRemaining}`);
  console.log(`循环日志：${runLogPath}`);

  if (finalRemaining > 0) {
    console.log("仍有未补齐的普通网页快照，通常表示这些网页超时、拒绝访问或需要改用官方 PDF/API。");
  }
}

main().catch((error) => {
  console.error("循环补快照脚本执行失败。");
  console.error(error?.message || String(error));
  process.exitCode = 1;
});
