import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminAction =
  | "ingest-fr"
  | "ingest-nara-web"
  | "ingest-nara-catalog"
  | "drafts-export"
  | "enrich-generate"
  | "enrich-apply"
  | "snapshot-generate"
  | "snapshot-backfill"
  | "snapshot-validate"
  | "resource-quality-check"
  | "resource-quality-fix"
  | "resource-quality-loop"
  | "resource-enrichment-autopilot"
  | "resource-discovery-autopublish"
  | "archive-discovery-cycle"
  | "enrich-apply-update-existing";

type ActionParams = {
  limit?: unknown;
  sourceDomain?: unknown;
  resourceId?: unknown;
  resourceLimit?: unknown;
  institutionLimit?: unknown;
  forceId?: unknown;
  aiTimeout?: unknown;
  autoSafe?: unknown;
  publishAll?: unknown;
  source?: unknown;
  rounds?: unknown;
  batchSize?: unknown;
  stopNoProgress?: unknown;
  refresh?: unknown;
  force?: unknown;
  updateExisting?: unknown;
  background?: unknown;
  skipInitialCheck?: unknown;
  skipFinalCheck?: unknown;
};

type ActionRun = {
  id: string;
  action: AdminAction | string;
  command: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  exitCode: number | null;
  output: string;
};

type CommandSpec = {
  command: "npm";
  args: string[];
  displayCommand: string;
  timeoutMs?: number;
};

const actionRunsPath = join(process.cwd(), "src/data/admin/actionRuns.json");
const defaultActionTimeoutMs = 10 * 60 * 1000;
const loopActionTimeoutMs = 30 * 60 * 1000;
const snapshotBackfillTimeoutMs = 60 * 60 * 1000;
const actionTimeoutMessage = "任务执行超时，请降低 limit 后重试。";

const allowedActions: AdminAction[] = [
  "ingest-fr",
  "ingest-nara-web",
  "ingest-nara-catalog",
  "drafts-export",
  "enrich-generate",
  "enrich-apply",
  "snapshot-generate",
  "snapshot-backfill",
  "snapshot-validate",
  "resource-quality-check",
  "resource-quality-fix",
  "resource-quality-loop",
  "resource-enrichment-autopilot",
  "resource-discovery-autopublish",
  "archive-discovery-cycle",
  "enrich-apply-update-existing",
];

function actionsEnabled() {
  return process.env.ADMIN_ACTIONS_ENABLED === "true";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function booleanValue(value: unknown) {
  return value === true || value === "true";
}

function falseBooleanValue(value: unknown) {
  return value === false || value === "false";
}

function getLimit(value: unknown, fallback = 5) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const integer = Math.trunc(parsed);

  if (integer < 1) {
    return fallback;
  }

  return Math.min(integer, 50);
}

