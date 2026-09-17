import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ResourceAdminQuickEdit } from "@/components/ResourceAdminQuickEdit";
import { ResourceDossierNote } from "@/components/ResourceDossierNote";
import { ResourceReadingDesk } from "@/components/ResourceReadingDesk";
import { VersionTimeline } from "@/components/VersionTimeline";
import {
  resourceOfficialFiles,
  type ResourceOfficialFile,
} from "@/data/imports/us/resourceOfficialFiles";
import {
  entityRelations,
  resourceVersions as allResourceVersions,
  resources,
} from "@/data/mockData";
import {
  getCountryById,
  getInstitutionById,
  getResourceBySlug,
  getResourceFiles,
  getResourceVersions,
  getTopicById,
} from "@/lib/data";
import {
  copyrightStatusZh,
  getKnowledgeRole,
  linkStatusBadge,
  linkStatusZh,
  knowledgeRoleZh,
  resourceFileTypeZh,
  resourceTypeZh,
  visibilityZh,
} from "@/lib/display";
import type { ResourceFile, ResourceFileType, ResourceVersion } from "@/types";

type ResourceDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};
type SourceSnapshotStatus = "complete" | "partial" | "none";

const interpretationSummaryPlaceholder = "该资料的中文摘要待补充。";
const emptyKeyPointPlaceholder = "内容要点待整理。";
const emptyResearchValuePlaceholder = "研究价值待补充。";
const generatedVersionTimelineDescription =
  "当前仅整理了该资料的来源发布文件，完整历史版本沿革待后续补充。";
const snapshotBackupDescription =
  "ArchiveScope 不替代官方来源。本站保存的来源快照或备份文件仅用于资料来源核验、学术研究和防止链接失效。正式引用和使用时，请优先访问官方原始链接，并以发布机构的最新版本为准。";
const requiredSourceSnapshotFileTypes = [
  "pdf",
  "screenshot",
] satisfies ResourceFileType[];

function getResourceFileTypeLabel(file: ResourceFile) {
  return resourceFileTypeZh[file.fileType] ?? file.fileType;
}

function getResourceFileActionLabel(file: ResourceFile) {
  if (file.fileType === "pdf") {
    return "查看本站 PDF 快照";
  }

  if (file.fileType === "screenshot") {
    return "查看本站来源快照";
  }

  return "查看本站来源快照";
}

function normalizeSnapshotFileUrl(fileUrl?: string) {
  const trimmedFileUrl = fileUrl?.trim() ?? "";

  if (!trimmedFileUrl) {
    return "";
  }

  if (
    trimmedFileUrl.startsWith("/") ||
    trimmedFileUrl.startsWith("http://") ||
    trimmedFileUrl.startsWith("https://")
  ) {
    return trimmedFileUrl;
  }

  return `/${trimmedFileUrl}`;
}

function canOpenSnapshotFile(normalizedFileUrl: string) {
  return normalizedFileUrl.startsWith("/snapshots/us/");
}

function getSourceSavingFileTypeLabel(fileType: ResourceFileType | string) {
  if (fileType === "pdf") {
    return "PDF 快照";
  }

  return resourceFileTypeZh[fileType as ResourceFileType] ?? fileType;
}

function formatSourceSavingFileTypes(fileTypes: ResourceFileType[]) {
  if (fileTypes.length === 0) {
    return "无";
  }

  return fileTypes.map(getSourceSavingFileTypeLabel).join("、");
}

