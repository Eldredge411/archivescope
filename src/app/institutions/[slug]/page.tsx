import Link from "next/link";
import { notFound } from "next/navigation";
import { InstitutionKnowledgeContent } from "@/components/InstitutionKnowledgeContent";
import { institutions, resources, topics } from "@/data/mockData";
import {
  getCountryById,
  getInstitutionById,
  getInstitutionBySlug,
  getRelationsBySource,
} from "@/lib/data";
import {
  linkStatusZh,
  resourceTypeZh,
} from "@/lib/display";
import type { EntityRelation, Resource, ResourceType, Topic } from "@/types";

type InstitutionDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type RelatedResourceItem = {
  resource: Resource;
  relationLabelZh: string;
};

type TopicRelationSource = "direct" | "derived" | "mixed";

type TopicRelationStrength = "strong" | "medium" | "weak" | "direct" | "related";

const topicRelationSourceZh: Record<TopicRelationSource, string> = {
  direct: "直接关联",
  derived: "由相关资料归纳",
  mixed: "直接关联 + 资料支撑",
};

const topicRelationStrengthZh: Record<TopicRelationStrength, string> = {
  strong: "强关联",
  medium: "中关联",
  weak: "弱关联",
  direct: "直接关联",
  related: "关联",
};

const topicRelationStrengthBadge: Record<TopicRelationStrength, string> = {
  strong:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  weak: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  direct: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  related: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const topicRelationStrengthRank: Record<TopicRelationStrength, number> = {
  strong: 0,
  medium: 1,
  weak: 2,
  direct: 3,
  related: 4,
};

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function getRelationLabel(
  relations: EntityRelation[],
  targetType: EntityRelation["targetType"],
  targetId: string,
  fallback: string,
) {
  return (
    relations.find(
      (relation) =>
        relation.targetType === targetType && relation.targetId === targetId,
    )?.relationLabelZh ?? fallback
  );
}

function getTopicRelationSource(
  hasDirectRelation: boolean,
  supportingResourceCount: number,
): TopicRelationSource {
  if (hasDirectRelation && supportingResourceCount > 0) {
    return "mixed";
  }

  if (hasDirectRelation) {
    return "direct";
  }

  return "derived";
}

function getTopicRelationStrength(
  relationSource: TopicRelationSource,
  supportingResourceCount: number,
): TopicRelationStrength {
  if (relationSource === "mixed" && supportingResourceCount >= 3) {
    return "strong";
  }

  if (relationSource === "direct" && supportingResourceCount >= 1) {
    return "strong";
  }

  if (supportingResourceCount >= 3) {
    return "strong";
  }

  if (supportingResourceCount >= 2) {
    return "medium";
  }

  if (supportingResourceCount === 1) {
    return "weak";
  }

  if (relationSource === "direct") {
    return "direct";
  }

  return "related";
}

function getTopicRelationBasis(
  relationSource: TopicRelationSource,
  supportingResourceCount: number,
) {
  if (relationSource === "mixed") {
    return `直接关联，并有 ${supportingResourceCount} 条资料支撑`;
  }

  if (relationSource === "direct") {
    return "直接关联，暂无支撑资料";
  }

  return `由 ${supportingResourceCount} 条相关资料归纳`;
}

export function generateStaticParams() {
  return institutions.map((institution) => ({
    slug: institution.slug,
  }));
}

export default async function InstitutionDetailPage({
  params,
}: InstitutionDetailPageProps) {
  const { slug } = await params;
  const institution = getInstitutionBySlug(slug);

  if (!institution) {
    notFound();
  }

  const country = getCountryById(institution.countryId);
  const relations = getRelationsBySource("institution", institution.id);
  const relationResourceIds = relations
    .filter((relation) => relation.targetType === "resource")
    .map((relation) => relation.targetId);
  const directResources = resources.filter(
    (resource) => resource.institutionId === institution.id,
  );
  const relationResources = resources.filter((resource) =>
    relationResourceIds.includes(resource.id),
  );
  const relatedResources = uniqueById([...relationResources, ...directResources]);
  const relatedResourceItems: RelatedResourceItem[] = relatedResources.map(
    (resource) => ({
      resource,
      relationLabelZh: getRelationLabel(
        relations,
        "resource",
        resource.id,
        resource.institutionId === institution.id ? "来源机构" : "相关",
      ),
    }),
  );

  const resourceTypeStats = Object.entries(resourceTypeZh)
    .map(([type, label]) => ({
      type: type as ResourceType,
      label,
      count: relatedResources.filter((resource) => resource.resourceType === type)
        .length,
    }))
    .filter((item) => item.count > 0);
  const relatedResourceListItems = relatedResourceItems.map(
    ({ resource, relationLabelZh }) => ({
      id: resource.id,
      slug: resource.slug,
      titleZh: resource.titleZh,
      titleEn: resource.titleEn,
      resourceType: resource.resourceType,
      primaryTopicTitle:
        topics.find((topic) => topic.id === resource.primaryTopicId)?.titleZh ??
        "未标注专题",
      summaryZh: resource.summaryZh,
      linkStatus: resource.linkStatus,
      hasBackup: resource.hasBackup,
      relationLabelZh,
      sourceUrl: resource.sourceUrl,
    }),
  );

  const relationTopicIds = relations
    .filter((relation) => relation.targetType === "topic")
    .map((relation) => relation.targetId);
  const resourceTopicIds = relatedResources.flatMap((resource) => [
    resource.primaryTopicId,
    ...resource.topicIds,
  ]);
  const relatedTopicIds = Array.from(
    new Set([...relationTopicIds, ...resourceTopicIds]),
  );
  const relatedTopics = relatedTopicIds
    .map((topicId) => topics.find((topic) => topic.id === topicId))
    .filter((topic): topic is Topic => Boolean(topic))
    .sort((a, b) => a.sortIndex - b.sortIndex);
  const directTopicIdSet = new Set(relationTopicIds);
  const relatedTopicsForInstitution = relatedTopics
    .map((topic) => {
      const supportingResources = relatedResources.filter(
        (resource) =>
          resource.primaryTopicId === topic.id ||
          resource.topicIds.includes(topic.id),
      );
      const supportingResourceCount = supportingResources.length;
      const relationSource = getTopicRelationSource(
        directTopicIdSet.has(topic.id),
        supportingResourceCount,
      );
      const relationStrength = getTopicRelationStrength(
        relationSource,
        supportingResourceCount,
      );

      return {
        topic: {
          id: topic.id,
          slug: topic.slug,
          titleZh: topic.titleZh,
          titleEn: topic.titleEn,
          shortDescription: topic.shortDescription,
          sortIndex: topic.sortIndex,
        },
        relationSourceZh: topicRelationSourceZh[relationSource],
        relationStrengthZh: topicRelationStrengthZh[relationStrength],
        relationStrengthClassName: topicRelationStrengthBadge[relationStrength],
        relationBasis: getTopicRelationBasis(
          relationSource,
          supportingResourceCount,
        ),
        supportingResourceCount,
        representativeResources: supportingResources.slice(0, 3).map((resource) => ({
          id: resource.id,
          slug: resource.slug,
          titleZh: resource.titleZh,
          resourceType: resource.resourceType,
        })),
        relationStrength,
      };
    })
    .sort((a, b) => {
      const strengthDelta =
        topicRelationStrengthRank[a.relationStrength] -
        topicRelationStrengthRank[b.relationStrength];

      if (strengthDelta !== 0) {
        return strengthDelta;
      }

      const resourceCountDelta =
        b.supportingResourceCount - a.supportingResourceCount;

      if (resourceCountDelta !== 0) {
        return resourceCountDelta;
      }

      return a.topic.sortIndex - b.topic.sortIndex;
    });

  const relatedInstitutionRelations = relations.filter(
    (relation) => relation.targetType === "institution",
  );
  const relatedInstitutions = relatedInstitutionRelations
    .map((relation) => {
      const targetInstitution = getInstitutionById(relation.targetId);

      return targetInstitution
        ? {
            id: targetInstitution.id,
            slug: targetInstitution.slug,
            nameZh: targetInstitution.nameZh,
            nameEn: targetInstitution.nameEn,
            countryName:
              getCountryById(targetInstitution.countryId)?.nameZh ?? "未标注国家",
            institutionType: targetInstitution.institutionType,
            relationLabelZh: relation.relationLabelZh,
            descriptionZh: targetInstitution.descriptionZh,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const networkResourceNodes = relatedResourceItems.slice(0, 6).map(
    ({ resource, relationLabelZh }) => ({
      id: resource.id,
      slug: resource.slug,
      title: resource.titleZh,
      relationLabelZh,
    }),
  );
  const networkTopicNodes = relatedTopics.slice(0, 4).map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    title: topic.titleZh,
    relationLabelZh: getRelationLabel(relations, "topic", topic.id, "条目关联"),
  }));
  const networkInstitutionNodes = relatedInstitutions.slice(0, 4).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.nameZh,
    relationLabelZh: item.relationLabelZh,
  }));
  const heroStats = [
    ["相关资料", relatedResources.length],
    ["研究专题", relatedTopics.length],
    ["相关机构", relatedInstitutions.length],
  ];
  const infoItems = [
    ["缩写", institution.shortName],
    ["国家地区", country?.nameZh ?? "未标注"],
    ["机构大类", institution.institutionType],
    ["机构子类", institution.institutionSubType],
    ["机构层级", institution.institutionLevel],
    ["所在地", institution.location],
    ["最近检查", institution.lastCheckedAt || "未记录"],
    ["链接状态", linkStatusZh[institution.linkStatus]],
  ];

  return (
    <>
      <section id="institution-overview" className="institution-dossier-page">
        <div className="institution-dossier-shell">
          <nav
            aria-label="页面层级"
            className="institution-dossier-breadcrumb"
          >
            <Link href="/">首页</Link>
            <span>/</span>
            <Link href="/institutions">机构</Link>
            <span>/</span>
            <strong>{institution.nameZh}</strong>
          </nav>

          <article className="institution-dossier-cover">
            <span className="institution-dossier-cover__side-tab">
              INSTITUTION FILE
            </span>
            <div className="institution-dossier-cover__crease" />

            <div className="institution-dossier-cover__main">
              <div className="institution-dossier-cover__label">
                <span>机构档案</span>
                <strong>{institution.shortName || institution.id}</strong>
              </div>
              <h1>{institution.nameZh}</h1>
              <p className="institution-dossier-cover__en">
                {institution.nameEn}
              </p>
              <p className="institution-dossier-cover__summary">
                {institution.descriptionZh}
              </p>

              <div className="institution-dossier-cover__stats">
                {heroStats.map(([label, value]) => (
                  <div key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="institution-dossier-cover__actions">
                {institution.officialUrl ? (
                  <a
                    href={institution.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    访问官网
                  </a>
                ) : null}
                  <Link
                    href={`/resources?institution=${institution.id}`}
                  >
                    查看全部相关资料
                  </Link>
                  <Link href="/institutions">
                    返回机构导航
                  </Link>
              </div>
            </div>

            <aside className="institution-dossier-cover__paper">
              <div className="institution-dossier-paperclip" aria-hidden="true" />
              <div className="institution-dossier-paper__stamp">
                <span>ARCHIVE INDEX</span>
              </div>
              <h2>机构基本信息</h2>
              <dl>
                  {infoItems.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                  {institution.officialUrl ? (
                    <div className="institution-dossier-cover__url">
                      <dt>官网</dt>
                      <dd>
                      <a
                        href={institution.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {institution.officialUrl}
                      </a>
                      </dd>
                    </div>
                  ) : null}
              </dl>
              <div className="institution-dossier-cover__tags">
                  {institution.tags.map((tag) => (
                    <span key={tag}>
                      {tag}
                    </span>
                  ))}
              </div>
            </aside>
          </article>
        </div>
      </section>

      <InstitutionKnowledgeContent
        institutionId={institution.id}
        resources={relatedResourceListItems}
        topics={relatedTopicsForInstitution}
        relatedInstitutions={relatedInstitutions}
        resourceTypeStats={resourceTypeStats}
        network={{
          centerLabel: "中心机构",
          centerTitle: institution.nameZh,
          resources: networkResourceNodes,
          topics: networkTopicNodes,
          institutions: networkInstitutionNodes,
        }}
      />
    </>
  );
}