function getPositiveInteger(value: unknown, fallback: number, max: number) {
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

function safeIdentifier(value: unknown, label: string) {
  const text = stringValue(value);

  if (!text) {
    return "";
  }

  if (!/^[a-zA-Z0-9._:-]+$/.test(text)) {
    throw new Error(`${label} 只能包含字母、数字、点、下划线、冒号或连字符。`);
  }

  return text;
}

function safeDomain(value: unknown) {
  const text = stringValue(value);

  if (!text) {
    return "";
  }

  if (!/^[a-zA-Z0-9.-]+$/.test(text)) {
    throw new Error("sourceDomain 格式不正确。");
  }

  return text;
}

function safeDiscoverySource(value: unknown) {
  const text = stringValue(value).toLowerCase();

  if (!text) {
    return "";
  }

  if (
    ![
      "all",
      "ecfr",
      "uscode",
      "omb",
      "nara",
      "loc",
      "dpla",
      "saa",
      "arma",
      "docnow",
      "cosa",
    ].includes(text)
  ) {
    throw new Error(
      "source 只能是 all、ecfr、uscode、omb、nara、loc、dpla、saa、arma、docnow 或 cosa。",
    );
  }

  return text;
}

function toDisplayCommand(command: string, args: string[]) {
  return [command, ...args].join(" ");
}

function npmSpec(args: string[]): CommandSpec {
  return {
    command: "npm",
    args,
    displayCommand: toDisplayCommand("npm", args),
  };
}

function buildCommandSpec(action: AdminAction, params: ActionParams): CommandSpec {
  switch (action) {
    case "ingest-fr":
      return npmSpec(["run", "ingest:fr"]);
    case "ingest-nara-web":
      return npmSpec(["run", "ingest:nara-web"]);
    case "ingest-nara-catalog":
      return npmSpec(["run", "ingest:nara-catalog"]);
    case "drafts-export":
      return npmSpec(["run", "drafts:export"]);
    case "enrich-generate": {
      const forceId = safeIdentifier(params.forceId, "forceId");
      const args = ["run", "enrich:generate", "--"];

      if (forceId) {
        args.push("--force-id", forceId, "--limit", "1");
      } else {
        args.push("--limit", String(getLimit(params.limit)));
      }

      if (booleanValue(params.refresh)) {
        args.push("--refresh");
      }

      return npmSpec(args);
    }
    case "enrich-apply": {
      const resourceId = safeIdentifier(params.resourceId, "resourceId");
      const scriptArgs: string[] = [];

      if (booleanValue(params.updateExisting)) {
        scriptArgs.push("--update-existing");
      }

      if (resourceId) {
        scriptArgs.push("--resourceId", resourceId);
      }

      return npmSpec(
        scriptArgs.length > 0
          ? ["run", "enrich:apply", "--", ...scriptArgs]
          : ["run", "enrich:apply"],
      );
    }
    case "snapshot-generate": {
      const resourceId = safeIdentifier(params.resourceId, "resourceId");
      const sourceDomain = safeDomain(params.sourceDomain);
      const args = ["run", "snapshot:generate", "--"];

      if (resourceId) {
        args.push("--resourceId", resourceId);
      } else {
        args.push("--limit", String(getLimit(params.limit)));

        if (sourceDomain) {
          args.push("--sourceDomain", sourceDomain);
        }
      }

      if (booleanValue(params.force)) {
        args.push("--force");
      }

      return npmSpec(args);
    }
    case "snapshot-backfill": {
      const sourceDomain = safeDomain(params.sourceDomain);
      const args = [
        "run",
        "snapshot:backfill",
        "--",
        "--batchSize",
        String(getPositiveInteger(params.batchSize, 3, 5)),
        "--maxRounds",
        String(getPositiveInteger(params.rounds, 50, 50)),
      ];

      if (sourceDomain) {
        args.push("--sourceDomain", sourceDomain);
      }

      if (booleanValue(params.force)) {
        args.push("--force");
      }

      return {
        ...npmSpec(args),
        timeoutMs: snapshotBackfillTimeoutMs,
      };
    }
    case "snapshot-validate":
      return npmSpec(["run", "snapshot:validate"]);
    case "resource-quality-check":
      return npmSpec(["run", "agent:resource-quality"]);
    case "resource-quality-fix": {
      const fixSourceDomain = safeDomain(params.sourceDomain);
      return npmSpec([
        "run",
        "agent:resource-quality:fix",
        "--",
        "--limit",
        String(getLimit(params.limit, booleanValue(params.autoSafe) ? 20 : 3)),
        "--ai-timeout",
        String(getPositiveInteger(params.aiTimeout, 60, 600)),
        ...(fixSourceDomain ? ["--sourceDomain", fixSourceDomain] : []),
        ...(booleanValue(params.autoSafe) ? ["--auto-safe"] : []),
        ...(booleanValue(params.publishAll) ? ["--publish-all"] : []),
      ]);
    }
    case "resource-quality-loop": {
      const loopSourceDomain = safeDomain(params.sourceDomain);
      return {
        ...npmSpec([
          "run",
          "agent:resource-quality:loop",
          "--",
          "--rounds",
          String(getPositiveInteger(params.rounds, 3, 10)),
          "--batchSize",
          String(getPositiveInteger(params.batchSize, 5, 20)),
          "--ai-timeout",
          String(getPositiveInteger(params.aiTimeout, 60, 600)),
          ...(booleanValue(params.autoSafe) ? ["--auto-safe"] : []),
          ...(loopSourceDomain ? ["--sourceDomain", loopSourceDomain] : []),
          ...(falseBooleanValue(params.stopNoProgress)
            ? ["--no-stop-no-progress"]
            : []),
        ]),
        timeoutMs: loopActionTimeoutMs,
      };
    }
    case "resource-enrichment-autopilot": {
      const autopilotSourceDomain = safeDomain(params.sourceDomain);

      return {
        ...npmSpec([
          "run",
          "agent:resource-enrichment:autopilot",
          "--",
          "--limit",
          String(getPositiveInteger(params.limit, 10, 20)),
          "--rounds",
          String(getPositiveInteger(params.rounds, 1, 5)),
          "--ai-timeout",
          String(getPositiveInteger(params.aiTimeout, 60, 600)),
          ...(autopilotSourceDomain
            ? ["--sourceDomain", autopilotSourceDomain]
            : []),
          ...(booleanValue(params.autoSafe) ? ["--auto-safe"] : []),
          ...(booleanValue(params.publishAll) ? ["--publish-all"] : []),
          ...(booleanValue(params.skipInitialCheck)
            ? ["--skip-initial-check"]
            : []),
          ...(booleanValue(params.skipFinalCheck) ? ["--skip-final-check"] : []),
        ]),
        timeoutMs: loopActionTimeoutMs,
      };
    }
    case "resource-discovery-autopublish": {
      const discoverySource = safeDiscoverySource(params.source);
      const args = [
        "run",
        "agent:resource-discovery:autopublish",
        "--",
        "--limit",
        String(getPositiveInteger(params.limit, 25, 100)),
      ];

      if (discoverySource) {
        args.push("--source", discoverySource);
      }

      return npmSpec(args);
    }
    case "archive-discovery-cycle":
      return npmSpec([
        "run",
        "agent:archive-discovery:cycle",
        "--",
        "--batch-size",
        String(getPositiveInteger(params.batchSize, 8, 25)),
        "--resource-limit",
        String(getPositiveInteger(params.resourceLimit, 8, 50)),
        "--institution-limit",
        String(getPositiveInteger(params.institutionLimit, 8, 50)),
      ]);
    case "enrich-apply-update-existing":
      return npmSpec(["run", "enrich:apply", "--", "--update-existing"]);
  }
}

async function readActionRuns(): Promise<ActionRun[]> {
  try {
    const fileContent = await readFile(actionRunsPath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return Array.isArray(parsed) ? (parsed as ActionRun[]) : [];
  } catch {
    return [];
  }
}

async function appendActionRun(run: ActionRun) {
  const runs = await readActionRuns();

  runs.push(run);
  await mkdir(dirname(actionRunsPath), { recursive: true });
  await writeFile(actionRunsPath, `${JSON.stringify(runs, null, 2)}\n`, "utf8");
}

function runCommand(spec: CommandSpec) {
  return new Promise<{
    exitCode: number | null;
    output: string;
    error?: string;
  }>((resolve) => {
    let settled = false;
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    const child = spawn(spec.command, spec.args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      detached: process.platform !== "win32",
    });
    let output = "";
    const timeout = setTimeout(() => {
      timedOut = true;
      output = [output, actionTimeoutMessage].filter(Boolean).join("\n");
      killChildProcess(child.pid, "SIGTERM");
      killTimer = setTimeout(() => {
        killChildProcess(child.pid, "SIGKILL");
      }, 5000);
    }, spec.timeoutMs ?? defaultActionTimeoutMs);

    function killChildProcess(pid: number | undefined, signal: NodeJS.Signals) {
      if (!pid) {
        return;
      }

      try {
        if (process.platform === "win32") {
          child.kill(signal);
        } else {
          process.kill(-pid, signal);
        }
      } catch {
        try {
          child.kill(signal);
        } catch {
          // The process may already be gone after the timeout signal.
        }
      }
    }

    function settle(result: {
      exitCode: number | null;
      output: string;
      error?: string;
    }) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (killTimer) {
        clearTimeout(killTimer);
      }

      resolve(result);
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      output += chunk;
    });

    child.on("error", (error) => {
      settle({
        exitCode: null,
        output,
        error: getErrorMessage(error),
      });
    });

    child.on("close", (exitCode) => {
      settle({
        exitCode,
        output,
        error: timedOut ? actionTimeoutMessage : undefined,
      });
    });
  });
}

