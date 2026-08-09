import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SchedulerAction = "start" | "stop";

type SchedulerState = {
  enabled: boolean;
  status: "running" | "stopped";
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
  id?: string;
  command?: string;
  startedAt?: string;
  finishedAt?: string;
  success?: boolean;
  exitCode?: number | null;
  output?: string;
  errorMessage?: string;
  batchSize?: number;
  intervalMinutes?: number;
};

type DiscoveryRun = {
  id?: string;
  startedAt?: string;
  finishedAt?: string;
  success?: boolean;
  resourcesAdded?: number;
  institutionsAdded?: number;
  stoppedReason?: string;
};

const schedulerStatePath = join(
  process.cwd(),
  "src/data/admin/archiveDiscoverySchedulerState.json",
);
const schedulerLogPath = join(
  process.cwd(),
  "src/data/admin/archiveDiscoverySchedulerLog.json",
);
const discoveryRunsPath = join(
  process.cwd(),
  "src/data/admin/archiveDiscoveryAgentRuns.json",
);

function actionsEnabled() {
  return process.env.ADMIN_ACTIONS_ENABLED === "true";
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const integer = Math.trunc(parsed);

  if (integer < 1) {
    return fallback;
  }

  return Math.min(integer, max);
}

function isSchedulerAction(value: string): value is SchedulerAction {
  return value === "start" || value === "stop";
}

function getDefaultState(): SchedulerState {
  return {
    enabled: false,
    status: "stopped",
    pid: null,
    intervalMinutes: 60,
    batchSize: 8,
    command: "",
    startedAt: "",
    stoppedAt: "",
    updatedAt: "",
    lastError: "",
  };
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return parsed as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readState() {
  const rawState = await readJsonFile<Partial<SchedulerState>>(
    schedulerStatePath,
    {},
  );
  const fallback = getDefaultState();

  return {
    ...fallback,
    ...rawState,
    enabled: rawState.enabled === true,
    status: rawState.status === "running" ? "running" : "stopped",
    pid:
      typeof rawState.pid === "number" && Number.isFinite(rawState.pid)
        ? rawState.pid
        : null,
    intervalMinutes: numberValue(rawState.intervalMinutes, 60, 24 * 60),
    batchSize: numberValue(rawState.batchSize, 8, 25),
    command: stringValue(rawState.command),
    startedAt: stringValue(rawState.startedAt),
    stoppedAt: stringValue(rawState.stoppedAt),
    updatedAt: stringValue(rawState.updatedAt),
    lastError: stringValue(rawState.lastError),
  } satisfies SchedulerState;
}

async function writeState(state: SchedulerState) {
  await writeJsonFile(schedulerStatePath, {
    ...state,
    updatedAt: new Date().toISOString(),
  });
}

async function readJsonArray<T>(filePath: string) {
  const parsed = await readJsonFile<unknown>(filePath, []);

  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function isPidRunning(pid: number | null) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

function killProcessGroup(pid: number | null, signal: NodeJS.Signals) {
  if (!pid) {
    return;
  }

  try {
    if (process.platform === "win32") {
      process.kill(pid, signal);
    } else {
      process.kill(-pid, signal);
    }
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // The scheduler may have already stopped.
    }
  }
}

async function getStatus() {
  const state = await readState();
  const running = isPidRunning(state.pid);
  const nextState =
    state.enabled && !running
      ? {
          ...state,
          enabled: false,
          status: "stopped" as const,
          pid: null,
          stoppedAt: state.stoppedAt || new Date().toISOString(),
          lastError: "定时扩库进程已经停止。",
        }
      : {
          ...state,
          status: running ? ("running" as const) : ("stopped" as const),
          enabled: running,
        };
  const shouldWriteState =
    state.enabled !== nextState.enabled ||
    state.status !== nextState.status ||
    state.pid !== nextState.pid ||
    state.stoppedAt !== nextState.stoppedAt ||
    state.lastError !== nextState.lastError;

  if (shouldWriteState) {
    await writeState(nextState);
  }

  const schedulerLogs = await readJsonArray<SchedulerLog>(schedulerLogPath);
  const discoveryRuns = await readJsonArray<DiscoveryRun>(discoveryRunsPath);

  return {
    actionsEnabled: actionsEnabled(),
    running,
    state: nextState,
    lastSchedulerLog: schedulerLogs.at(-1) ?? null,
    recentSchedulerLogs: schedulerLogs.slice(-5).reverse(),
    lastDiscoveryRun: discoveryRuns.at(-1) ?? null,
    recentDiscoveryRuns: discoveryRuns.slice(-5).reverse(),
  };
}

function buildSchedulerCommand(intervalMinutes: number, batchSize: number) {
  const args = [
    "run",
    "agent:archive-discovery:scheduler",
    "--",
    "--interval-minutes",
    String(intervalMinutes),
    "--batch-size",
    String(batchSize),
  ];

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args,
    displayCommand: ["npm", ...args].join(" "),
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    ...(await getStatus()),
  });
}

export async function POST(request: Request) {
  if (!actionsEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "当前未启用后台命令执行。请在 .env.local 中设置 ADMIN_ACTIONS_ENABLED=true。",
      },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      intervalMinutes?: unknown;
      batchSize?: unknown;
    };
    const action = stringValue(body.action);

    if (!isSchedulerAction(action)) {
      return NextResponse.json(
        { success: false, error: "action 只能是 start 或 stop。" },
        { status: 400 },
      );
    }

    const currentStatus = await getStatus();

    if (action === "stop") {
      killProcessGroup(currentStatus.state.pid, "SIGTERM");

      const stoppedState: SchedulerState = {
        ...currentStatus.state,
        enabled: false,
        status: "stopped",
        pid: null,
        stoppedAt: new Date().toISOString(),
        lastError: "",
      };

      await writeState(stoppedState);

      return NextResponse.json({
        success: true,
        message: "已暂停每小时自动扩库。",
        ...(await getStatus()),
      });
    }

    if (currentStatus.running) {
      return NextResponse.json({
        success: true,
        message: "每小时自动扩库已经在运行。",
        ...currentStatus,
      });
    }

    const intervalMinutes = numberValue(body.intervalMinutes, 60, 24 * 60);
    const batchSize = numberValue(body.batchSize, 8, 25);
    const spec = buildSchedulerCommand(intervalMinutes, batchSize);
    const child = spawn(spec.command, spec.args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: "ignore",
    });

    child.unref();

    const startedState: SchedulerState = {
      enabled: true,
      status: "running",
      pid: child.pid ?? null,
      intervalMinutes,
      batchSize,
      command: spec.displayCommand,
      startedAt: new Date().toISOString(),
      stoppedAt: "",
      updatedAt: "",
      lastError: "",
    };

    await writeState(startedState);

    return NextResponse.json({
      success: true,
      message: "已开启每小时自动扩库。",
      ...(await getStatus()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "自动扩库开关执行失败。",
      },
      { status: 500 },
    );
  }
}
