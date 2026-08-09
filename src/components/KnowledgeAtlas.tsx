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
  sortDate: string;
  dateLabel: string;
  dateStatus: "recorded" | "inferred" | "unknown";
  institutionName: string;
  phase: string;
  context: string;
  value: string;
  milestoneReason: string;
  score: number;
};

const preferredDefaultTopicId = "access-outreach-public-participation";
const maxTimelineItems = 12;

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

const milestoneTypeWeight: Record<ResourceType, number> = {
  law: 100,
  regulation: 94,
  policy: 88,
  strategy: 86,
  guidance: 80,
  system: 74,
  database: 72,
  catalog: 72,
  program: 68,
  report: 62,
  portal: 42,
};

const topicMilestoneTerms: Record<string, string[]> = {
  "laws-policies-governance": [
    "act",
    "law",
    "code",
    "cfr",
    "privacy",
    "foia",
    "presidential records",
    "federal records",
    "regulation",
    "rule",
    "omb",
    "directive",
    "policy",
    "法律",
    "法规",
    "记录法",
    "总统记录",
    "信息自由",
    "隐私",
    "制度",
  ],
  "electronic-records-management": [
    "electronic records",
    "email",
    "records management",
    "era",
    "transfer",
    "scheduling",
    "disposition",
    "digitization",
    "m-19-21",
    "m-23-07",
    "电子记录",
    "电子文件",
    "电子邮件",
    "移交",
    "处置",
    "保存期限",
    "全电子化",
  ],
  "digital-resources-preservation": [
    "digital preservation",
    "catalog",
    "metadata",
    "digitization",
    "archives catalog",
    "long-term",
    "preservation",
    "format",
    "数字保存",
    "长期保存",
    "数字化",
    "元数据",
    "目录",
    "平台",
    "馆藏",
  ],
  "access-outreach-public-participation": [
    "access",
    "public",
    "foia",
    "citizen archivist",
    "exhibit",
    "education",
    "research",
    "catalog",
    "transcription",
    "开放",
    "公众",
    "利用",
    "查档",
    "教育",
    "展览",
    "众包",
    "公民档案员",
  ],
  "ai-emerging-technologies": [
    "ai",
    "artificial intelligence",
    "ocr",
    "htr",
    "api",
    "data",
    "automation",
    "machine learning",
    "人工智能",
    "ai",
    "ocr",
    "自动",
    "语义",
    "知识图谱",
    "接口",
    "数据",
  ],
  "social-actors-service-ecosystem": [
    "association",
    "university",
    "library",
    "community",
    "partner",
    "grant",
    "nhprc",
    "saa",
    "专业协会",
    "高校",
    "图书馆",
    "社区",
    "合作",
    "资助",
    "服务",
  ],
};

const lowSignalTerms = [
  "appointment",
  "personnel",
  "generic clearance",
  "information collection",
  "comment request",
  "meeting notice",
  "solicitation of nominations",
  "administrative correction",
  "records schedules administrative",
  "calendar",
  "event calendar",
  "人员任免",
  "信息收集",
  "征求意见",
  "会议通知",
  "行政更正",
  "活动日历",
];

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

