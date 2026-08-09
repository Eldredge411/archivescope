import type { Metadata } from "next";
import { AdminConsole } from "@/components/AdminConsole";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "管理员操作台 | ArchiveScope",
  description:
    "ArchiveScope 本地开发阶段用于执行资料采集、导出、AI 完善和来源快照任务的管理员操作台。",
};

export default function AdminConsolePage() {
  return (
    <>
      <PageHeader
        eyebrow="本地维护工具"
        title="管理员操作台"
        description="用于在本地开发阶段通过按钮执行 ArchiveScope 的资料采集、导出、AI 完善和来源快照任务。"
      />
      <AdminConsole
        initialActionsEnabled={process.env.ADMIN_ACTIONS_ENABLED === "true"}
      />
    </>
  );
}
