import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const schedulerLogPath = path.join(
  projectRoot,
  "src/data/admin/archiveDiscoverySchedulerLog.json",
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
  return {
    once: hasArg(argv, ["--once"]),
    intervalMinutes: positiveInteger(
      readArgValue(argv, ["--interval-minutes", "--intervalMinutes"]),
      60,
      24 * 60,
    ),
    batchSize: positiveInteger(
      readArgValue(argv, ["--batch-size", "--batchSize"]),
      8,
      25,
    ),
    maxRuns: positiveInteger(readArgValue(argv, ["--max-runs", "--maxRuns"]), 0, 200),
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function runCycle(batchSize) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const startedAt = new Date().toISOString();
    const args = [
      "run",
      "agent:archive-discovery:cycle",
      "--",
      "--batch-size",
      String(batchSize),
    ];
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
        startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        exitCode: null,
        output,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        command: ["npm", ...args].join(" "),
        startedAt,
        finishedAt: new Date().toISOString(),
        success: exitCode === 0,
        exitCode,
        output,
        errorMessage:
          exitCode === 0 ? "" : `命令退出码为 ${exitCode ?? "unknown"}。`,
      });
    });
  });
}

async function appendSchedulerLog(record) {
  const logs = await readJsonArray(schedulerLogPath);

  await writeJson(schedulerLogPath, [...logs, record].slice(-200));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const intervalMs = options.intervalMinutes * 60 * 1000;
  let completedRuns = 0;

  console.log("ArchiveScope 定时安全扩库 Agent");
  console.log(`执行间隔：${options.intervalMinutes} 分钟`);
  console.log(`每轮批次：${options.batchSize}`);
  console.log(options.once ? "模式：只运行一次" : "模式：持续定时运行");

  while (true) {
    completedRuns += 1;
    console.log(`\n[${completedRuns}] 开始运行安全巡检扩库……`);
    const result = await runCycle(options.batchSize);

    await appendSchedulerLog({
      id: `scheduler-${Date.now()}-${completedRuns}`,
      ...result,
      batchSize: options.batchSize,
      intervalMinutes: options.intervalMinutes,
    });

    if (!result.success) {
      console.error("本轮安全巡检扩库失败，定时器已停止。");
      process.exitCode = 1;
      return;
    }

    if (options.once || (options.maxRuns > 0 && completedRuns >= options.maxRuns)) {
      console.log("定时器已按要求结束。");
      return;
    }

    console.log(`下一轮将在 ${options.intervalMinutes} 分钟后开始。`);
    await wait(intervalMs);
  }
}

main().catch((error) => {
  console.error(`定时安全扩库失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
