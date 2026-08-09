import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ResourceAdminQuickEdit } from "@/components/ResourceAdminQuickEdit";
import { ResourceDossierNote } from "@/components/ResourceDossierNote";
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
  linkStatusBadge,
  linkStatusZh,
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
  "当前仅整理了该资料的来源发布记录，完整历史版本沿革待后续补充。";
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

  return (
    <>
      <section
        id="overview"
        className="resource-dossier-detail scroll-mt-24"
      >
        <div className="resource-dossier-detail__grain" />
        <div className="resource-dossier-detail__shell">
          <div className="resource-dossier-folder">
            <span className="resource-dossier-folder__tab">
              档案记录 · {resource.sourceDomain || "未记录来源"}
            </span>
            <span className="resource-dossier-folder__side-tab">资料索引</span>
            <div className="resource-dossier-folder__crease" />

            <div className="resource-dossier-layout">
              <aside className="resource-dossier-left-page">
                <div className="resource-dossier-label-strip">
                  <span>来源快照</span>
                  <b>{snapshotStatus.label}</b>
                </div>

                <div className="resource-dossier-photo-card">
                  {canOpenHeroSnapshot ? (
                    <a
                      href={heroSnapshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="打开本站保存的来源快照"
                    >
                      <img
                        src={heroSnapshotUrl}
                        alt={`${displayTitle} 的来源快照`}
                        loading="eager"
                      />
                    </a>
                  ) : (
                    <div className="resource-dossier-photo-placeholder">
                      <span>暂无快照</span>
                      <p>
                        {snapshotStatus.status === "none"
                          ? "本站暂未保存可预览的来源快照，可能是官方页面限制自动截图或仍在分批补充。"
                          : "已保存来源文件，预览待补充。"}
                      </p>
                    </div>
                  )}
                </div>

                <dl className="resource-dossier-source-lines">
                  <div>
                    <dt>来源域名</dt>
                    <dd>{resource.sourceDomain || "未记录"}</dd>
                  </div>
                  <div>
                    <dt>链接状态</dt>
                    <dd className={linkStatusBadge[resource.linkStatus]}>
                      {linkStatusZh[resource.linkStatus]}
                    </dd>
                  </div>
                  <div>
                    <dt>快照状态</dt>
                    <dd className={snapshotStatusClassName}>
                      {snapshotStatus.label}
                    </dd>
                  </div>
                </dl>

                <div className="resource-dossier-left-metrics">
                  <a href="#source-saving">
                    <span>官方来源</span>
                    <strong>{resource.sourceUrl ? 1 : 0}</strong>
                  </a>
                  <a
                    href={
                      resource.versioningApplicable !== false
                        ? "#versions"
                        : "#source-saving"
                    }
                  >
                    <span>版本节点</span>
                    <strong>{versions.length}</strong>
                  </a>
                  <a href="#related-resources">
                    <span>相关资料</span>
                    <strong>{relatedResources.length}</strong>
                  </a>
                </div>

                <div className="resource-dossier-left-tags">
                  <span>索引词</span>
                  <div>
                    {focusTags.length > 0 ? (
                      focusTags.slice(0, 5).map((tag) => <b key={tag}>{tag}</b>)
                    ) : (
                      <b>标签待整理</b>
                    )}
                  </div>
                </div>
              </aside>

              <article className="resource-dossier-right-page">
                <div className="resource-dossier-right-page__header">
                  <div>
                    <p className="resource-dossier-kicker">
                      ArchiveScope 资料收录档案
                    </p>
                    <h1>{displayTitle}</h1>
                    <p className="resource-dossier-title-en">{resource.titleEn}</p>
                  </div>
                  <span className="resource-dossier-type-badge">
                    {resourceTypeZh[resource.resourceType]}
                  </span>
                </div>

                {resource.summaryShort ? (
                  <p className="resource-dossier-abstract">{resource.summaryShort}</p>
                ) : null}

                {resourceUsageNotice ? (
                  <p className="resource-dossier-notice">{resourceUsageNotice}</p>
                ) : null}

                <p className="resource-dossier-review-note">
                  本条中文介绍由 AI 辅助整理，并经网站管理员人工审核后发布；如发现事实、翻译或链接问题，请联系
                  <a href="mailto:liangjiayu1223@ruc.edu.cn">
                    liangjiayu1223@ruc.edu.cn
                  </a>
                  。
                </p>

                <div className="resource-dossier-stamp-grid">
                  <div>
                    <span>资料编号</span>
                    <strong>{resource.id}</strong>
                  </div>
                  <div>
                    <span>来源域名</span>
                    <strong>{resource.sourceDomain || "未记录"}</strong>
                  </div>
                  <div>
                    <span>文件数量</span>
                    <strong>{officialFiles.length + siteSnapshotFiles.length}</strong>
                  </div>
                  <div>
                    <span>链接状态</span>
                    <strong>{linkStatusZh[resource.linkStatus]}</strong>
                  </div>
                </div>

                <dl className="resource-dossier-register">
                  <div>
                    <dt>国家地区</dt>
                    <dd>{country?.nameZh ?? "未标注"}</dd>
                  </div>
                  <div>
                    <dt>发布机构</dt>
                    <dd>
                      {institution ? (
                        <Link href={`/institutions/${institution.slug}`}>
                          {institution.nameZh}
                        </Link>
                      ) : (
                        "未标注"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>主专题</dt>
                    <dd>
                      {primaryTopic ? (
                        <Link href={`/topics/${primaryTopic.slug}`}>
                          {primaryTopic.titleZh}
                        </Link>
                      ) : (
                        "未标注专题"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>发布日期</dt>
                    <dd>{resource.publishDate || "未记录"}</dd>
                  </div>
                  <div>
                    <dt>更新日期</dt>
                    <dd>{resource.updatedDate || "未记录"}</dd>
                  </div>
                  <div>
                    <dt>访问日期</dt>
                    <dd>{resource.accessDate || "未记录"}</dd>
                  </div>
                </dl>

                <div className="resource-dossier-topic-row">
                  <span>所属专题</span>
                  <div>
                    {primaryTopic ? (
                      <Link href={`/topics/${primaryTopic.slug}`}>
                        {primaryTopic.titleZh}
                      </Link>
                    ) : null}
                    {relatedTopics.length > 0 ? (
                      relatedTopics.map((topic) => (
                        <Link key={topic.id} href={`/topics/${topic.slug}`}>
                          {topic.titleZh}
                        </Link>
                      ))
                    ) : primaryTopic ? null : (
                      <em>暂无其他相关专题</em>
                    )}
                  </div>
                </div>

                <div className="resource-dossier-actions">
                  {resource.sourceUrl ? (
                    <a
                      href={resource.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      访问官方来源
                    </a>
                  ) : null}
                  {primaryOfficialFile ? (
                    <a
                      href={getOfficialFileHref(primaryOfficialFile)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {getOfficialFileActionLabel(primaryOfficialFile)}
                    </a>
                  ) : null}
                  {directlyOpenableSnapshotHref ? (
                    <a
                      href={directlyOpenableSnapshotHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      查看来源快照
                    </a>
                  ) : siteSnapshotFiles.length > 0 ? (
                    <a href="#source-saving">查看来源快照</a>
                  ) : null}
                </div>
              </article>
            </div>
          </div>

          {showFrontendAdminTools ? (
            <div className="resource-dossier-admin-tools">
              <ResourceAdminQuickEdit
                actionsEnabled={process.env.ADMIN_ACTIONS_ENABLED === "true"}
                resource={{
                  id: resource.id,
                  titleZh: resource.titleZh,
                  titleEn: resource.titleEn,
                  summaryShort: resource.summaryShort,
                  summaryZh: resource.summaryZh,
                  keyPoints: resource.keyPoints,
                  researchValue: resource.researchValue,
                  tags: resource.tags,
                  sourceDomain: resource.sourceDomain,
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="resource-dossier-continuation">
        <div className="resource-dossier-continuation__shell">
          <div className="resource-dossier-continuation__header">
            <div>
              <span>分卷目录</span>
              <h2>资料分卷</h2>
            </div>
            <nav
              className="resource-dossier-section-tabs"
              aria-label="资料分卷导航"
            >
              {navigationItems.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="resource-dossier-workspace">
            <div className="resource-dossier-workspace__main">
            <DetailSection
              id="interpretation"
              title="资料解读"
              description="用中文快速理解这份资料的内容、制度位置和研究价值。"
            >
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    AI 辅助整理
                  </span>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                    基于官方来源
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {isReviewedInterpretation ? "人工审核后发布" : "管理员持续校对"}
                  </span>
                </div>

                <section className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30 sm:p-5">
                  <div className="resource-interpretation-summary">
                    <div>
                      <span>快速理解</span>
                      <h3>中文摘要</h3>
                    </div>
                    <div className="resource-interpretation-summary__text">
                      {interpretationSummaryParagraphs.map((paragraph, index) => (
                        <p key={`${index}-${paragraph}`}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      内容要点
                    </h3>
                    <div className="mt-3 space-y-3">
                      {displayKeyPointSegments.map((point, index) => (
                        <div
                          key={`${index}-${point.lead}-${point.rest}`}
                          className="resource-interpretation-point"
                        >
                          <span>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <p>
                            <strong>{point.lead}</strong>
                            {point.rest ? <small>{point.rest}</small> : null}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="space-y-4 lg:pt-6">
                    <section className="resource-interpretation-value">
                      <div>
                        <h3>
                          研究价值
                        </h3>
                        <div>
                          {researchFocusItems.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                      <div className="resource-interpretation-value__text">
                        {researchValueParagraphs.map((paragraph, index) => (
                          <p key={`${index}-${paragraph}`}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <p className="mt-5 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
                  本区内容由 AI 基于官方来源和站内整理信息辅助生成，并经过网站管理员人工审核后发布，仅供快速理解和研究参考。正式引用和使用时，请以官方原文、当前有效文本及发布机构最新版本为准；如发现问题，请联系 liangjiayu1223@ruc.edu.cn。
                </p>
              </div>
            </DetailSection>

            {officialFiles.length > 0 ? (
              <DetailSection
                id="official-texts"
                title="官方文本与文件"
                description="用于快速找到当前有效文本、官方文件或权威可读来源；完整关联仍保留在版本详情中。"
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      当前有效文本 / 官方文件数量
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-indigo-950 dark:text-indigo-100">
                      {officialFiles.length}
                    </p>
                    {primaryOfficialFile ? (
                      <a
                        href={getOfficialFileHref(primaryOfficialFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        {getOfficialFileActionLabel(primaryOfficialFile)}
                      </a>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {previewOfficialFiles.map((file) => (
                      <div
                        key={file.id}
                        className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {file.titleZh}
                            </h3>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {file.titleEn}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {file.isPrimaryAccess ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                主要访问入口
                              </span>
                            ) : null}
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {getOfficialFileReliabilityLabel(
                                file.sourceReliability,
                              )}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {file.fileType}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                          {file.descriptionZh}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            来源：{file.sourceName}
                          </p>
                          <a
                            href={getOfficialFileHref(file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            {getOfficialFileActionLabel(file)}
                          </a>
                        </div>
                      </div>
                    ))}

                    {officialFiles.length > previewOfficialFiles.length ? (
                      <details className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
                        <summary className="cursor-pointer select-none text-sm font-medium text-indigo-700 dark:text-indigo-300">
                          查看全部官方文本
                        </summary>
                        <div className="mt-3 space-y-3">
                          {officialFiles.map((file) => (
                            <div
                              key={`all-${file.id}`}
                              className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950"
                            >
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {file.titleZh}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {file.sourceName} · {file.fileType}
                              </p>
                              <a
                                href={getOfficialFileHref(file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex text-xs font-medium text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
                              >
                                {getOfficialFileActionLabel(file)}
                              </a>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
              </DetailSection>
            ) : null}

            {resource.versioningApplicable !== false ? (
              <div id="versions" className="scroll-mt-24">
                <VersionTimeline
                  versions={versions}
                  files={files}
                  officialFiles={officialFiles}
                  currentVersionId={currentVersionId}
                  versionNote={resource.versionNote}
                  description={
                    generatedSourcePublicationVersion
                      ? generatedVersionTimelineDescription
                      : undefined
                  }
                />
              </div>
            ) : null}

            <DetailSection
              id="source-saving"
              title="来源与保存"
              description={snapshotBackupDescription}
            >
              <section className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      官方来源
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      这里记录发布机构原始页面，不代表本站保存了官方全文。
                    </p>
                  </div>
                  {resource.sourceUrl ? (
                    <a
                      href={resource.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      访问官方来源
                    </a>
                  ) : null}
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
                  <div className="sm:col-span-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">官方链接</dt>
                    <dd className="mt-0.5 break-all">
                      {resource.sourceUrl || "未记录"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">来源域名</dt>
                    <dd className="mt-0.5">{resource.sourceDomain || "未记录"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">链接状态</dt>
                    <dd className={`mt-0.5 ${linkStatusBadge[resource.linkStatus]}`}>
                      {linkStatusZh[resource.linkStatus]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">访问日期</dt>
                    <dd className="mt-0.5">{resource.accessDate || "未记录"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      最近检查日期
                    </dt>
                    <dd className="mt-0.5">
                      {resource.lastCheckedAt || "未记录"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="mt-4 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    本站来源快照
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${snapshotStatusClassName}`}
                  >
                    {snapshotStatus.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  本站快照用于记录采集时页面状态，仅供来源核验和防止链接失效，不替代官方正式文本。
                </p>
                {resourceShapeLabel ? (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    资料形态：{resourceShapeLabel}
                  </p>
                ) : null}
                <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-950">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-600 dark:text-zinc-300">
                      备份状态：
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${snapshotStatusClassName}`}
                    >
                      {snapshotStatus.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {getSnapshotStatusDescription(snapshotStatus.status)}
                  </p>
                  {snapshotStatus.status !== "none" ? (
                    <div className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      <p>
                        已保存：
                        {formatSourceSavingFileTypes(snapshotStatus.fileTypes)}
                      </p>
                      {snapshotStatus.missingFileTypes.length > 0 ? (
                        <p>
                          缺少：
                          {formatSourceSavingFileTypes(
                            snapshotStatus.missingFileTypes,
                          )}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  {directlyOpenableSnapshotHref ? (
                    <a
                      href={directlyOpenableSnapshotHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      打开本站来源快照（可查看或保存）
                    </a>
                  ) : (
                    <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                      {isFederalRegisterResource
                        ? "Federal Register 资料优先通过官方 API 和官方 PDF 获取。你可以访问官方链接或官方 PDF。"
                        : "本站暂未保存可直接打开的来源快照。"}
                    </p>
                  )}
                </div>
              </section>
            </DetailSection>

            <DetailSection
              id="related-resources"
              title="相关资料"
              description="基于相同专题、机构和资料关系自动选取，帮助继续追踪相关制度和实践。"
            >
              {relatedResources.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {relatedResources.map((relatedResource) => (
                    <Link
                      key={relatedResource.resource.id}
                      href={`/resources/${relatedResource.resource.slug}`}
                      className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                          {resourceTypeZh[relatedResource.resource.resourceType]}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                          {relatedResource.resource.publishDate || "日期未记录"}
                        </span>
                        {relatedResource.relationLabel ? (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {relatedResource.relationLabel}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-50">
                        {relatedResource.resource.titleZh ||
                          relatedResource.resource.titleEn}
                      </h3>
                      {relatedResource.relationDescription ? (
                        <p className="mt-2 text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">
                          {relatedResource.relationDescription}
                        </p>
                      ) : null}
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {relatedResource.resource.summaryZh ||
                          "该相关资料的中文摘要待补充。"}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  暂未整理到直接相关资料。
                </p>
              )}
            </DetailSection>
          </div>

          </div>
        </div>
      </section>
    </>
  );
}
