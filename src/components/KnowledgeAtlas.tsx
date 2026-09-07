"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAtlasGraph,
  type AtlasGraphEdge,
} from "@/lib/atlas/atlasGraph";
import {
  entityRelations,
  resourceFiles,
  resourceVersions,
} from "@/data/mockData";
import { KnowledgeEvidenceDrawer } from "@/components/KnowledgeEvidenceDrawer";
import {
  getKnowledgeRole,
  knowledgeRoleZh,
  linkStatusZh,
  resourceTypeZh,
} from "@/lib/display";
import type {
  Institution,
  KnowledgeRole,
  Resource,
  ResourceType,
  Topic,
} from "@/types";

export type KnowledgeAtlasProps = {
  focusResourceId?: string;
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

type AtlasView = "topic" | "evolution" | "platform";

type AtlasPathId = "researcher" | "audience";

type AtlasPathStep = {
  title: string;
  view: AtlasView | null;
  guidance: string;
  links: { label: string; href: string }[];
  focusTopicId?: string;
};

type AtlasPath = {
  id: AtlasPathId;
  code: string;
  title: string;
  description: string;
  steps: AtlasPathStep[];
};

type KnowledgeChainItem = {
  resource: Resource;
  stageLabel: string;
  relationReason: string;
  dateLabel: string;
  institutionName: string;
};

type TopicClusterItem = {
  topic: Topic;
  roleCounts: { role: KnowledgeRole; count: number }[];
  institutionNames: string[];
  representativeResources: Resource[];
  relations: { topic: Topic; sharedResourceCount: number }[];
};

type EvolutionItem = {
  resource: Resource;
  year: string;
  dateLabel: string;
  layer: "governance" | "platform" | "practice";
  institutionName: string;
  summary: string;
  weight: number;
};

type EvolutionConnectionPosition = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

type PlatformItem = {
  resource: Resource;
  institutionName: string;
  clusterId: PlatformClusterId;
  topicNames: string[];
  linkedResourceCount: number;
  representativeResources: Resource[];
  relatedNorms: Resource[];
};

type PlatformClusterId =
  | "discovery"
  | "transfer-preservation"
  | "digital-preservation"
  | "public-participation"
  | "institutional-service";

type PlatformCluster = {
  id: PlatformClusterId;
  title: string;
  description: string;
  items: PlatformItem[];
};

const platformClusterMeta: Record<
  PlatformClusterId,
  {
    title: string;
    description: string;
  }
> = {
  discovery: {
    title: "目录与检索",
    description: "面向研究者与公众的档案发现入口",
  },
  "transfer-preservation": {
    title: "电子文件移交与保存",
    description: "联邦机构电子文件进入国家档案体系的业务通道",
  },
  "digital-preservation": {
    title: "数字保存与格式",
    description: "格式鉴定、长期保存与技术风险管理",
  },
  "public-participation": {
    title: "公众参与与开放利用",
    description: "众包标引、开放数据和公共利用服务",
  },
  "institutional-service": {
    title: "机构服务与报告",
    description: "面向机构治理和合规运行的服务工具",
  },
};

const platformResourceTypes = new Set<ResourceType>([
  "system",
  "database",
  "catalog",
  "portal",
]);

const knowledgeRoleOrder: KnowledgeRole[] = [
  "institutional_norm",
  "policy_strategy",
  "platform_system",
  "method_standard",
  "project_practice",
  "public_participation",
];

const evolutionLayerMeta = {
  governance: {
    title: "制度与政策",
    description: "法律、规则、政策与战略",
    roles: ["institutional_norm", "policy_strategy"],
  },
  platform: {
    title: "平台与标准",
    description: "目录平台、系统、数据库与标准指南",
    roles: ["platform_system", "method_standard"],
  },
  practice: {
    title: "实践与参与",
    description: "项目实践、规则落地与公众参与",
    roles: ["project_practice", "public_participation"],
  },
} as const;

const atlasPaths: Record<AtlasPathId, AtlasPath> = {
  researcher: {
    id: "researcher",
    title: "A · 研究者路径",
    code: "Research Path",
    description:
      "默认从制度演进进入，优先建立“制度依据—政策变化—平台承接—证据来源”的研究链路，帮助你回到原始资料并核对机构责任。",
  steps: [
    {
      title: "定位制度演进",
      view: "evolution" as AtlasView,
      guidance:
        "先确认关键年份、制度节点和责任机构。点击年份可以筛选节点，卡片上的链接状态用于判断后续追溯风险。",
      links: [
        { label: "追溯制度规范", href: "/resources?role=institutional_norm" },
        { label: "追溯政策战略", href: "/resources?role=policy_strategy" },
      ],
    },
    {
      title: "比较专题结构",
      view: "topic" as AtlasView,
      guidance:
        "进入专题脉络后，使用“专题结构比较”查看六类建设分类占比，并通过共同资料判断专题之间的证据关联。",
      links: [{ label: "打开专题总览", href: "/topics" }],
    },
    {
      title: "核对平台承接",
      view: "platform" as AtlasView,
      guidance:
        "在平台群落中点击平台卡片，核对所属机构、服务专题、关联资料、制度依据和快照状态。",
      links: [{ label: "查看平台系统", href: "/resources?role=platform_system" }],
    },
    {
      title: "追溯证据来源",
      view: null,
      guidance:
        "回到建设讯息库，按机构、专题、建设分类和链接状态筛选资料，完成从制度判断到原始来源的核对。",
      links: [
        { label: "打开建设讯息库", href: "/resources" },
        { label: "查看方法标准", href: "/resources?role=method_standard" },
      ],
    },
  ],
  },
  audience: {
    id: "audience",
    title: "B · 公众路径",
    code: "Public Path",
    description:
      "从故事和展览问题进入，用时间轴、专题叙事、平台案例和参与实践帮助公众理解联邦档案数据资源建设为什么重要。",
    steps: [
      {
        title: "从一个问题开始",
        view: "evolution",
        guidance:
          "先不进入法规细节，而是浏览制度演进时间轴，观察联邦档案建设如何从早期要求扩展到数字时代服务。",
        links: [{ label: "进入展览叙事", href: "/exhibit" }],
      },
      {
        title: "理解专题故事",
        view: "topic",
        focusTopicId: "access-outreach-public-participation",
        guidance:
          "选择一个和公众利用最相关的专题，阅读它的发展链路，并通过专题结构比较理解制度、平台与实践如何共同发生。",
        links: [{ label: "查看专题总览", href: "/topics" }],
      },
      {
        title: "认识服务入口",
        view: "platform",
        guidance:
          "点击平台群落中的卡片，了解哪些系统提供检索、开放数据和公共参与入口。",
        links: [{ label: "查看平台系统", href: "/resources?role=platform_system" }],
      },
      {
        title: "看见参与实践",
        view: "topic",
        focusTopicId: "access-outreach-public-participation",
        guidance:
          "回到专题脉络，关注公众参与和项目实践节点，理解开放利用不是单点功能，而是由制度和平台共同支撑的机制。",
        links: [
          { label: "查看公众参与实践", href: "/resources?role=public_participation" },
          { label: "查看项目实践", href: "/resources?role=project_practice" },
        ],
      },
      {
        title: "形成自己的判断",
        view: null,
        guidance:
          "最后回到展览页，把看到的制度变化、平台服务和公众参与串成一条面向数字人文节的解释线索。",
        links: [{ label: "回到展览", href: "/exhibit" }],
      },
    ],
  },
};

const evolutionLayerByRole: Record<
  string,
  keyof typeof evolutionLayerMeta
> = Object.fromEntries(
  Object.entries(evolutionLayerMeta).flatMap(([layer, meta]) =>
    meta.roles.map((role) => [role, layer]),
  ),
) as Record<string, keyof typeof evolutionLayerMeta>;

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
    "文件法",
    "总统文件",
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
    "电子文件",
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
  "electronic-records-management": "电子文件",
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
      return "电子文件问题浮现";
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
      resource.keyPoints[0] || "可作为继续追踪相关法规、机构职责和档案数据资源建设脉络的入口。",
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

function getTopicKnowledgeChain({
  topic,
  resources,
  institutionById,
}: {
  topic: Topic;
  resources: Resource[];
  institutionById: Map<string, Institution>;
}): KnowledgeChainItem[] {
  const topicResources = getTopicResources(resources, topic.id)
    .map((resource) => ({
      resource,
      date: resolveTimelineDate(resource),
    }))
    .sort((left, right) => left.date.sortDate.localeCompare(right.date.sortDate));

  const pickEarliest = (
    roles: KnowledgeRole[],
    afterSortDate = "",
    excludeIds = new Set<string>(),
  ) =>
    topicResources.find(
      ({ resource, date }) =>
        !excludeIds.has(resource.id) &&
        roles.includes(getKnowledgeRole(resource)) &&
        (!afterSortDate || date.sortDate >= afterSortDate),
    );

  const anchor =
    pickEarliest(["institutional_norm", "policy_strategy"]) ??
    topicResources[0];

  if (!anchor) {
    return [];
  }

  const selectedIds = new Set([anchor.resource.id]);
  const carrier =
    pickEarliest(
      ["platform_system", "method_standard"],
      anchor.date.sortDate,
      selectedIds,
    ) ?? pickEarliest(
      ["platform_system", "method_standard"],
      "",
      selectedIds,
    );

  if (carrier) {
    selectedIds.add(carrier.resource.id);
  }

  const practice =
    pickEarliest(
      ["project_practice", "public_participation"],
      carrier?.date.sortDate ?? anchor.date.sortDate,
      selectedIds,
    ) ?? pickEarliest(
      ["project_practice", "public_participation"],
      "",
      selectedIds,
    );

  const items: KnowledgeChainItem[] = [
    {
      resource: anchor.resource,
      stageLabel: "制度 / 政策起点",
      relationReason: `这是“${topic.titleZh}”中时间较早的制度或政策节点，由${getInstitutionName(
        anchor.resource,
        institutionById,
      )}发布，用于确立建设要求。`,
      dateLabel: anchor.date.label,
      institutionName: getInstitutionName(anchor.resource, institutionById),
    },
  ];

  if (carrier) {
    const sameInstitution =
      carrier.resource.institutionId === anchor.resource.institutionId;

    items.push({
      resource: carrier.resource,
      stageLabel: "平台 / 标准承接",
      relationReason: `它与上一节点同属“${topic.titleZh}”，时间在其后${
        sameInstitution ? "，且由同一机构负责" : ""
      }，显示制度要求开始转化为平台、目录或标准工具。`,
      dateLabel: carrier.date.label,
      institutionName: getInstitutionName(carrier.resource, institutionById),
    });
  }

  if (practice) {
    const previous = items.at(-1);
    const sameInstitution = previous
      ? practice.resource.institutionId === previous.resource.institutionId
      : false;

    items.push({
      resource: practice.resource,
      stageLabel: "实践 / 公众参与",
      relationReason: `它与上一节点仍属同一专题${
        sameInstitution ? "，并延续同一机构责任" : ""
      }，说明平台或标准进一步进入项目实践和公共服务场景。`,
      dateLabel: practice.date.label,
      institutionName: getInstitutionName(practice.resource, institutionById),
    });
  }

  return items;
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

function getTopicClusterItems(
  topics: Topic[],
  resources: Resource[],
  institutions: Institution[],
): TopicClusterItem[] {
  const institutionById = new Map(
    institutions.map((institution) => [institution.id, institution]),
  );

  return topics.map((topic) => {
    const topicResources = getTopicResources(resources, topic.id);
    const roleCounts = knowledgeRoleOrder
      .map((role) => ({
        role,
        count: topicResources.filter(
          (resource) => getKnowledgeRole(resource) === role,
        ).length,
      }))
      .filter((item) => item.count > 0);
    const institutionNames = Array.from(
      new Set(
        topicResources.map(
          (resource) =>
            institutionById.get(resource.institutionId)?.nameZh ?? "待补机构",
        ),
      ),
    ).slice(0, 5);
    const representativeResources = [...topicResources]
      .sort(
        (left, right) =>
          resourceTypePriority[left.resourceType] -
          resourceTypePriority[right.resourceType],
      )
      .slice(0, 5);
    const relations = topics
      .filter((otherTopic) => otherTopic.id !== topic.id)
      .map((otherTopic) => ({
        topic: otherTopic,
        sharedResourceCount: resources.filter(
          (resource) =>
            resource.topicIds.includes(topic.id) &&
            resource.topicIds.includes(otherTopic.id),
        ).length,
      }))
      .filter((relation) => relation.sharedResourceCount > 0)
      .sort(
        (left, right) =>
          right.sharedResourceCount - left.sharedResourceCount,
      )
      .slice(0, 4);

    return {
      topic,
      roleCounts,
      institutionNames,
      representativeResources,
      relations,
    };
  });
}

function isPlatformResource(resource: Resource) {
  return (
    getKnowledgeRole(resource) === "platform_system" ||
    platformResourceTypes.has(resource.resourceType)
  );
}

function getPlatformClusterId(resource: Resource): PlatformClusterId {
  const text = [
    resource.titleEn,
    resource.titleZh,
    resource.summaryShort ?? "",
    resource.summaryZh,
    ...resource.tags,
  ]
    .join(" ")
    .toLowerCase();

  if (/(citizen|crowd|participat|open data|participation)/.test(text)) {
    return "public-participation";
  }
  if (/(era|transfer|email|record.*management|federal record)/.test(text)) {
    return "transfer-preservation";
  }
  if (/(preserv|format|file format|digitiz|risk|migration)/.test(text)) {
    return "digital-preservation";
  }
  if (/(catalog|search|finding|discover|portal|archive)/.test(text)) {
    return "discovery";
  }
  if (resource.resourceType === "report") {
    return "institutional-service";
  }
  return resource.resourceType === "system" ||
    resource.resourceType === "database"
    ? "institutional-service"
    : "discovery";
}

function getPlatformClusters(
  resources: Resource[],
  institutions: Institution[],
  topics: Topic[],
): PlatformCluster[] {
  const institutionById = new Map(
    institutions.map((institution) => [institution.id, institution]),
  );
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const platformItems: PlatformItem[] = resources
    .filter(isPlatformResource)
    .map((resource) => {
      const linkedResources = resources
        .filter(
          (item) =>
            item.id !== resource.id &&
            (item.primaryTopicId === resource.primaryTopicId ||
              item.topicIds.some((topicId) =>
                resource.topicIds.includes(topicId),
              )),
        )
        .sort(
          (left, right) =>
            resourceTypePriority[left.resourceType] -
            resourceTypePriority[right.resourceType],
        );
      const representativeResources = linkedResources.slice(0, 3);
      const relatedNorms = linkedResources
        .filter((item) =>
          ["institutional_norm", "policy_strategy"].includes(
            getKnowledgeRole(item),
          ),
        )
        .slice(0, 3);

      return {
        resource,
        institutionName:
          institutionById.get(resource.institutionId)?.nameZh ?? "待补机构",
        clusterId: getPlatformClusterId(resource),
        topicNames: resource.topicIds
          .map((topicId) => topicById.get(topicId)?.titleZh)
          .filter((topicName): topicName is string => Boolean(topicName))
          .slice(0, 3),
        linkedResourceCount: linkedResources.length,
        representativeResources,
        relatedNorms,
      };
    })
    .sort(
      (left, right) =>
        platformOrder(left.resource) - platformOrder(right.resource) ||
        left.resource.titleEn.localeCompare(right.resource.titleEn),
    );

  return (Object.keys(platformClusterMeta) as PlatformClusterId[]).map((id) => ({
    id,
    ...platformClusterMeta[id],
    items: platformItems.filter((item) => item.clusterId === id),
  }));
}

function platformOrder(resource: Resource) {
  return resourceTypePriority[resource.resourceType];
}

function getEvolutionItems(
  resources: Resource[],
  institutionById: Map<string, Institution>,
) {
  const selected = new Map<string, EvolutionItem>();
  const yearCount = new Map<string, number>();
  const candidates = resources
    .map((resource) => {
      const date = resolveTimelineDate(resource);
      const layer = evolutionLayerByRole[getKnowledgeRole(resource)];

      if (!layer || date.status === "unknown") {
        return null;
      }

      return {
        resource,
        year: date.year,
        dateLabel: date.label,
        layer,
        institutionName: getInstitutionName(resource, institutionById),
        summary:
          firstReadableSentence(
            resource.summaryShort || resource.summaryZh,
            "该节点用于追踪联邦档案数据资源建设制度、平台或实践的演变。",
          ) || "该节点用于追踪联邦档案数据资源建设制度、平台或实践的演变。",
        weight:
          milestoneTypeWeight[resource.resourceType] +
          (getKnowledgeRole(resource) === "institutional_norm" ? 8 : 0),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      const yearDiff = Number(left.year) - Number(right.year);

      if (yearDiff !== 0) {
        return yearDiff;
      }

      return right.weight - left.weight;
    });

  for (const candidate of candidates) {
    const currentYearCount = yearCount.get(candidate.year) ?? 0;

    if (currentYearCount >= 3) {
      continue;
    }

    selected.set(candidate.resource.id, candidate);
    yearCount.set(candidate.year, currentYearCount + 1);
  }

  return Array.from(selected.values())
    .sort((left, right) => {
      const yearDiff = Number(left.year) - Number(right.year);

      if (yearDiff !== 0) {
        return yearDiff;
      }

      return right.weight - left.weight;
    })
    .slice(0, 48);
}

function getEvolutionYears(items: EvolutionItem[]) {
  return Array.from(new Set(items.map((item) => item.year))).sort();
}

function getTimelineVisibleEdges(
  edges: AtlasGraphEdge[],
  items: EvolutionItem[],
  showResearchLeads: boolean,
) {
  const itemIds = new Set(items.map((item) => item.resource.id));

  return edges.filter((edge) => {
    if (!itemIds.has(edge.source) || !itemIds.has(edge.target)) {
      return false;
    }

    return edge.status === "verified" || showResearchLeads;
  });
}

function getEvolutionConnectionPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const controlOffset = (targetX - sourceX) * 0.28;

  return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${
    sourceY + 4
  }, ${targetX - controlOffset} ${targetY - 4}, ${targetX} ${targetY}`;
}

function getEvolutionSummary(items: EvolutionItem[]) {
  if (items.length === 0) {
    return "";
  }

  const years = items.map((item) => Number(item.year)).filter(Number.isFinite);
  const startYear = Math.min(...years);
  const endYear = Math.max(...years);
  const governanceCount = items.filter((item) => item.layer === "governance").length;
  const platformCount = items.filter((item) => item.layer === "platform").length;
  const practiceCount = items.filter((item) => item.layer === "practice").length;

  return `美国联邦档案数据资源建设在 ${startYear}–${endYear} 间呈现“制度先行、平台承接、实践扩散”的推进结构。当前视图提取 ${governanceCount} 个制度与政策节点、${platformCount} 个平台与标准节点、${practiceCount} 个实践与参与节点，用于观察制度要求如何转化为目录平台、标准指南和公共服务。`;
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
  focusResourceId,
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
  const [activeView, setActiveView] = useState<AtlasView>("evolution");
  const [activeEvolutionYear, setActiveEvolutionYear] = useState("");
  const [activePlatformId, setActivePlatformId] = useState("");
  const [activePathId, setActivePathId] = useState<AtlasPathId>("researcher");
  const [activePathStep, setActivePathStep] = useState(1);
  const [showResearchLeads, setShowResearchLeads] = useState(false);
  const [activeEdgeId, setActiveEdgeId] = useState("");
  const [connectionViewport, setConnectionViewport] = useState({
    width: 0,
    height: 0,
  });
  const [connectionPositions, setConnectionPositions] = useState<
    Record<string, EvolutionConnectionPosition>
  >({});
  const evolutionLayersRef = useRef<HTMLDivElement | null>(null);
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
  const evolutionItems = useMemo(
    () => getEvolutionItems(resources, institutionById),
    [institutionById, resources],
  );
  const evolutionYears = useMemo(
    () => getEvolutionYears(evolutionItems),
    [evolutionItems],
  );
  const platformClusters = useMemo(
    () => getPlatformClusters(resources, institutions, topics),
    [institutions, resources, topics],
  );
  const atlasGraph = useMemo(
    () =>
      buildAtlasGraph({
        resources,
        institutions,
        resourceVersions,
        entityRelations,
      }),
    [institutions, resources],
  );
  const activeEvidenceEdge = atlasGraph.edges.find(
    (edge) => edge.id === activeEdgeId,
  );
  const visibleEvolutionItems = evolutionItems.filter(
    (item) => !activeEvolutionYear || item.year === activeEvolutionYear,
  );
  const visibleEvolutionEdges = getTimelineVisibleEdges(
    atlasGraph.edges,
    visibleEvolutionItems,
    showResearchLeads,
  );

  useEffect(() => {
    const updateConnections = () => {
      const container = evolutionLayersRef.current;

      if (!container) {
        return;
      }

      const containerRectangle = container.getBoundingClientRect();
      const positions: Record<string, EvolutionConnectionPosition> = {};

      container
        .querySelectorAll<HTMLElement>("[data-node-id]")
        .forEach((element) => {
          const nodeId = element.dataset.nodeId;

          if (!nodeId) {
            return;
          }

          const rectangle = element.getBoundingClientRect();
          positions[nodeId] = {
            sourceX: rectangle.right - containerRectangle.left,
            sourceY: rectangle.top - containerRectangle.top + 8,
            targetX: rectangle.left - containerRectangle.left,
            targetY: rectangle.top - containerRectangle.top + 8,
          };
        });

      setConnectionViewport({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      setConnectionPositions(positions);
    };

    updateConnections();
    window.addEventListener("resize", updateConnections);

    return () => window.removeEventListener("resize", updateConnections);
  }, [activeEvolutionYear, evolutionItems, showResearchLeads]);

  useEffect(() => {
    if (!focusResourceId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const focusedNode = document.querySelector<HTMLElement>(
        `[data-node-id="${CSS.escape(focusResourceId)}"]`,
      );

      focusedNode?.scrollIntoView({ behavior: "smooth", block: "center" });

      const firstVerifiedEdge = atlasGraph.edges.find(
        (edge) =>
          edge.status === "verified" &&
          (edge.source === focusResourceId || edge.target === focusResourceId),
      );

      if (firstVerifiedEdge) {
        setActiveEdgeId(firstVerifiedEdge.id);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [atlasGraph.edges, focusResourceId]);
  const activePlatform = platformClusters
    .flatMap((cluster) => cluster.items)
    .find((item) => item.resource.id === activePlatformId);
  const topicClusterItems = useMemo(
    () => getTopicClusterItems(sortedTopics, resources, institutions),
    [institutions, resources, sortedTopics],
  );
  const activeTopicCluster = topicClusterItems.find(
    (item) => item.topic.id === activeTopic?.id,
  );
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
  const researcherPathStats = useMemo(() => {
    const normCount = resources.filter((resource) =>
      ["institutional_norm", "policy_strategy"].includes(
        getKnowledgeRole(resource),
      ),
    ).length;
    const institutionCount = new Set(
      resources.map((resource) => resource.institutionId),
    ).size;
    const sourceCount = new Set(
      resources.map((resource) => resource.sourceDomain),
    ).size;
    const traceableCount = resources.filter(
      (resource) =>
        resource.sourceUrl.trim().length > 0 &&
        resource.archivedUrl !== null &&
        resource.linkStatus !== "unknown",
    ).length;

    return { normCount, institutionCount, sourceCount, traceableCount };
  }, [resources]);

  const audiencePathStats = useMemo(
    () => ({
      pathSteps: atlasPaths.audience.steps.length,
      platformCount: resources.filter(
        (resource) => getKnowledgeRole(resource) === "platform_system",
      ).length,
      publicCount: resources.filter(
        (resource) => getKnowledgeRole(resource) === "public_participation",
      ).length,
      topicCount: topics.length,
    }),
    [resources, topics],
  );
  const activeAtlasPath = atlasPaths[activePathId];
  const activeAtlasPathStep =
    activeAtlasPath.steps[activePathStep - 1] ?? activeAtlasPath.steps[0];
  const activeKnowledgeChain = activeTopic
    ? getTopicKnowledgeChain({
        topic: activeTopic,
        resources,
        institutionById,
      })
    : [];

  const selectAtlasPathStep = (pathId: AtlasPathId, stepIndex: number) => {
    const path = atlasPaths[pathId];
    const step = path.steps[stepIndex - 1];

    if (!step) {
      return;
    }

    setActivePathId(pathId);
    setActivePathStep(stepIndex);

    if (step.focusTopicId) {
      setActiveTopicId(step.focusTopicId);
    }

    if (step.view === "platform" && !activePlatform) {
      setActivePlatformId(platformClusters[0]?.items[0]?.resource.id ?? "");
    }

    if (step.view) {
      setActiveView(step.view);
    }
  };

  const switchAtlasPath = (pathId: AtlasPathId) => {
    if (pathId === activePathId) {
      return;
    }

    setActivePathId(pathId);
    setActivePathStep(1);
    selectAtlasPathStep(pathId, 1);
  };

  return (
    <main className="atlas-timeline-page">
      <section className="atlas-timeline-hero">
        <div>
          <span>Knowledge Atlas</span>
          <h1>档案数据资源建设图谱</h1>
          <p>
            从制度、平台、标准和实践四个层面观察美国联邦档案数据资源建设。你可以先看总体制度演进，再进入具体研究专题，理解制度要求如何转化为平台服务与实践机制。
          </p>
          <div className="atlas-view-switch" aria-label="图谱分析视角">
            {(
              [
                ["evolution", "制度演进"],
                ["topic", "专题脉络"],
                ["platform", "平台群落"],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                type="button"
                className={activeView === view ? "is-active" : ""}
                onClick={() => {
                  setActiveView(view);
                  const matchedStepIndex = activeAtlasPath.steps.findIndex(
                    (step) => step.view === view,
                  );
                  if (matchedStepIndex >= 0) {
                    setActivePathStep(matchedStepIndex + 1);
                  }
                  if (
                    view === "platform" &&
                    !platformClusters.some((cluster) =>
                      cluster.items.some(
                        (item) => item.resource.id === activePlatformId,
                      ),
                    )
                  ) {
                    setActivePlatformId(
                      platformClusters[0]?.items[0]?.resource.id ?? "",
                      );
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="atlas-graph-statement" aria-label="知识图谱说明">
            <div>
              <span>Knowledge Graph Statement</span>
              <p>
                本图谱回答一个问题：美国联邦档案数据资源建设，如何从一项制度要求，变成一套平台工具，再抵达利用者？实线为可核验的制度关联，虚线为系统推断的研究线索（默认隐藏）——线索不等于因果。
              </p>
            </div>
            <div className="atlas-graph-statement__legend">
              <span>
                <i aria-hidden="true" />
                verified
              </span>
              <span>
                <i aria-hidden="true" className="is-inferred" />
                inferred
              </span>
              <button
                type="button"
                aria-pressed={showResearchLeads}
                onClick={() => setShowResearchLeads((current) => !current)}
              >
                {showResearchLeads ? "隐藏研究线索" : "显示研究线索"}
              </button>
            </div>
          </section>

          <section className="atlas-research-path" aria-label="动态路径">
            <header>
              <div>
                <span>{activeAtlasPath.code}</span>
                <h2>{activeAtlasPath.title}</h2>
                <div className="atlas-research-path__switch">
                  {(Object.keys(atlasPaths) as AtlasPathId[]).map((pathId) => (
                    <button
                      key={pathId}
                      type="button"
                      className={activePathId === pathId ? "is-active" : ""}
                      onClick={() => switchAtlasPath(pathId)}
                    >
                      {atlasPaths[pathId].title}
                    </button>
                  ))}
                </div>
              </div>
              <ul>
                {activeAtlasPath.steps.map((step, index) => (
                  <li key={step.title}>
                    <button
                      type="button"
                      className={activePathStep === index + 1 ? "is-active" : ""}
                      onClick={() => selectAtlasPathStep(activePathId, index + 1)}
                    >
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>{step.title}</span>
                      <em>{step.view ? "切换视角" : "查看操作"}</em>
                    </button>
                  </li>
                ))}
              </ul>
            </header>
            <p>{activeAtlasPath.description}</p>

            <div className="atlas-research-path__current">
              <span>Current Step</span>
              <strong>{activeAtlasPathStep.title}</strong>
              <p>{activeAtlasPathStep.guidance}</p>
              <div>
                {activeAtlasPathStep.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
                {activePathStep < activeAtlasPath.steps.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      selectAtlasPathStep(activePathId, activePathStep + 1)
                    }
                  >
                    下一步
                  </button>
                ) : null}
              </div>
              <em>
                步骤 {activePathStep} / {activeAtlasPath.steps.length}
              </em>
            </div>

            <div className="atlas-research-path__chain">
              <header>
                <span>Knowledge Chain</span>
                <h3>{activeTopic ? `${activeTopic.titleZh} 的内在关联` : "知识链待补充"}</h3>
              </header>
              <p>
                这些节点被放在一起，是因为它们同属当前研究专题，并按“制度 / 政策 → 平台 / 标准 → 实践 / 参与”的建设顺序推进；机构相同则进一步说明责任连续性。这里呈现的是资料间的关联线索，不直接等同于法律因果。
              </p>
              {activeKnowledgeChain.length > 0 ? (
                <ol>
                  {activeKnowledgeChain.map((item, index) => (
                    <li key={item.resource.id}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <div>
                        <em>{item.stageLabel}</em>
                        <strong>
                          {item.resource.titleZh || item.resource.titleEn}
                        </strong>
                        <span>
                          {item.dateLabel} · {item.institutionName}
                        </span>
                        <p>{item.relationReason}</p>
                        <Link href={`/resources/${item.resource.slug}`}>
                          查看资料
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="atlas-evolution-empty">
                  当前专题尚未形成可解释的知识链。
                </div>
              )}
            </div>

            <dl>
              {activePathId === "researcher" ? (
                <>
                  <div>
                    <dt>制度与政策节点</dt>
                    <dd>{researcherPathStats.normCount}</dd>
                  </div>
                  <div>
                    <dt>责任机构</dt>
                    <dd>{researcherPathStats.institutionCount}</dd>
                  </div>
                  <div>
                    <dt>来源域名</dt>
                    <dd>{researcherPathStats.sourceCount}</dd>
                  </div>
                  <div>
                    <dt>可追溯资料</dt>
                    <dd>{researcherPathStats.traceableCount}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>引导步骤</dt>
                    <dd>{audiencePathStats.pathSteps}</dd>
                  </div>
                  <div>
                    <dt>平台入口</dt>
                    <dd>{audiencePathStats.platformCount}</dd>
                  </div>
                  <div>
                    <dt>公众参与资料</dt>
                    <dd>{audiencePathStats.publicCount}</dd>
                  </div>
                  <div>
                    <dt>可读专题</dt>
                    <dd>{audiencePathStats.topicCount}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>
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
        {activeView === "topic" ? (
          <>
            <aside className="atlas-topic-drawer" aria-label="研究问题专题">
              <div className="atlas-topic-drawer__head">
                <span>Research Questions</span>
                <h2>从研究问题进入时间线</h2>
                <p>点击一个专题后，右侧会展开该专题的关键发展链路，而不是跳到建设讯息列表。</p>
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
                      当前专题中有 {missingTopicDateCount} 条资料未在元数据中明确文件发布日期。
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

                  <section className="atlas-topic-structure">
                    <header>
                      <div>
                        <span>Structural Comparison</span>
                        <h3>专题结构比较</h3>
                      </div>
                      <p>
                        用六类建设分类比较各专题的知识构成；点击其他专题会同步切换左侧选项和右侧时间线。
                      </p>
                    </header>

                    <div className="atlas-topic-structure__matrix">
                      {topicClusterItems.map((item) => {
                        const total = item.roleCounts.reduce(
                          (sum, roleCount) => sum + roleCount.count,
                          0,
                        );

                        return (
                          <button
                            key={item.topic.id}
                            type="button"
                            className={
                              activeTopic?.id === item.topic.id ? "is-active" : ""
                            }
                            onClick={() => setActiveTopicId(item.topic.id)}
                          >
                            <strong>{item.topic.titleZh}</strong>
                            <b>{total}</b>
                            <div className="atlas-topic-structure__roles">
                              {item.roleCounts.map((roleCount) => (
                                <i
                                  key={roleCount.role}
                                  style={{
                                    width: `${
                                      (roleCount.count / Math.max(total, 1)) * 100
                                    }%`,
                                  }}
                                  data-role={roleCount.role}
                                />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {activeTopicCluster ? (
                      <div className="atlas-topic-structure__relations">
                        <h4>{activeTopicCluster.topic.titleZh} 的结构关系</h4>
                        <ul>
                          {activeTopicCluster.roleCounts.map((roleCount) => (
                            <li key={roleCount.role}>
                              <span>{knowledgeRoleZh[roleCount.role]}</span>
                              <b>{roleCount.count}</b>
                            </li>
                          ))}
                        </ul>
                        <ul>
                          {activeTopicCluster.relations.map((relation) => (
                            <li key={relation.topic.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveTopicId(relation.topic.id)
                                }
                              >
                                {relation.topic.titleZh}
                              </button>
                              <span>{relation.sharedResourceCount} 条共同资料</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>

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
                              <em className={`is-${item.dateStatus}`}>
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
          </>
        ) : activeView === "evolution" ? (
          <article className="atlas-evolution-file">
            <header className="atlas-topic-file__header">
              <div>
                <span>Institutional Evolution</span>
                <h2>制度演进时间轴</h2>
                <p>{getEvolutionSummary(evolutionItems)}</p>
              </div>
              <Link href="/resources">查看全部建设讯息</Link>
            </header>

            <div className="atlas-evolution-guide">
              <span>横向时间轴</span>
              <p>
                从左到右查看 {evolutionYears[0]}–
                {evolutionYears.at(-1)} 年的建设进程；点击年份筛选对应节点，再次点击可恢复全部节点。
              </p>
            </div>

            <div className="atlas-evolution-layers" ref={evolutionLayersRef}>
              <div className="atlas-evolution-year-track" aria-label="年份轴">
                {evolutionYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={
                      [
                        "has-node",
                        activeEvolutionYear === year ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                    aria-pressed={activeEvolutionYear === year}
                    onClick={() =>
                      setActiveEvolutionYear((current) =>
                        current === year ? "" : year,
                      )
                    }
                  >
                    {year.slice(2)}
                  </button>
                ))}
              </div>

              <div className="atlas-evolution-lanes">
                {Object.entries(evolutionLayerMeta).map(([layer, meta]) => {
                  const layerItems = evolutionItems.filter(
                    (item) =>
                      item.layer === layer &&
                      (!activeEvolutionYear || item.year === activeEvolutionYear),
                  );

                  return (
                    <section key={layer} className="atlas-evolution-layer">
                      <header>
                        <span>{meta.description}</span>
                        <h3>{meta.title}</h3>
                        <b>{layerItems.length}</b>
                      </header>

                      {layerItems.length > 0 ? (
                        <ol>
                          {layerItems.map((item) => (
                            <li key={item.resource.id}>
                              <div
                                className={`atlas-evolution-card ${
                                  focusResourceId === item.resource.id
                                    ? "is-focused"
                                    : ""
                                }`}
                                data-node-id={item.resource.id}
                              >
                                <div>
                                  <strong>{item.year}</strong>
                                  <span>{item.dateLabel}</span>
                                </div>
                                <div>
                                <em>{knowledgeRoleZh[getKnowledgeRole(item.resource)]}</em>
                                <em>{resourceTypeZh[item.resource.resourceType]}</em>
                                <em>{item.institutionName}</em>
                                <em>{linkStatusZh[item.resource.linkStatus]}</em>
                                </div>
                                <h4>{item.resource.titleZh || item.resource.titleEn}</h4>
                                <p>{item.summary}</p>
                                <Link href={`/resources/${item.resource.slug}`}>
                                  查看节点
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="atlas-evolution-empty">
                          {activeEvolutionYear
                            ? "该年份在这一层没有代表性节点。"
                            : "这一层的节点仍在补充中。"}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {connectionViewport.width > 0 ? (
                <svg
                  className={`atlas-evolution-connections ${
                    activeEdgeId ? "has-active-edge" : ""
                  }`}
                  viewBox={`0 0 ${connectionViewport.width} ${connectionViewport.height}`}
                >
                  <defs>
                    <marker
                      id="atlas-relation-arrow"
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="7"
                      refY="4"
                    >
                      <path d="M 0 1 L 7 4 L 0 7 Z" />
                    </marker>
                  </defs>
                  {visibleEvolutionEdges.flatMap((edge) => {
                    const source = connectionPositions[edge.source];
                    const target = connectionPositions[edge.target];

                    if (!source || !target) {
                      return [];
                    }

                    return [
                      <g
                        key={edge.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${edge.labelZh} ${edge.labelEn}`}
                        className={[
                          "atlas-evolution-connection",
                          edge.status === "inferred" ? "is-inferred" : "",
                          activeEdgeId === edge.id ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setActiveEdgeId(edge.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveEdgeId(edge.id);
                          }
                        }}
                      >
                        <path
                          d={getEvolutionConnectionPath(
                            source.sourceX,
                            source.sourceY,
                            target.targetX,
                            target.targetY,
                          )}
                          markerEnd="url(#atlas-relation-arrow)"
                        />
                        <text
                          x={(source.sourceX + target.targetX) / 2}
                          y={(source.sourceY + target.targetY) / 2 - 6}
                        >
                          {`${edge.labelZh} ${edge.labelEn}`}
                        </text>
                        <title>
                          {`${edge.labelZh} ${edge.labelEn} · ${edge.status}`}
                        </title>
                      </g>,
                    ];
                  })}
                </svg>
              ) : null}
            </div>

            <div className="atlas-timeline-more">
              时间轴仅呈现代表性节点，完整建设讯息可在建设资讯库中按“建设分类”筛选查看。
              <Link href="/resources?role=institutional_norm">追溯制度规范</Link>
              <Link href="/resources?role=policy_strategy">追溯政策战略</Link>
              <Link href="/resources?role=method_standard">追溯方法标准</Link>
              <Link href="/resources">查看全部建设讯息</Link>
            </div>
          </article>
        ) : (
          <article className="atlas-platform-file">
            <header className="atlas-topic-file__header">
              <div>
                <span>Platform Ecosystem</span>
                <h2>平台群落图</h2>
                <p>
                  以联邦档案数据资源建设平台为节点，观察机构、专题、制度依据与功能相邻关系如何共同构成服务体系。
                </p>
              </div>
              <Link href="/resources?role=platform_system">查看平台系统</Link>
            </header>

            <div className="atlas-evolution-guide">
              <span>Platform Clusters</span>
              <p>
                这是一版适合展览阅读的轻量群落图：平台按功能群落分组，点击卡片后在右侧查看建设机构、服务专题、关联资料、制度依据和相邻平台。
              </p>
            </div>

            <div className="atlas-platform-layout">
              <div className="atlas-platform-clusters">
                {platformClusters.map((cluster) => (
                  <section key={cluster.id} className="atlas-platform-cluster">
                    <header>
                      <span>{cluster.description}</span>
                      <h3>{cluster.title}</h3>
                      <b>{cluster.items.length}</b>
                    </header>

                    {cluster.items.length > 0 ? (
                      <ul>
                        {cluster.items.map((item) => (
                          <li key={item.resource.id}>
                            <button
                              type="button"
                              className={
                                activePlatform?.resource.id === item.resource.id
                                  ? "is-active"
                                  : ""
                              }
                              onClick={() =>
                                setActivePlatformId(item.resource.id)
                              }
                            >
                              <strong>
                                {item.resource.titleZh || item.resource.titleEn}
                              </strong>
                              <span>{item.institutionName}</span>
                              <em>{resourceTypeZh[item.resource.resourceType]}</em>
                              <em>{item.linkedResourceCount} 条关联资料</em>
                              <small>
                                {item.representativeResources
                                  .map(
                                    (resource) =>
                                      resource.titleZh || resource.titleEn,
                                  )
                                  .slice(0, 2)
                                  .join(" / ") || "代表性资料待补充"}
                              </small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="atlas-evolution-empty">
                        这个群落暂未匹配到平台节点。
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <aside className="atlas-platform-detail" aria-live="polite">
                {activePlatform ? (
                  <>
                    <header>
                      <span>Platform File</span>
                      <h3>
                        {activePlatform.resource.titleZh ||
                          activePlatform.resource.titleEn}
                      </h3>
                    </header>
                    <dl>
                      <div>
                        <dt>所属机构</dt>
                        <dd>{activePlatform.institutionName}</dd>
                      </div>
                      <div>
                        <dt>建设分类</dt>
                        <dd>
                          {
                            knowledgeRoleZh[
                              getKnowledgeRole(activePlatform.resource)
                            ]
                          }
                        </dd>
                      </div>
                      <div>
                        <dt>服务专题</dt>
                        <dd>
                          {activePlatform.topicNames.join("、") || "待补充"}
                        </dd>
                      </div>
                      <div>
                        <dt>关联资料数</dt>
                        <dd>{activePlatform.linkedResourceCount}</dd>
                      </div>
                      <div>
                        <dt>官方链接</dt>
                        <dd>
                          <a
                            href={activePlatform.resource.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {activePlatform.resource.sourceDomain}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt>快照状态</dt>
                        <dd>
                          {activePlatform.resource.archivedUrl
                            ? "已有存档快照"
                            : "暂无快照"}
                        </dd>
                      </div>
                    </dl>

                    <p>{activePlatform.resource.summaryShort ?? activePlatform.resource.summaryZh}</p>

                    <section>
                      <h4>代表性资料</h4>
                      <ul>
                        {activePlatform.representativeResources.map(
                          (resource) => (
                            <li key={resource.id}>
                              <Link href={`/resources/${resource.slug}`}>
                                {resource.titleZh || resource.titleEn}
                              </Link>
                            </li>
                          ),
                        )}
                      </ul>
                    </section>

                    <section>
                      <h4>制度依据</h4>
                      <ul>
                        {activePlatform.relatedNorms.map((resource) => (
                          <li key={resource.id}>
                            <Link href={`/resources/${resource.slug}`}>
                              {resource.titleZh || resource.titleEn}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <h4>功能相邻平台</h4>
                      <ul>
                        {platformClusters
                          .find(
                            (cluster) =>
                              cluster.id === activePlatform.clusterId,
                          )
                          ?.items.filter(
                            (item) =>
                              item.resource.id !== activePlatform.resource.id,
                          )
                          .slice(0, 4)
                          .map((item) => (
                            <li key={item.resource.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePlatformId(item.resource.id)
                                }
                              >
                                {item.resource.titleZh || item.resource.titleEn}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </section>
                  </>
                ) : (
                  <div className="atlas-evolution-empty">
                    点击一个平台卡片，查看它的建设机构、专题服务和关联制度。
                  </div>
                )}
              </aside>
            </div>
          </article>
        )}
      </section>

      {activeEvidenceEdge ? (
        <KnowledgeEvidenceDrawer
          edge={activeEvidenceEdge}
          resources={resources}
          institutions={institutions}
          resourceFiles={resourceFiles}
          resourceVersions={resourceVersions}
          onClose={() => setActiveEdgeId("")}
        />
      ) : null}
    </main>
  );
}
