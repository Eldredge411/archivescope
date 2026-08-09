import { notFound } from "next/navigation";
import { TopicDossierDetail } from "@/components/TopicDossierDetail";
import { topics } from "@/data/mockData";
import {
  getInstitutionById,
  getResourcesByTopic,
  getTopicBySlug,
} from "@/lib/data";
import { resourceTypeEn, resourceTypeZh } from "@/lib/display";
import type { ResourceType } from "@/types";

type TopicDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const topicResourceTypeOrder: ResourceType[] = [
  "law",
  "regulation",
  "policy",
  "strategy",
  "guidance",
  "report",
  "program",
  "system",
  "database",
  "catalog",
  "portal",
];

export function generateStaticParams() {
  return topics.map((topic) => ({
    slug: topic.slug,
  }));
}

export default async function TopicDetailPage({ params }: TopicDetailPageProps) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);

  if (!topic) {
    notFound();
  }

  const relatedResources = getResourcesByTopic(topic.id);
  const relatedInstitutionCount = new Set(
    relatedResources.map((resource) => resource.institutionId),
  ).size;
  const resourceGroups = Object.entries(resourceTypeZh)
    .map(([type, label]) => ({
      type: type as ResourceType,
      label,
      labelEn: resourceTypeEn[type as ResourceType],
      resources: relatedResources.filter(
        (resource) => resource.resourceType === type,
      ),
    }))
    .filter((group) => group.resources.length > 0)
    .sort(
      (a, b) =>
        topicResourceTypeOrder.indexOf(a.type) -
        topicResourceTypeOrder.indexOf(b.type),
    );
  const backupCount = relatedResources.filter(
    (resource) => resource.hasBackup,
  ).length;
  const topicStats = [
    {
      label: "已收录资料",
      value: relatedResources.length,
      description: "当前关联到该专题的资料总数",
    },
    {
      label: "资料类型",
      value: resourceGroups.length,
      description: "按法律、指南、战略等类型归组",
    },
    {
      label: "来源机构",
      value: relatedInstitutionCount,
      description: "涉及的机构或来源主体",
    },
    {
      label: "已有备份",
      value: backupCount,
      description: "已保存来源快照或备份记录",
    },
  ];
  const topicIndex = Math.max(
    0,
    topics.findIndex((item) => item.id === topic.id),
  );

  return (
    <TopicDossierDetail
      topic={{
        id: topic.id,
        slug: topic.slug,
        titleZh: topic.titleZh,
        titleEn: topic.titleEn,
        plainQuestion: topic.plainQuestion,
        description: topic.description,
        examples: topic.examples,
        relatedKeywords: topic.relatedKeywords,
      }}
      topicIndex={topicIndex}
      stats={topicStats}
      groups={resourceGroups.map((group) => ({
        type: group.type,
        label: group.label,
        labelEn: group.labelEn,
        resources: group.resources.map((resource) => {
          const institution = getInstitutionById(resource.institutionId);

          return {
            id: resource.id,
            slug: resource.slug,
            titleZh: resource.titleZh,
            titleEn: resource.titleEn,
            resourceType: resource.resourceType,
            resourceTypeLabel: resourceTypeZh[resource.resourceType],
            institutionName:
              institution?.shortName ?? institution?.nameZh ?? "未标注机构",
            summary: resource.summaryShort || resource.summaryZh,
            updatedDate: resource.updatedDate,
            linkStatus: resource.linkStatus,
            hasBackup: resource.hasBackup,
            sourceDomain: resource.sourceDomain,
            tags: resource.tags,
          };
        }),
      }))}
    />
  );
}