function runCommandInBackground({
  action,
  spec,
  startedAt,
}: {
  action: AdminAction;
  spec: CommandSpec;
  startedAt: string;
}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let timedOut = false;
  let killTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;
  let output = "";
  const child = spawn(spec.command, spec.args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    detached: process.platform !== "win32",
  });
  const timeout = setTimeout(() => {
    timedOut = true;
    output = [output, actionTimeoutMessage].filter(Boolean).join("\n");
    killChildProcess(child.pid, "SIGTERM");
    killTimer = setTimeout(() => {
      killChildProcess(child.pid, "SIGKILL");
    }, 5000);
  }, spec.timeoutMs ?? defaultActionTimeoutMs);

  function killChildProcess(pid: number | undefined, signal: NodeJS.Signals) {
    if (!pid) {
      return;
    }

    try {
      if (process.platform === "win32") {
        child.kill(signal);
      } else {
        process.kill(-pid, signal);
      }
    } catch {
      try {
        child.kill(signal);
      } catch {
        // The process may already be gone after the timeout signal.
      }
    }
  }

  function appendFinishedRun(result: {
    exitCode: number | null;
    error?: string;
  }) {
    if (settled) {
      return;
    }

    settled = true;
    clearTimeout(timeout);

    if (killTimer) {
      clearTimeout(killTimer);
    }

    const finishedAt = new Date().toISOString();
    const finalError = timedOut ? actionTimeoutMessage : result.error;
    const finalOutput = finalError
      ? [output, finalError].filter(Boolean).join("\n")
      : output;

    void appendActionRun({
      id,
      action,
      command: spec.displayCommand,
      startedAt,
      finishedAt,
      success: !finalError && result.exitCode === 0,
      exitCode: result.exitCode,
      output: finalOutput,
    });
  }

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });

  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });

  child.on("error", (error) => {
    appendFinishedRun({
      exitCode: null,
      error: getErrorMessage(error),
    });
  });

  child.on("close", (exitCode) => {
    appendFinishedRun({ exitCode });
  });

  return id;
}

