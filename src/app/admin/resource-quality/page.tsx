import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { AdminResourceQualityReview } from "@/components/AdminResourceQualityReview";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "资料质量审计 | ArchiveScope",
  description: "查看当前资料库完整度、疑似无关条目、缺失字段和快照覆盖情况。",
};

const reportPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityReport.json",
);

async function readResourceQualityReport() {
  try {
    const fileContent = await readFile(reportPath, "utf8");

    return {
      report: JSON.parse(fileContent) as Record<string, unknown>,
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
        report: null,
        error: "",
        missing: true,
      };
    }

    return {
      report: null,
      error: error instanceof Error ? error.message : String(error),
      missing: false,
    };
  }
}

export default async function AdminResourceQualityPage() {
  const { report, error, missing } = await readResourceQualityReport();

  return (
    <>
      <PageHeader
        eyebrow="本地维护工具"
        title="资料质量审计"
        description="用于查看当前资料库中资料完整度、疑似无关条目、缺失字段和快照覆盖情况。"
      />
      <AdminResourceQualityReview
        report={report}
        error={error}
        missing={missing}
      />
    </>
  );
}
