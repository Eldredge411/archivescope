import type {
  CopyrightStatus,
  CountryStatus,
  KnowledgeRole,
  LinkStatus,
  ResourceFileType,
  ResourceStatus,
  ResourceType,
  ResourceVersionStatus,
  Visibility,
} from "@/types";

export const countryStatusZh: Record<CountryStatus, string> = {
  active: "已上线",
  coming_soon: "即将上线",
  planned: "规划中",
};

export const countryStatusBadge: Record<CountryStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  coming_soon:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  planned: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export const resourceTypeZh: Record<ResourceType, string> = {
  law: "法律法规",
  regulation: "规章",
  policy: "政策",
  strategy: "战略",
  guidance: "指南",
  portal: "资源门户",
  catalog: "目录",
  database: "数据库",
  program: "项目计划",
  system: "系统",
  report: "报告",
};

export const resourceTypeEn: Record<ResourceType, string> = {
  law: "Laws and Regulations",
  regulation: "Regulations",
  policy: "Policies",
  strategy: "Strategies",
  guidance: "Guidance",
  portal: "Resource Portals",
  catalog: "Catalogs",
  database: "Databases",
  program: "Programs",
  system: "Systems",
  report: "Reports",
};

export const knowledgeRoleZh: Record<KnowledgeRole, string> = {
  institutional_norm: "制度规范",
  policy_strategy: "政策战略",
  platform_system: "平台系统",
  method_standard: "方法标准",
  project_practice: "项目实践",
  public_participation: "公众参与",
};

export function normalizeResourceType(type?: string | null): ResourceType {
  if (type && Object.prototype.hasOwnProperty.call(resourceTypeZh, type)) {
    return type as ResourceType;
  }

  return "strategy";
}

export function getResourceTypeLabel(type?: string | null) {
  return resourceTypeZh[normalizeResourceType(type)];
}

export function getKnowledgeRole(resource: {
  resourceType?: ResourceType | string | null;
  knowledgeRole?: string | null;
  topicIds?: string[];
  titleZh?: string;
  titleEn?: string;
  summaryShort?: string;
  summaryZh?: string;
  tags?: string[];
}): KnowledgeRole {
  if (
    resource.knowledgeRole &&
    Object.prototype.hasOwnProperty.call(
      knowledgeRoleZh,
      resource.knowledgeRole,
    )
  ) {
    return resource.knowledgeRole as KnowledgeRole;
  }

  switch (resource.resourceType) {
    case "law":
    case "regulation":
      return "institutional_norm";
    case "policy":
    case "strategy":
      return getParticipationOrPolicyRole(resource);
    case "portal":
    case "catalog":
    case "database":
    case "system":
      return "platform_system";
    case "guidance":
      return "method_standard";
    case "program":
    case "report":
      return getParticipationOrPracticeRole(resource);
    default:
      return "project_practice";
  }
}

type ParticipationText = {
  titleZh?: string;
  titleEn?: string;
  summaryShort?: string;
  summaryZh?: string;
  tags?: string[];
};