export async function GET() {
  const runs = await readActionRuns();

  return NextResponse.json({
    success: true,
    actionsEnabled: actionsEnabled(),
    runs: runs.slice(-20).reverse(),
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
    const body = (await request.json()) as {
      action?: string;
      params?: ActionParams;
    };
    const action = stringValue(body.action) as AdminAction;

    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: "action 不在允许范围内。" },
        { status: 400 },
      );
    }

    const spec = buildCommandSpec(action, body.params ?? {});
    const startedAt = new Date().toISOString();

    if (
      action === "resource-enrichment-autopilot" &&
      booleanValue(body.params?.background)
    ) {
      const backgroundRunId = runCommandInBackground({
        action,
        spec,
        startedAt,
      });

      return NextResponse.json({
        success: true,
        action,
        command: spec.displayCommand,
        startedAt,
        background: true,
        runId: backgroundRunId,
        exitCode: null,
        output:
          "智能体已在后台开始处理。你可以继续使用后台；几分钟后刷新页面查看新的处理消息。",
      });
    }

    const result = await runCommand(spec);
    const finishedAt = new Date().toISOString();
    const success = !result.error && result.exitCode === 0;
    const output = result.error
      ? [result.output, result.error].filter(Boolean).join("\n")
      : result.output;
    const run: ActionRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      command: spec.displayCommand,
      startedAt,
      finishedAt,
      success,
      exitCode: result.exitCode,
      output,
    };

    await appendActionRun(run);

    if (!success) {
      return NextResponse.json({
        success: false,
        action,
        command: spec.displayCommand,
        startedAt,
        finishedAt,
        exitCode: result.exitCode,
        error: result.error || `任务退出码为 ${result.exitCode}。`,
        output,
      });
    }

    return NextResponse.json({
      success: true,
      action,
      command: spec.displayCommand,
      startedAt,
      finishedAt,
      exitCode: result.exitCode,
      output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `后台任务执行失败：${getErrorMessage(error)}`,
        output: "",
      },
      { status: 500 },
    );
  }
}