function getSourceSnapshotStatus(files: ResourceFile[]) {
  const availableFileTypes = Array.from(
    new Set(
      files
        .filter((file) => {
          const normalizedFileUrl = normalizeSnapshotFileUrl(file.fileUrl);

          return (
            file.visibility === "public" &&
            canOpenSnapshotFile(normalizedFileUrl) &&
            (file.fileType === "pdf" ||
              file.fileType === "screenshot" ||
              file.fileType === "html")
          );
        })
        .map((file) => file.fileType),
    ),
  ).sort();
  const fileTypes = Array.from(
    new Set(
      availableFileTypes.filter((fileType) =>
        (requiredSourceSnapshotFileTypes as readonly ResourceFileType[]).includes(
          fileType,
        ),
      ),
    ),
  ).sort();
  const missingFileTypes = requiredSourceSnapshotFileTypes.filter(
    (fileType) => !fileTypes.includes(fileType),
  );
  const status: SourceSnapshotStatus =
    missingFileTypes.length === 0
      ? "complete"
      : availableFileTypes.length > 0
        ? "partial"
        : "none";
  const label = {
    complete: "已完整备份",
    partial: "部分备份",
    none: "未备份",
  }[status];

  return {
    status,
    label,
    fileTypes: availableFileTypes,
    missingFileTypes,
  };
}

function getSnapshotStatusClassName(status: SourceSnapshotStatus) {
  return {
    complete:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    partial:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    none: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  }[status];
}

function getSnapshotStatusDescription(status: SourceSnapshotStatus) {
  if (status === "complete") {
    return "本站已保存该资料来源页面的 PDF 与来源快照文件。";
  }

  if (status === "partial") {
    return "本站已保存部分来源快照。";
  }

  return "本站暂未保存来源快照，可能因为官方页面限制自动截图、页面动态加载、需要人工验证，或该批资料仍在分批补充。";
}

function getResourceShapeLabel(resourceType: string) {
  const shapeLabels: Record<string, string> = {
    guidance: "指南页面",
    portal: "资源门户",
    system: "平台系统",
    project: "项目介绍",
    program: "项目介绍",
    institution_resource: "机构资源",
    course: "教育资源",
    exhibition: "展览资源",
    event: "活动信息",
  };

  return shapeLabels[resourceType] ?? "";
}

function isSiteSnapshotFile(file: ResourceFile) {
  const normalizedFileUrl = normalizeSnapshotFileUrl(file.fileUrl);

  return (
    canOpenSnapshotFile(normalizedFileUrl) &&
    (file.fileType === "screenshot" ||
      file.fileType === "pdf" ||
      file.fileType === "html")
  );
}

