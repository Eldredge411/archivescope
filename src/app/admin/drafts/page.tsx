import type { Metadata } from "next";
import { AdminDraftReview } from "@/components/AdminDraftReview";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "资料采集草稿审核 | ArchiveScope",
  description: "本地开发阶段使用的 ArchiveScope 资料采集草稿审核工具。",
};

export default function AdminDraftsPage() {
  return (
    <>
      <PageHeader
        eyebrow="本地审核工具"
        title="资料采集草稿审核"
        description="这里展示通过 API 或其他采集方式发现的候选资料。请人工审核后，再决定是否发布到 ArchiveScope 资料库。"
      />
      <AdminDraftReview />
    </>
  );
}
