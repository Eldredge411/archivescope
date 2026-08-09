import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { AdminResourceQualityAgentReport } from "@/components/AdminResourceQualityAgentReport";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "资料质量 Agent | ArchiveScope",
  description:
    "展示 Resource Quality Agent 对前台资料的自动检查结果。",
};

const reportPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityAgentReport.json",
);
const logsPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityAgentLogs.json",
);
const autoFixLogPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityAutoFixLog.json",
);
const loopRunsPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityLoopRuns.json",
);
const autopilotMessagesPath = join(
  process.cwd(),
  "src/data/admin/resourceEnrichmentAutopilotMessages.json",
);
const enrichmentDraftsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);

async function readJsonFile(filePath: string, fallback: unknown) {
  try {
    const fileContent = await readFile(filePath, "utf8");

    return {
      data: JSON.parse(fileContent) as unknown,
      error: "",
      missing: false,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        data: fallback,
        error: "",
        missing: true,
      };
    }

    return {
      data: fallback,
      error: error instanceof Error ? error.message : String(error),
      missing: false,
    };
  }
}

async function readResourceQualityAgentReport() {
  const [
    reportResult,
    logsResult,
    autoFixLogResult,
    loopRunsResult,
    autopilotMessagesResult,
    enrichmentDraftsResult,
  ] = await Promise.all([
      readJsonFile(reportPath, null),
      readJsonFile(logsPath, []),
      readJsonFile(autoFixLogPath, []),
      readJsonFile(loopRunsPath, []),
      readJsonFile(autopilotMessagesPath, []),
      readJsonFile(enrichmentDraftsPath, []),
    ]);

  return {
    report: reportResult.data,
    logs: Array.isArray(logsResult.data) ? logsResult.data : [],
    autoFixLogs: Array.isArray(autoFixLogResult.data)
      ? autoFixLogResult.data
      : [],
    loopRuns: Array.isArray(loopRunsResult.data) ? loopRunsResult.data : [],
    autopilotMessages: Array.isArray(autopilotMessagesResult.data)
      ? autopilotMessagesResult.data
      : [],
    enrichmentDrafts: Array.isArray(enrichmentDraftsResult.data)
      ? enrichmentDraftsResult.data
      : [],
    error: [
      reportResult.error,
      logsResult.error,
      autoFixLogResult.error,
      loopRunsResult.error,
      autopilotMessagesResult.error,
      enrichmentDraftsResult.error,
    ]
      .filter(Boolean)
      .join("；"),
    missing: reportResult.missing,
  };
}

export default async function AdminQualityAgentPage() {
  const {
    report,
    logs,
    autoFixLogs,
    loopRuns,
    autopilotMessages,
    enrichmentDrafts,
    error,
    missing,
  } = await readResourceQualityAgentReport();

  return (
    <>
      <PageHeader
        eyebrow="本地维护 Agent"
        title="资料质量 Agent"
        description="展示 Resource Quality Agent 对前台资料的自动检查结果。v1 仅生成诊断结果，不自动修改资料。"
      />
      <AdminResourceQualityAgentReport
        report={report}
        logs={logs}
        autoFixLogs={autoFixLogs}
        loopRuns={loopRuns}
        autopilotMessages={autopilotMessages}
        enrichmentDrafts={enrichmentDrafts}
        error={error}
        missing={missing}
      />
    </>
  );
}