function formatFileSize(fileSize?: number) {
  if (!fileSize || fileSize <= 0) {
    return "未记录";
  }

  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

type SourceFileCardProps = {
  file: ResourceFile;
  href: string;
  actionLabel: string;
  unavailableMessage: string;
  secondaryAction?: boolean;
};

function SourceFileCard({
  file,
  href,
  actionLabel,
  unavailableMessage,
  secondaryAction = false,
}: SourceFileCardProps) {
  const normalizedFileUrl = normalizeSnapshotFileUrl(file.fileUrl);
  const buttonClassName = secondaryAction
    ? "inline-flex rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    : "inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700";

  return (
    <div className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {getResourceFileTypeLabel(file)}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {file.fileName || "未命名文件"}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {file.capturedAt || "采集时间未记录"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {file.description || "暂无文件说明。"}
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">文件类型</dt>
          <dd className="mt-0.5 break-all">{file.fileType || "未记录"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">文件大小</dt>
          <dd className="mt-0.5">{formatFileSize(file.fileSize)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">文件名</dt>
          <dd className="mt-0.5 break-all">{file.fileName || "未记录"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">fileUrl</dt>
          <dd className="mt-0.5 break-all">{normalizedFileUrl || "未记录"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">可见性</dt>
          <dd className="mt-0.5">
            {visibilityZh[file.visibility] ?? file.visibility ?? "未标注"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">版权状态</dt>
          <dd className="mt-0.5">
            {copyrightStatusZh[file.copyrightStatus] ??
              file.copyrightStatus ??
              "未标注"}
          </dd>
        </div>
      </dl>
      {file.notes ? (
        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {file.notes}
        </p>
      ) : null}
      {file.checksum ? (
        <details className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer select-none">查看文件校验值</summary>
          <p className="mt-2 break-all">{file.checksum}</p>
        </details>
      ) : (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          文件校验值：未记录
        </p>
      )}
      <div className="mt-4">
        {file.visibility === "public" && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName}
          >
            {actionLabel}
          </a>
        ) : file.visibility === "public" ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {unavailableMessage}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            本站已保存该资料相关文件，但暂不公开展示。
          </p>
        )}
      </div>
    </div>
  );
}

function DetailSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <ResourceDossierNote id={id} title={title} description={description}>
      {children}
    </ResourceDossierNote>
  );
}

function getOfficialFileReliabilityLabel(reliability: string) {
  const labels: Record<string, string> = {
    official: "官方来源",
    authoritative_third_party: "权威第三方",
    third_party: "第三方来源",
  };

  return labels[reliability] ?? reliability;
}

function getOfficialFileActionLabel(file: ResourceOfficialFile) {
  return file.fileRole === "official_text" ? "查看官方文本" : "查看官方文件";
}

function getOfficialFileHref(file: ResourceOfficialFile) {
  return file.fileUrl || file.sourceUrl;
}

function getResourceTypeUsageNotice(resourceType: string) {
  if (resourceType === "law") {
    return "法律法规类资料建议优先查看当前有效文本和版本沿革。";
  }

  if (resourceType === "portal") {
    return "该资料为资源门户或专题入口，主要用于聚合相关政策、指南、工具、系统和服务链接。具体内容请以官方页面及其下级资源为准。";
  }

  if (
    resourceType === "system" ||
    resourceType === "project" ||
    resourceType === "program"
  ) {
    return "该资料为平台或项目入口，本站提供中文说明和来源快照，具体使用以官方页面为准。";
  }

  return "";
}

type RelatedResourceItem = {
  resource: (typeof resources)[number];
  relationLabel?: string;
  relationDescription?: string;
  explicit: boolean;
};

function getRelatedResources(
  resource: NonNullable<ReturnType<typeof getResourceBySlug>>,
) {
  const resourceTopicIds = new Set(resource.topicIds);
  const explicitRelatedResourceItems = entityRelations
    .filter((relation) => {
      const isSourceMatch =
        relation.sourceType === "resource" &&
        relation.sourceId === resource.id &&
        relation.targetType === "resource";
      const isTargetMatch =
        relation.targetType === "resource" &&
        relation.targetId === resource.id &&
        relation.sourceType === "resource";

      return isSourceMatch || isTargetMatch;
    })
    .map((relation): RelatedResourceItem | null => {
      const relatedResourceId =
        relation.sourceType === "resource" && relation.sourceId === resource.id
          ? relation.targetId
          : relation.sourceId;
      const relatedResource = resources.find(
        (candidate) => candidate.id === relatedResourceId,
      );

      if (!relatedResource) {
        return null;
      }

      return {
        resource: relatedResource,
        relationLabel: relation.relationLabelZh,
        relationDescription: relation.descriptionZh,
        explicit: true,
      };
    })
    .filter((item): item is RelatedResourceItem => Boolean(item));
  const explicitResourceIds = new Set(
    explicitRelatedResourceItems.map((item) => item.resource.id),
  );

  const inferredRelatedResourceItems = resources
    .filter(
      (candidate) =>
        candidate.id !== resource.id && !explicitResourceIds.has(candidate.id),
    )
    .map((candidate) => {
      let score = 0;

      if (candidate.primaryTopicId === resource.primaryTopicId) {
        score += 4;
      }

      if (candidate.institutionId === resource.institutionId) {
        score += 2;
      }

      score += candidate.topicIds.filter((topicId) =>
        resourceTopicIds.has(topicId),
      ).length;

      return {
        resource: candidate,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.resource.publishDate.localeCompare(left.resource.publishDate);
    })
    .slice(0, 4)
    .map((item): RelatedResourceItem => ({ resource: item.resource, explicit: false }));

  return [...explicitRelatedResourceItems, ...inferredRelatedResourceItems].slice(
    0,
    6,
  );
}

function getLinkedResourceIds(resourceId: string) {
  const linkedResourceIds = new Set<string>();

  entityRelations.forEach((relation) => {
    if (relation.sourceType !== "resource" || relation.targetType !== "resource") {
      return;
    }

    if (relation.sourceId === resourceId) {
      linkedResourceIds.add(relation.targetId);
    }

    if (relation.targetId === resourceId) {
      linkedResourceIds.add(relation.sourceId);
    }
  });

  return linkedResourceIds;
}

function getRelatedVersionTimeline(
  resource: NonNullable<ReturnType<typeof getResourceBySlug>>,
  explicitVersions: ResourceVersion[],
) {
  const versionMap = new Map<string, ResourceVersion>();

  explicitVersions.forEach((version) => {
    versionMap.set(version.id, version);
  });

  const linkedResourceIds = getLinkedResourceIds(resource.id);

  allResourceVersions.forEach((version) => {
    if (linkedResourceIds.has(version.resourceId)) {
      versionMap.set(version.id, version);
    }
  });

  return Array.from(versionMap.values());
}

function createSourcePublicationVersion(
  resource: NonNullable<ReturnType<typeof getResourceBySlug>>,
): ResourceVersion {
  return {
    id: `${resource.id}-source-publication`,
    resourceId: resource.id,
    versionTitle:
      resource.sourceDomain === "federalregister.gov"
        ? "Federal Register 发布版本"
        : "当前收录版本",
    versionStatus: "current",
    publishDate: resource.publishDate,
    sourceUrl: resource.sourceUrl,
    archivedUrl: resource.archivedUrl,
    summaryZh: resource.versionNote || generatedVersionTimelineDescription,
    keyChanges: ["当前为来源发布节点，尚未整理与其他版本之间的差异。"],
    aiSummary: "",
    humanNote:
      "该版本节点由资料元数据自动生成，用于标识当前收录资料的来源发布时间和官方链接。",
    relatedFileIds: [],
  };
}

function splitReadableParagraphs(text: string, sentencesPerParagraph = 2) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return [];
  }

  const sentences =
    normalizedText
      .match(/[^。！？!?；;]+[。！？!?；;]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

  if (sentences.length <= sentencesPerParagraph) {
    return [normalizedText];
  }

  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(index, index + sentencesPerParagraph).join(""));
  }

  return paragraphs;
}