function getSearchBlob(resource: Resource) {
  return [
    resource.id,
    resource.slug,
    resource.titleZh,
    resource.titleEn,
    resource.summaryShort ?? "",
    resource.summaryZh,
    resource.researchValue,
    resource.versionNote ?? "",
    resource.sourceDomain,
    ...resource.tags,
    ...resource.keyPoints,
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();

  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function extractYearFromText(value: string) {
  const years = value.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  const plausibleYears = years
    .map((year) => Number.parseInt(year, 10))
    .filter((year) => year >= 1930 && year <= 2035)
    .sort((left, right) => left - right);

  return plausibleYears[0] ? String(plausibleYears[0]) : "";
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

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}"'“”‘’.,，。:：;；/\\|_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function resolveTimelineDate(resource: Resource) {
  const publishDate = resource.publishDate.trim();

  if (publishDate) {
    return {
      year: getYear(publishDate),
      sortDate: normalizeDate(publishDate),
      label: formatDate(publishDate),
      status: "recorded" as const,
    };
  }

  const inferredYear = extractYearFromText(
    [
      resource.titleZh,
      resource.titleEn,
      resource.summaryShort ?? "",
      resource.summaryZh,
      resource.versionNote ?? "",
      ...resource.tags,
    ].join(" "),
  );

  if (inferredYear) {
    return {
      year: inferredYear,
      sortDate: `${inferredYear}-12-31`,
      label: `${inferredYear}（由标题/内容推断）`,
      status: "inferred" as const,
    };
  }

  return {
    year: "待考证",
    sortDate: "9999-12-31",
    label: "原资料未注明日期",
    status: "unknown" as const,
  };
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

function getTimelinePhase(topic: Topic, year: string) {
  const numericYear = Number.parseInt(year, 10);

  if (!Number.isFinite(numericYear)) {
    return "日期待考证";
  }

  if (topic.id === "laws-policies-governance") {
    if (numericYear < 1980) {
      return "制度奠基";
    }

    if (numericYear < 2000) {
      return "权责与公开边界扩展";
    }

    if (numericYear < 2020) {
      return "法规细化与合规治理";
    }

    return "治理更新";
  }

  if (topic.id === "electronic-records-management") {
    if (numericYear < 2000) {
      return "电子记录问题浮现";
    }

    if (numericYear < 2010) {
      return "电子化管理转型";
    }

    if (numericYear < 2020) {
      return "移交与合规机制成型";
    }

    return "全电子化与持续治理";
  }

  if (topic.id === "digital-resources-preservation") {
    if (numericYear < 2000) {
      return "数字化起步";
    }

    if (numericYear < 2010) {
      return "平台与保存体系搭建";
    }

    if (numericYear < 2020) {
      return "目录平台与元数据成熟";
    }

    return "长期保存能力升级";
  }

  if (topic.id === "access-outreach-public-participation") {
    if (numericYear < 1980) {
      return "公共获取权利确立";
    }

    if (numericYear < 2000) {
      return "开放规则扩展";
    }

    if (numericYear < 2015) {
      return "在线服务与公众入口形成";
    }

    return "众包、教育与公共参与深化";
  }

  if (topic.id === "ai-emerging-technologies") {
    if (numericYear < 2010) {
      return "数字技术基础";
    }

    if (numericYear < 2020) {
      return "自动化与开放接口探索";
    }

    return "AI 与智能检索实践";
  }

  if (topic.id === "social-actors-service-ecosystem") {
    if (numericYear < 1980) {
      return "专业组织与制度基础";
    }

    if (numericYear < 2000) {
      return "社会服务网络扩展";
    }

    if (numericYear < 2015) {
      return "合作项目与资源服务";
    }

    return "多元主体协作";
  }

  if (numericYear < 2000) {
    return "基础形成";
  }

  if (numericYear < 2020) {
    return "制度与平台发展";
  }

  return "持续更新";
}

function getTimelineContext(resource: Resource, topic: Topic) {
  const summary = firstReadableSentence(
    resource.summaryShort || resource.summaryZh,
    "该条目用于补充这一专题下的关键制度、平台或实践线索。",
  );
  const topicFrame = topicAlias[topic.id] || topic.titleZh;

  return `${getContextLead(resource)}：${truncateText(summary, 128)} 这一节点可帮助理解“${topicFrame}”如何从制度要求、管理规则或服务平台逐步转化为可操作的实践。`;
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

function getMilestoneReason(resource: Resource) {
  if (resource.resourceType === "law" || resource.resourceType === "regulation") {
    return "作为制度性文件，它为后续政策、指南和平台建设提供法律或规则依据。";
  }

  if (resource.resourceType === "policy" || resource.resourceType === "strategy") {
    return "它标志着治理目标和建设方向发生阶段性调整，适合作为观察政策转向的节点。";
  }

  if (resource.resourceType === "guidance") {
    return "它把制度要求转化为机构可执行的操作规范，连接法律原则与日常管理实践。";
  }

  if (
    resource.resourceType === "system" ||
    resource.resourceType === "database" ||
    resource.resourceType === "catalog" ||
    resource.resourceType === "portal"
  ) {
    return "它说明该专题已从制度设计进入平台化、数据化或公共服务化阶段。";
  }

  if (resource.resourceType === "program") {
    return "它体现了机构将政策目标落实为项目、协作或公众服务的具体路径。";
  }

  return "它补充了这一阶段的实践证据，可帮助理解专题发展的背景和影响。";
}

function getMilestoneScore(resource: Resource, topic: Topic) {
  const blob = getSearchBlob(resource);
  const topicTerms = topicMilestoneTerms[topic.id] ?? topic.relatedKeywords;
  const matchedTopicTerms = topicTerms.filter((term) =>
    blob.includes(term.toLowerCase()),
  ).length;
  const date = resolveTimelineDate(resource);
  const lowSignalPenalty = includesAny(blob, lowSignalTerms) ? 95 : 0;
  const versionBonus = resource.hasVersions || resource.versioningApplicable ? 12 : 0;
  const narrativeBonus =
    resource.summaryZh.length > 80 && resource.researchValue.length > 30 ? 10 : 0;
  const titleBonus =
    includesAny(blob, ["act", "strategy", "guidance", "policy", "catalog", "system"])
      ? 8
      : 0;
  const dateBonus =
    date.status === "recorded" ? 18 : date.status === "inferred" ? 8 : -22;

  return (
    milestoneTypeWeight[resource.resourceType] +
    Math.min(matchedTopicTerms * 8, 48) +
    versionBonus +
    narrativeBonus +
    titleBonus +
    dateBonus -
    lowSignalPenalty
  );
}

function isSimilarMilestone(left: Resource, right: Resource) {
  const leftKey = normalizeText(`${left.titleZh} ${left.titleEn}`)
    .split(" ")
    .filter((token) => token.length > 2);
  const rightText = normalizeText(`${right.titleZh} ${right.titleEn}`);

  if (left.institutionId === right.institutionId && left.sourceUrl === right.sourceUrl) {
    return true;
  }

  return leftKey.length > 0 && leftKey.filter((token) => rightText.includes(token)).length >= 5;
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
  const candidates = topicResources
    .map((resource) => {
      const date = resolveTimelineDate(resource);
      const score = getMilestoneScore(resource, topic);

      return {
        resource,
        date,
        phase: getTimelinePhase(topic, date.year),
        score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.date.sortDate.localeCompare(right.date.sortDate);
    });

  const selected = new Map<string, (typeof candidates)[number]>();
  const phaseCounts = new Map<string, number>();

  for (const candidate of candidates) {
    if (candidate.score < 55 || candidate.date.status === "unknown") {
      continue;
    }

    if (!phaseCounts.has(candidate.phase)) {
      selected.set(candidate.resource.id, candidate);
      phaseCounts.set(candidate.phase, 1);
    }
  }

  for (const candidate of candidates) {
    if (selected.size >= maxTimelineItems) {
      break;
    }

    if (selected.has(candidate.resource.id) || candidate.score < 42) {
      continue;
    }

    const currentPhaseCount = phaseCounts.get(candidate.phase) ?? 0;

    if (currentPhaseCount >= 3) {
      continue;
    }

    const duplicate = Array.from(selected.values()).some((item) =>
      isSimilarMilestone(item.resource, candidate.resource),
    );

    if (duplicate) {
      continue;
    }

    selected.set(candidate.resource.id, candidate);
    phaseCounts.set(candidate.phase, currentPhaseCount + 1);
  }

  if (selected.size < 4) {
    for (const candidate of candidates) {
      if (selected.size >= Math.min(maxTimelineItems, 6)) {
        break;
      }

      if (!selected.has(candidate.resource.id) && candidate.score >= 30) {
        selected.set(candidate.resource.id, candidate);
      }
    }
  }

  return Array.from(selected.values())
    .sort((left, right) => {
      const dateDiff = left.date.sortDate.localeCompare(right.date.sortDate);

      if (dateDiff !== 0) {
        return dateDiff;
      }

      return (
        resourceTypePriority[left.resource.resourceType] -
        resourceTypePriority[right.resource.resourceType]
      );
    })
    .map(({ resource, date, phase, score }) => ({
      resource,
      year: date.year,
      sortDate: date.sortDate,
      dateLabel: date.label,
      dateStatus: date.status,
      institutionName: getInstitutionName(resource, institutionById),
      phase,
      context: getTimelineContext(resource, topic),
      value: getTimelineValue(resource),
      milestoneReason: getMilestoneReason(resource),
      score,
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

function getDevelopmentSummary(topic: Topic, timelineItems: TimelineItem[]) {
  if (timelineItems.length === 0) {
    return "该专题的关键节点仍在整理中，后续会优先补充能解释发展脉络的法律、政策、项目和平台资料。";
  }

  const first = timelineItems[0];
  const recent = timelineItems.at(-1) ?? first;
  const phases = Array.from(new Set(timelineItems.map((item) => item.phase))).slice(
    0,
    4,
  );
  const firstTitle = first.resource.titleZh || first.resource.titleEn;
  const recentTitle = recent.resource.titleZh || recent.resource.titleEn;
  const phaseText = phases.length > 1 ? `，中间经历了${phases.join("、")}` : "";

  return `这条时间线不是全量资料列表，而是从“${firstTitle}”等早期节点出发${phaseText}，一直延伸到“${recentTitle}”所代表的近年实践。它用于帮助用户理解“${topicAlias[topic.id] || topic.titleZh}”如何逐步形成制度、工具和服务体系。`;
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
  const activeTopicResources = activeTopic
    ? getTopicResources(resources, activeTopic.id)
    : [];
  const missingTopicDateCount = activeTopicResources.filter(
    (resource) => !resource.publishDate.trim(),
  ).length;
  const inferredTimelineDateCount = timelineItems.filter(
    (item) => item.dateStatus === "inferred",
  ).length;
  const hiddenTimelineCount = activeTopicSummary
    ? Math.max(activeTopicSummary.count - timelineItems.length, 0)
    : 0;
  const developmentSummary = activeTopic
    ? getDevelopmentSummary(activeTopic, timelineItems)
    : "";
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
            这里围绕研究问题提取关键节点，把制度文件、政策指南、项目平台和公共服务按照发展阶段串联起来，帮助用户读懂一个专题如何演变。
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
            <p>点击一个专题后，右侧会展开该专题的关键发展链路，而不是跳到资料库列表。</p>
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

              {missingTopicDateCount > 0 || inferredTimelineDateCount > 0 ? (
                <div className="atlas-timeline-date-note">
                  当前专题中有 {missingTopicDateCount} 条资料未在元数据中明确记录发布日期。
                  时间轴优先使用官方发布日期；必要时会根据标题、简介或版本说明中的年份推断，并在节点上标注“推断日期”。尚无可靠日期线索的资料暂不作为关键发展节点展示，可在专题页继续查看。
                </div>
              ) : null}

              <div className="atlas-topic-file__brief">
                <div>
                  <p>{activeTopic.description}</p>
                  <p className="atlas-topic-file__narrative">
                    {developmentSummary}
                  </p>
                </div>
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
                    <h3>关键发展节点</h3>
                  </div>
                  <p>
                    按阶段筛选代表性资料，优先呈现能解释制度变化、技术转向、平台建设和公共服务演进的节点。
                  </p>
                </div>

                {timelineItems.length > 0 ? (
                  <ol className="atlas-timeline-list">
                    {timelineItems.map((item) => (
                      <li key={item.resource.id}>
                        <div className="atlas-timeline-list__date">
                          <strong>{item.year}</strong>
                          <span>{item.dateLabel}</span>
                          <em
                            className={`is-${item.dateStatus}`}
                          >
                            {item.dateStatus === "recorded"
                              ? "资料日期"
                              : item.dateStatus === "inferred"
                                ? "推断日期"
                                : "待补日期"}
                          </em>
                        </div>
                        <div className="atlas-timeline-list__card">
                          <strong className="atlas-timeline-list__phase">
                            {item.phase}
                          </strong>
                          <div className="atlas-timeline-list__meta">
                            <span>{resourceTypeZh[item.resource.resourceType]}</span>
                            <span>{item.institutionName}</span>
                            <span>{item.resource.sourceDomain}</span>
                          </div>
                          <h4>{item.resource.titleZh || item.resource.titleEn}</h4>
                          <p>{item.context}</p>
                          <p className="atlas-timeline-list__reason">
                            {item.milestoneReason}
                          </p>
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
                    另有 {hiddenTimelineCount} 条专题资料作为补充背景保存，未全部放入关键发展链路。
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
