"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { resourceTypeZh } from "@/lib/display";
import type { Institution, Resource, ResourceType, Topic } from "@/types";

export type KnowledgeAtlasProps = {
  topics: Topic[];
  resources: Resource[];
  institutions: Institution[];
};

type TimelineItem = {
  resource: Resource;
  year: string;
  dateLabel: string;
  institutionName: string;
  context: string;
  value: string;
};

const preferredDefaultTopicId = "access-outreach-public-participation";
const maxTimelineItems = 18;

const resourceTypePriority: Record<ResourceType, number> = {
  law: 0,
  regulation: 1,
  policy: 2,
  strategy: 3,
  guidance: 4,
  report: 5,
  system: 6,
  program: 7,
  database: 8,
  catalog: 9,
  portal: 10,
};

const topicAlias: Record<string, string> = {
  "laws-policies-governance": "制度治理",
  "electronic-records-management": "电子记录",
  "digital-resources-preservation": "数字保存",
  "access-outreach-public-participation": "数据开放与公众获取",
  "ai-emerging-technologies": "AI 与新技术",
  "social-actors-service-ecosystem": "服务生态",
};

function normalizeDate(value: string) {
  return value.trim() || "9999-12-31";
}

function getYear(value: string) {
  const match = value.match(/\d{4}/);

  return match?.[0] ?? "未注明";
}

function formatDate(value: string) {
  if (!value) {
    return "日期未记录";
  }

  return value.replace(/-/g, ".");
}

function splitSentences(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^。！？!?；;]+[。！？!?；;]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
}

