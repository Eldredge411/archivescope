import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "资料维护工作台 | ArchiveScope",
  description: "ArchiveScope 本地开发阶段的资料采集、审核、完善与快照备份总览。",
};

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="本地维护工具"
        title="资料维护工作台"
        description="用于查看 ArchiveScope 当前资料采集、审核、完善和快照备份情况。"
      />
      <AdminDashboard />
    </>
  );
}
