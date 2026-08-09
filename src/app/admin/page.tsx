import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { AdminSimpleDashboard } from "@/components/AdminSimpleDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ArchiveScope 简易后台 | ArchiveScope",
  description: "面向非技术维护者的 ArchiveScope 简易后台。",
};

const autopilotMessagesPath = join(
  process.cwd(),
  "src/data/admin/resourceEnrichmentAutopilotMessages.json",
);
const manualUrlDraftsPath = join(
  process.cwd(),
  "src/data/drafts/us/manualUrlDrafts.json",
);
const enrichmentDraftsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const snapshotFilesPath = join(
  process.cwd(),
  "src/data/imports/us/resourceSnapshotFiles.json",
);
const qualityReportPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityAgentReport.json",
);
const institutionMessagesPath = join(
  process.cwd(),
  "src/data/admin/institutionDiscoveryMessages.json",
);

async function readJsonArray(filePath: string) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    return [];
  }
}

async function readJsonObject(filePath: string) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export default async function AdminHomePage() {
  const [
    autopilotMessages,
    manualUrlDrafts,
    enrichmentDrafts,
    snapshotFiles,
    qualityReport,
    institutionMessages,
  ] = await Promise.all([
    readJsonArray(autopilotMessagesPath),
    readJsonArray(manualUrlDraftsPath),
    readJsonArray(enrichmentDraftsPath),
    readJsonArray(snapshotFilesPath),
    readJsonObject(qualityReportPath),
    readJsonArray(institutionMessagesPath),
  ]);

  return (
    <AdminSimpleDashboard
      initialActionsEnabled={process.env.ADMIN_ACTIONS_ENABLED === "true"}
      autopilotMessages={autopilotMessages}
      manualUrlDrafts={manualUrlDrafts}
      enrichmentDrafts={enrichmentDrafts}
      snapshotFiles={snapshotFiles}
      qualityReport={qualityReport}
      institutionMessages={institutionMessages}
    />
  );
}