function matchesParticipationKeywords(resource: ParticipationText) {
  const text = [
    resource.titleZh,
    resource.titleEn,
    resource.summaryShort,
    resource.summaryZh,
    ...(resource.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    "advisory committee",
    "committee",
    "meeting",
    "nomination",
    "comment",
    "public meeting",
    "open meeting",
    "solicitation",
    "听证",
    "咨询委员会",
    "会议",
    "提名",
    "公开征集",
    "公众参与",
  ].some((keyword) => text.includes(keyword));
}

function getParticipationOrPolicyRole(
  resource: ParticipationText & { topicIds?: string[] },
) {
  return resource.topicIds?.includes("access-outreach-public-participation") &&
    matchesParticipationKeywords(resource)
    ? "public_participation"
    : "policy_strategy";
}

function getParticipationOrPracticeRole(
  resource: ParticipationText & { topicIds?: string[] },
) {
  return resource.topicIds?.includes("access-outreach-public-participation") &&
    matchesParticipationKeywords(resource)
    ? "public_participation"
    : "project_practice";
}

export type ResourceStatusMeta = {
  status: ResourceStatus;
  label: string;
  description: string;
  className: string;
  showBadge: boolean;
};

const resourceStatusMeta: Record<ResourceStatus, ResourceStatusMeta> = {
  imported_draft: {
    status: "imported_draft",
    label: "自动导入",
    description: "由采集流程导入，尚未整理。",
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    showBadge: true,
  },
  draft: {
    status: "draft",
    label: "自动导入",
    description: "兼容旧数据，也按自动导入处理。",
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    showBadge: true,
  },
  published_draft: {
    status: "published_draft",
    label: "待完善",
    description: "已补充部分中文内容，但仍待人工复核或补充。",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    showBadge: true,
  },
  reviewed: {
    status: "reviewed",
    label: "已校对",
    description: "已经人工校对，但不一定最终发布。",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    showBadge: true,
  },
  published: {
    status: "published",
    label: "已发布",
    description: "已经作为正式资料展示。",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300",
    showBadge: false,
  },
  needs_review: {
    status: "needs_review",
    label: "需复核",
    description: "该资料需要进一步检查。",
    className:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    showBadge: true,
  },
  archived: {
    status: "archived",
    label: "已归档",
    description: "资料保留但不作为重点展示。",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    showBadge: true,
  },
};

const publicResourceStatusMeta: Record<ResourceStatus, ResourceStatusMeta> = {
  imported_draft: {
    status: "imported_draft",
    label: "资料整理中",
    description: "该资料已收录，中文说明和结构化信息仍在整理中。",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    showBadge: true,
  },
  draft: {
    status: "draft",
    label: "资料整理中",
    description: "该资料已收录，中文说明和结构化信息仍在整理中。",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    showBadge: true,
  },
  published_draft: {
    status: "published_draft",
    label: "AI 辅助整理",
    description:
      "该资料已由 AI 基于官方来源生成中文摘要和要点，后续仍可能由管理员继续校对完善。",
    className:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    showBadge: true,
  },
  reviewed: {
    status: "reviewed",
    label: "已人工复核",
    description: "该条目已由管理员人工检查或修改。",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    showBadge: true,
  },
  published: {
    status: "published",
    label: "正式条目",
    description: "该资料已作为正式条目展示。",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    showBadge: false,
  },
  needs_review: {
    status: "needs_review",
    label: "需复核",
    description: "该资料需要进一步检查。",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    showBadge: true,
  },
  archived: {
    status: "archived",
    label: "已归档",
    description: "资料保留但不作为重点展示。",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    showBadge: true,
  },
};

export function normalizeResourceStatus(status?: string | null): ResourceStatus {
  if (
    status === "imported_draft" ||
    status === "draft" ||
    status === "published_draft" ||
    status === "reviewed" ||
    status === "published" ||
    status === "needs_review" ||
    status === "archived"
  ) {
    return status;
  }

  return "published";
}

export function getResourceStatusMeta(status?: string | null) {
  return resourceStatusMeta[normalizeResourceStatus(status)];
}

export function getPublicResourceStatusMeta(status?: string | null) {
  return publicResourceStatusMeta[normalizeResourceStatus(status)];
}

export const linkStatusZh: Record<LinkStatus, string> = {
  ok: "链接正常",
  redirect: "链接跳转",
  broken: "链接失效",
  unknown: "未知",
};

export const linkStatusBadge: Record<LinkStatus, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  redirect: "text-amber-600 dark:text-amber-400",
  broken: "text-rose-600 dark:text-rose-400",
  unknown: "text-zinc-500 dark:text-zinc-400",
};

export function normalizeLinkStatus(status?: string | null): LinkStatus {
  if (
    status === "ok" ||
    status === "redirect" ||
    status === "broken" ||
    status === "unknown"
  ) {
    return status;
  }

  return "unknown";
}

export const visibilityZh: Record<Visibility, string> = {
  public: "公开",
  restricted: "受限",
  private: "内部",
};

export function normalizeVisibility(visibility?: string | null): Visibility {
  if (
    visibility === "public" ||
    visibility === "restricted" ||
    visibility === "private"
  ) {
    return visibility;
  }

  return "private";
}

export const resourceFileTypeZh: Record<ResourceFileType, string> = {
  pdf: "PDF 快照",
  screenshot: "网页截图",
  html: "HTML 快照",
  document: "文档",
  image: "图片",
  web_archive: "网页存档",
  csv: "表格文件",
  json: "数据文件",
  other: "其他文件",
};

export const copyrightStatusZh: Record<CopyrightStatus, string> = {
  public_domain: "公有领域",
  government_work: "政府作品",
  copyrighted: "受版权保护",
  unknown: "未知",
};

export const resourceVersionStatusZh: Record<ResourceVersionStatus, string> = {
  current: "当前有效",
  superseded: "已被替代",
  repealed: "已废止",
  historical: "历史版本",
  draft: "草案",
  unknown: "状态未知",
};

export const resourceVersionStatusBadge: Record<ResourceVersionStatus, string> = {
  current:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  superseded:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  repealed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  historical: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  draft:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  unknown: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};