function splitKeyPointText(point: string) {
  const normalizedPoint = point.trim();
  const splitIndex = ["，", ",", "；", ";", "。", "：", ":"]
    .map((punctuation) => normalizedPoint.indexOf(punctuation))
    .filter((index) => index >= 8 && index <= 34)
    .sort((left, right) => left - right)[0];

  if (splitIndex === undefined) {
    return {
      lead: normalizedPoint,
      rest: "",
    };
  }

  return {
    lead: normalizedPoint.slice(0, splitIndex + 1),
    rest: normalizedPoint.slice(splitIndex + 1).trim(),
  };
}

function getResearchFocusItems(
  resource: NonNullable<ReturnType<typeof getResourceBySlug>>,
  primaryTopicTitle?: string,
) {
  return [
    primaryTopicTitle,
    knowledgeRoleZh[getKnowledgeRole(resource)],
    resourceTypeZh[resource.resourceType],
    resource.sourceDomain ? `来源：${resource.sourceDomain}` : null,
    "制度比较",
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 4);
}

export function generateStaticParams() {
  return resources.flatMap((resource) =>
    [resource.slug, ...(resource.slugAliases ?? [])].map((slug) => ({
      slug,
    })),
  );
}

export default async function ResourceDetailPage({
  params,
}: ResourceDetailPageProps) {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  const country = getCountryById(resource.countryId);
  const institution = getInstitutionById(resource.institutionId);
  const primaryTopic = getTopicById(resource.primaryTopicId);
  const relatedTopics = resource.topicIds
    .filter((topicId) => topicId !== resource.primaryTopicId)
    .map((topicId) => getTopicById(topicId))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));
  const files = getResourceFiles(resource.id);
  const explicitVersions = getResourceVersions(resource.id);
  const relatedVersionTimeline = getRelatedVersionTimeline(
    resource,
    explicitVersions,
  );
  const generatedSourcePublicationVersion =
    relatedVersionTimeline.length === 0 && resource.versioningApplicable === true
      ? createSourcePublicationVersion(resource)
      : null;
  const versions = generatedSourcePublicationVersion
    ? [generatedSourcePublicationVersion]
    : relatedVersionTimeline;
  const currentVersionId =
    generatedSourcePublicationVersion?.id ??
    versions.find(
      (version) =>
        version.versionStatus === "current" &&
        version.resourceId.startsWith("ecfr-"),
    )?.id ??
    explicitVersions.find((version) => version.resourceId === resource.id)?.id ??
    resource.currentVersionId;
  const displayTitle = resource.titleZh || resource.titleEn;
  const interpretationSummary =
    resource.summaryZh || interpretationSummaryPlaceholder;
  const displayKeyPoints =
    resource.keyPoints.length > 0 ? resource.keyPoints : [emptyKeyPointPlaceholder];
  const displayResearchValue = resource.researchValue || emptyResearchValuePlaceholder;
  const interpretationSummaryParagraphs =
    splitReadableParagraphs(interpretationSummary);
  const researchValueParagraphs = splitReadableParagraphs(displayResearchValue, 1);
  const displayKeyPointSegments = displayKeyPoints.map(splitKeyPointText);
  const researchFocusItems = getResearchFocusItems(
    resource,
    primaryTopic?.titleZh,
  );
  const officialFiles = resourceOfficialFiles
    .filter((file) => file.resourceId === resource.id)
    .sort((leftFile, rightFile) => {
      if (leftFile.isPrimaryAccess !== rightFile.isPrimaryAccess) {
        return leftFile.isPrimaryAccess ? -1 : 1;
      }

      return leftFile.titleEn.localeCompare(rightFile.titleEn);
    });
  const resourceShapeLabel = getResourceShapeLabel(resource.resourceType);
  const isFederalRegisterResource =
    resource.sourceDomain.toLowerCase() === "federalregister.gov";
  const siteSnapshotFiles = files.filter(isSiteSnapshotFile);
  const snapshotStatus = getSourceSnapshotStatus(siteSnapshotFiles);
  const snapshotStatusClassName = getSnapshotStatusClassName(snapshotStatus.status);
  const screenshotSnapshotFiles = siteSnapshotFiles.filter(
    (file) => file.fileType === "screenshot" || file.fileType === "image",
  );
  const pdfSnapshotFiles = siteSnapshotFiles.filter(
    (file) => file.fileType === "pdf",
  );
  const otherSnapshotFiles = siteSnapshotFiles.filter(
    (file) =>
      file.fileType !== "screenshot" &&
      file.fileType !== "image" &&
      file.fileType !== "pdf",
  );
  const primarySnapshotFiles =
    screenshotSnapshotFiles.length > 0
      ? [...screenshotSnapshotFiles, ...otherSnapshotFiles]
      : otherSnapshotFiles.length > 0
        ? otherSnapshotFiles
        : pdfSnapshotFiles.slice(0, 1);
  const secondaryPdfSnapshotFiles =
    screenshotSnapshotFiles.length > 0 ? pdfSnapshotFiles : pdfSnapshotFiles.slice(1);
  const heroSnapshotFile = screenshotSnapshotFiles[0];
  const heroSnapshotUrl = heroSnapshotFile
    ? normalizeSnapshotFileUrl(heroSnapshotFile.fileUrl)
    : "";
  const canOpenHeroSnapshot =
    heroSnapshotFile?.visibility === "public" &&
    canOpenSnapshotFile(heroSnapshotUrl);
  const directlyOpenableSnapshotFile = [
    ...primarySnapshotFiles,
    ...secondaryPdfSnapshotFiles,
  ].find((file) => {
    const normalizedFileUrl = normalizeSnapshotFileUrl(file.fileUrl);

    return file.visibility === "public" && canOpenSnapshotFile(normalizedFileUrl);
  });
  const directlyOpenableSnapshotHref = directlyOpenableSnapshotFile
    ? normalizeSnapshotFileUrl(directlyOpenableSnapshotFile.fileUrl)
    : "";
  const primaryOfficialFile =
    officialFiles.find((file) => file.isPrimaryAccess) ?? officialFiles[0];
  const previewOfficialFiles = officialFiles.slice(0, 3);
  const relatedResources = getRelatedResources(resource);
  const resourceUsageNotice = getResourceTypeUsageNotice(resource.resourceType);
  const showFrontendAdminTools =
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_ACTIONS_ENABLED === "true";
  const isReviewedInterpretation =
    resource.status === "published" || resource.status === "reviewed";
  const focusTags = [
    primaryTopic?.titleZh ?? "",
    ...relatedTopics.map((topic) => topic.titleZh),
    ...resource.tags,
  ]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
    .slice(0, 6);
  const navigationItems = [
    { href: "#overview", label: "概览" },
    { href: "#interpretation", label: "解读" },
    officialFiles.length > 0
      ? { href: "#official-texts", label: "官方文本" }
      : null,
    resource.versioningApplicable !== false
      ? { href: "#versions", label: "版本" }
      : null,
    { href: "#source-saving", label: "来源与保存" },
    { href: "#related-resources", label: "相关资料" },
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return <ResourceReadingDesk dossier={{
    id: resource.id,
    title: displayTitle,
    titleEn: resource.titleEn,
    summary: resource.summaryShort || interpretationSummaryParagraphs[0] || interpretationSummary,
    keyPoints: displayKeyPoints,
    researchValue: displayResearchValue,
    typeLabel: resourceTypeZh[resource.resourceType],
    roleLabel: knowledgeRoleZh[getKnowledgeRole(resource)],
    institutionName: institution?.nameZh ?? "未标注机构",
    institutionSlug: institution?.slug,
    topicTitle: primaryTopic?.titleZh ?? "未标注专题",
    topicSlug: primaryTopic?.slug,
    publishDate: resource.publishDate || "",
    updatedDate: resource.updatedDate || "",
    sourceDomain: resource.sourceDomain,
    linkStatus: linkStatusZh[resource.linkStatus],
    snapshotStatus: snapshotStatus.label,
    sourceUrl: resource.sourceUrl,
    snapshotHref: directlyOpenableSnapshotHref || undefined,
    snapshotPreview: canOpenHeroSnapshot ? heroSnapshotUrl : undefined,
    officialHref: primaryOfficialFile ? getOfficialFileHref(primaryOfficialFile) : undefined,
    officialLabel: primaryOfficialFile ? getOfficialFileActionLabel(primaryOfficialFile) : undefined,
    tags: focusTags,
    versions: versions.length,
    files: officialFiles.length + siteSnapshotFiles.length,
    related: relatedResources.slice(0,4).map((item) => ({ slug:item.resource.slug, title:item.resource.titleZh || item.resource.titleEn, institution:getInstitutionById(item.resource.institutionId)?.nameZh ?? "未标注机构", relation:item.relationDescription || item.relationLabel || `同属“${primaryTopic?.titleZh ?? "本专题"}”的补充资料` })),
  }} />;

}
