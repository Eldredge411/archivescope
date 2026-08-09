import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const runsPath = path.join(
  projectRoot,
  "src/data/admin/archiveDiscoveryAgentRuns.json",
);

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

function positiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(cleanString(value), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function parseArgs(argv) {
  const batchSize = positiveInteger(
    readArgValue(argv, ["--batch-size", "--batchSize"]),
    8,
    25,
  );

  return {
    batchSize,
    resourceLimit: positiveInteger(
      readArgValue(argv, ["--resource-limit", "--resourceLimit"]),
      batchSize,
      50,
    ),
    institutionLimit: positiveInteger(
      readArgValue(argv, ["--institution-limit", "--institutionLimit"]),
      batchSize,
      50,
    ),
    dryRun: hasArg(argv, ["--dry-run", "--dryRun"]),
    skipQualityCheck: hasArg(argv, ["--skip-quality-check"]),
  };
}

async function readJsonArray(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runNpm(args) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const startedAt = new Date().toISOString();
    const child = spawn(command, args, {
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

    child.on("error", (error) => {
      resolve({
        command: ["npm", ...args].join(" "),
        success: false,
        exitCode: null,
        startedAt,
        finishedAt: new Date().toISOString(),
        output,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        command: ["npm", ...args].join(" "),
        success: exitCode === 0,
        exitCode,
        startedAt,
        finishedAt: new Date().toISOString(),
        output,
        errorMessage:
          exitCode === 0 ? "" : `命令退出码为 ${exitCode ?? "unknown"}。`,
      });
    });
  });
}

function extractNumber(output, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = output.match(new RegExp(`${escapedLabel}：([0-9]+)`));

  return match ? Number.parseInt(match[1], 10) : 0;
}

function summarizeCommand(result) {
  return {
    command: result.command,
    success: result.success,
    exitCode: result.exitCode,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    outputSummary: result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(
        (line) =>
          line.includes("安全") ||
          line.includes("本次新增") ||
          line.includes("可新增候选") ||
          line.includes("已写入") ||
          line.includes("通过数量") ||
          line.includes("需补全内容"),
      )
      .slice(-20)
      .join("\n"),
    errorMessage: result.errorMessage,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const run = {
    id: `archive-discovery-${Date.now()}`,
    startedAt: new Date().toISOString(),
    finishedAt: "",
    batchSize: options.batchSize,
    resourceLimit: options.resourceLimit,
    institutionLimit: options.institutionLimit,
    dryRun: options.dryRun,
    success: false,
    resourcesAdded: 0,
    institutionsAdded: 0,
    stoppedReason: "",
    commands: [],
  };

  console.log("ArchiveScope 安全巡检扩库 Agent");
  console.log(`资源批次上限：${options.resourceLimit}`);
  console.log(`机构批次上限：${options.institutionLimit}`);
  console.log(`dry-run：${options.dryRun ? "是" : "否"}`);

  const resourceArgs = [
    "run",
    "agent:resource-discovery:autopublish",
    "--",
    "--limit",
    String(options.resourceLimit),
    ...(options.dryRun ? ["--dry-run"] : []),
  ];
  const institutionArgs = [
    "run",
    "agent:institution-discovery:autopublish",
    "--",
    "--limit",
    String(options.institutionLimit),
    ...(options.dryRun ? ["--dry-run"] : []),
  ];
  const resourceResult = await runNpm(resourceArgs);

  run.commands.push(summarizeCommand(resourceResult));
  run.resourcesAdded = extractNumber(resourceResult.output, "本次新增资料数量");

  if (!resourceResult.success) {
    run.finishedAt = new Date().toISOString();
    run.stoppedReason = "resource_discovery_failed";
    await writeRun(run);
    process.exitCode = 1;
    return;
  }

  const institutionResult = await runNpm(institutionArgs);

  run.commands.push(summarizeCommand(institutionResult));
  run.institutionsAdded = extractNumber(
    institutionResult.output,
    "本次新增机构数量",
  );

  if (!institutionResult.success) {
    run.finishedAt = new Date().toISOString();
    run.stoppedReason = "institution_discovery_failed";
    await writeRun(run);
    process.exitCode = 1;
    return;
  }

  if (!options.dryRun && !options.skipQualityCheck) {
    const qualityResult = await runNpm(["run", "agent:resource-quality"]);

    run.commands.push(summarizeCommand(qualityResult));

    if (!qualityResult.success) {
      run.finishedAt = new Date().toISOString();
      run.stoppedReason = "quality_check_failed";
      await writeRun(run);
      process.exitCode = 1;
      return;
    }
  }

  run.success = true;
  run.finishedAt = new Date().toISOString();
  run.stoppedReason =
    run.resourcesAdded === 0 && run.institutionsAdded === 0
      ? "no_new_candidates"
      : "completed";

  await writeRun(run);

  console.log(`本次新增资料数量：${run.resourcesAdded}`);
  console.log(`本次新增机构数量：${run.institutionsAdded}`);
  console.log(`停止原因：${run.stoppedReason}`);
  console.log(`巡检日志写入路径：${runsPath}`);
}

async function writeRun(run) {
  const previousRuns = await readJsonArray(runsPath);

  await writeJson(runsPath, [...previousRuns, run].slice(-200));
}

main().catch(async (error) => {
  console.error(`安全巡检扩库失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
