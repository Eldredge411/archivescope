import type { Metadata } from "next";
import { AdminEnrichmentReview } from "@/components/AdminEnrichmentReview";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "AI 资料完善草稿审核 | ArchiveScope",
  description: "本地开发阶段使用的 ArchiveScope AI 资料完善草稿审核工具。",
};

export default function AdminEnrichmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="本地审核工具"
        title="AI 资料完善草稿审核"
        description="这里展示 AI 根据官方来源和网页内容生成的资料完善草稿。请人工审核后，再应用到正式资料库。"
      />
      <AdminEnrichmentReview />
    </>
  );
}