function firstReadableSentence(value: string, fallback: string) {
  return splitSentences(value)[0] ?? fallback;
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

function getInstitutionName(
  resource: Resource,
  institutionById: Map<string, Institution>,
) {
  const institution = institutionById.get(resource.institutionId);

  return (
    institution?.shortName ||
    institution?.nameZh ||
    resource.sourceDomain ||
    "来源机构未记录"
  );
}

function getContextLead(resource: Resource) {
  if (resource.resourceType === "law" || resource.resourceType === "regulation") {
    return "制度背景";
  }

  if (resource.resourceType === "policy" || resource.resourceType === "strategy") {
    return "政策背景";
  }

  if (resource.resourceType === "guidance") {
    return "执行背景";
  }

  if (
    resource.resourceType === "system" ||
    resource.resourceType === "database" ||
    resource.resourceType === "catalog" ||
    resource.resourceType === "portal"
  ) {
    return "建设背景";
  }

  if (resource.resourceType === "program" || resource.resourceType === "report") {
    return "实践背景";
  }

  return "资料背景";
}

function getTimelineContext(resource: Resource, topic: Topic) {
  const summary = firstReadableSentence(
    resource.summaryShort || resource.summaryZh,
    "该条目用于补充这一专题下的关键制度、平台或实践线索。",
  );
  const topicFrame = topicAlias[topic.id] || topic.titleZh;

  return `${getContextLead(resource)}：${truncateText(summary, 118)} 这一节点可帮助理解“${topicFrame}”在当时如何被制度化、平台化或转化为具体服务。`;
}

function getTimelineValue(resource: Resource) {
  return truncateText(
    firstReadableSentence(
      resource.researchValue,
      resource.keyPoints[0] || "可作为继续追踪相关法规、机构职责和资源建设脉络的入口。",
    ),
    92,
  );
}

function getTopicResources(resources: Resource[], topicId: string) {
  return resources.filter((resource) => resource.topicIds.includes(topicId));
}

function getTimelineItems({
  topic,
  resources,
  institutionById,
}: {
  topic: Topic;
  resources: Resource[];
  institutionById: Map<string, Institution>;
}): TimelineItem[] {
  const topicResources = getTopicResources(resources, topic.id);
  const selectedResources = [...topicResources]
    .sort((left, right) => {
      const priorityDiff =
        resourceTypePriority[left.resourceType] -
        resourceTypePriority[right.resourceType];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return normalizeDate(left.publishDate).localeCompare(
        normalizeDate(right.publishDate),
      );
    })
    .slice(0, maxTimelineItems)
    .sort((left, right) =>
      normalizeDate(left.publishDate).localeCompare(normalizeDate(right.publishDate)),
    );

  return selectedResources.map((resource) => ({
    resource,
    year: getYear(resource.publishDate),
    dateLabel: formatDate(resource.publishDate),
    institutionName: getInstitutionName(resource, institutionById),
    context: getTimelineContext(resource, topic),
    value: getTimelineValue(resource),
  }));
}

function getTopicSummary(resources: Resource[], topic: Topic) {
  const topicResources = getTopicResources(resources, topic.id);
  const firstYear = topicResources
    .map((resource) => getYear(resource.publishDate))
    .filter((year) => year !== "未注明")
    .sort()[0];
  const recentYear = topicResources
    .map((resource) => getYear(resource.publishDate))
    .filter((year) => year !== "未注明")
    .sort()
    .at(-1);
  const keyTypes = Array.from(
    new Set(topicResources.map((resource) => resourceTypeZh[resource.resourceType])),
  ).slice(0, 4);

  return {
    count: topicResources.length,
    firstYear: firstYear ?? "未注明",
    recentYear: recentYear ?? "未注明",
    keyTypes,
  };
}

export function KnowledgeAtlas({
  topics,
  resources,
  institutions,
}: KnowledgeAtlasProps) {
  const sortedTopics = useMemo(
    () => [...topics].sort((left, right) => left.sortIndex - right.sortIndex),
    [topics],
  );
  const defaultTopicId =
    sortedTopics.find((topic) => topic.id === preferredDefaultTopicId)?.id ??
    sortedTopics[0]?.id ??
    "";
  const [activeTopicId, setActiveTopicId] = useState(defaultTopicId);
  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution])),
    [institutions],
  );
  const activeTopic =
    sortedTopics.find((topic) => topic.id === activeTopicId) ?? sortedTopics[0];
  const activeTopicSummary = activeTopic
    ? getTopicSummary(resources, activeTopic)
    : null;
  const timelineItems = activeTopic
    ? getTimelineItems({
        topic: activeTopic,
        resources,
        institutionById,
      })
    : [];
  const hiddenTimelineCount = activeTopicSummary
    ? Math.max(activeTopicSummary.count - timelineItems.length, 0)
    : 0;
  const totalTimelineNodes = sortedTopics.reduce(
    (total, topic) => total + getTopicResources(resources, topic.id).length,
    0,
  );

  return (
    <main className="atlas-timeline-page">
      <section className="atlas-timeline-hero">
        <div>
          <span>Knowledge Atlas</span>
          <h1>专题时间轴</h1>
          <p>
            这里不再把资料堆成抽象节点，而是围绕研究问题，把每个专题下的关键法律、政策、指南、项目和平台按时间顺序串起来。
          </p>
        </div>
        <div className="atlas-timeline-hero__stats" aria-label="知识图谱统计">
          <article>
            <strong>{sortedTopics.length}</strong>
            <span>研究专题</span>
          </article>
          <article>
            <strong>{totalTimelineNodes}</strong>
            <span>专题节点</span>
          </article>
          <article>
            <strong>{resources.length}</strong>
            <span>资料条目</span>
          </article>
        </div>
      </section>

      <section className="atlas-timeline-shell">
        <aside className="atlas-topic-drawer" aria-label="研究问题专题">
          <div className="atlas-topic-drawer__head">
            <span>Research Questions</span>
            <h2>从研究问题进入时间线</h2>
            <p>点击一个专题，不会跳走，而是在右侧展开该专题的资料脉络。</p>
          </div>

          <div className="atlas-topic-list">
            {sortedTopics.map((topic, index) => {
              const summary = getTopicSummary(resources, topic);
              const active = topic.id === activeTopic?.id;

              return (
                <button
                  key={topic.id}
                  type="button"
                  className={active ? "is-active" : ""}
                  onClick={() => setActiveTopicId(topic.id)}
                >
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <span>{topicAlias[topic.id] || topic.titleZh}</span>
                  <b>{summary.count}</b>
                  <em>{topic.plainQuestion}</em>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="atlas-topic-file">
          {activeTopic && activeTopicSummary ? (
            <>
              <header className="atlas-topic-file__header">
                <div>
                  <span>Topic File</span>
                  <h2>{activeTopic.titleZh}</h2>
                  <p>{activeTopic.plainQuestion}</p>
                </div>
                <Link href={`/topics/${activeTopic.slug}`}>打开专题页</Link>
              </header>

              <div className="atlas-topic-file__brief">
                <p>{activeTopic.description}</p>
                <dl>
                  <div>
                    <dt>资料数</dt>
                    <dd>{activeTopicSummary.count}</dd>
                  </div>
                  <div>
                    <dt>起点</dt>
                    <dd>{activeTopicSummary.firstYear}</dd>
                  </div>
                  <div>
                    <dt>最近</dt>
                    <dd>{activeTopicSummary.recentYear}</dd>
                  </div>
                </dl>
              </div>

              <div className="atlas-topic-keywords">
                {(activeTopicSummary.keyTypes.length > 0
                  ? activeTopicSummary.keyTypes
                  : activeTopic.relatedKeywords
                )
                  .slice(0, 6)
                  .map((item) => (
                    <span key={item}>{item}</span>
                  ))}
              </div>

              <section className="atlas-timeline-board">
                <div className="atlas-timeline-board__head">
                  <div>
                    <span>Chronology</span>
                    <h3>关键资料时间轴</h3>
                  </div>
                  <p>
                    按时间顺序展示代表性节点，优先选择制度文件、政策指南和重要平台项目。
                  </p>
                </div>

                {timelineItems.length > 0 ? (
                  <ol className="atlas-timeline-list">
                    {timelineItems.map((item) => (
                      <li key={item.resource.id}>
                        <div className="atlas-timeline-list__date">
                          <strong>{item.year}</strong>
                          <span>{item.dateLabel}</span>
                        </div>
                        <div className="atlas-timeline-list__card">
                          <div className="atlas-timeline-list__meta">
                            <span>{resourceTypeZh[item.resource.resourceType]}</span>
                            <span>{item.institutionName}</span>
                            <span>{item.resource.sourceDomain}</span>
                          </div>
                          <h4>{item.resource.titleZh || item.resource.titleEn}</h4>
                          <p>{item.context}</p>
                          <small>{item.value}</small>
                          <Link href={`/resources/${item.resource.slug}`}>
                            查看资料详情
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="atlas-timeline-empty">
                    <h3>该专题时间线仍在整理中</h3>
                    <p>当前专题已有定义，但暂未匹配到可展示的资料节点。</p>
                  </div>
                )}

                {hiddenTimelineCount > 0 ? (
                  <div className="atlas-timeline-more">
                    还有 {hiddenTimelineCount} 条资料没有放入代表时间轴，可进入专题页继续查看。
                    <Link href={`/topics/${activeTopic.slug}`}>查看全部专题资料</Link>
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <div className="atlas-timeline-empty">
              <h2>专题数据正在整理中</h2>
              <p>当前还没有可以展示的专题。</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
