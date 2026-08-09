"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ResourceOfficialFile } from "@/data/imports/us/resourceOfficialFiles";
import { resourceFileTypeZh, resourceVersionStatusZh } from "@/lib/display";
import type { ResourceFile, ResourceFileType, ResourceVersion } from "@/types";
import { VersionStatusBadge } from "@/components/VersionStatusBadge";

type VersionDetailModalProps = {
  version: ResourceVersion | null;
  files: ResourceFile[];
  officialFiles?: ResourceOfficialFile[];
  isCurrent: boolean;
  onClose: () => void;
};

function isGeneratedSourcePublicationVersion(version: ResourceVersion) {
  return version.id.includes("-source-publication");
}

const siteSnapshotFileTypes = ["pdf", "screenshot", "html"] satisfies ResourceFileType[];

const officialFileReliabilityMeta: Record<
  ResourceOfficialFile["sourceReliability"],
  { label: string; className: string }
> = {
  official: {
    label: "官方来源",
    className: "version-detail-modal__chip--official",
  },
  authoritative_third_party: {
    label: "权威第三方",
    className: "version-detail-modal__chip--authority",
  },
  third_party: {
    label: "第三方来源",
    className: "version-detail-modal__chip--third-party",
  },
};

function getOfficialFileActionLabel(file: ResourceOfficialFile) {
  if (file.fileRole === "official_text") {
    return "查看官方文本";
  }

  return "查看官方文件";
}

function getOfficialFileTypeLabel(file: ResourceOfficialFile) {
  if (file.fileType === "html") {
    return "HTML 文本";
  }

  return resourceFileTypeZh[file.fileType] ?? file.fileType;
}

function getVersionNatureLabel(
  version: ResourceVersion,
  isCurrent: boolean,
  isGeneratedVersion: boolean,
) {
  if (isGeneratedVersion) {
    return "自动生成的来源发布节点";
  }

  if (isCurrent) {
    return "当前版本 / 当前整理版本";
  }

  return resourceVersionStatusZh[version.versionStatus];
}

function normalizeFileUrl(fileUrl?: string) {
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

function isSiteSnapshotFile(file: ResourceFile) {
  const normalizedFileUrl = normalizeFileUrl(file.fileUrl);

  return (
    normalizedFileUrl.startsWith("/snapshots/") &&
    siteSnapshotFileTypes.includes(file.fileType as (typeof siteSnapshotFileTypes)[number])
  );
}

function getSnapshotFileActionLabel(file: ResourceFile) {
  if (file.fileType === "pdf") {
    return "查看本站 PDF 快照";
  }

  if (file.fileType === "screenshot") {
    return "查看本站网页截图";
  }

  if (file.fileType === "html") {
    return "查看本站 HTML 快照";
  }

  return "查看本站快照文件";
}

function getInternetArchiveUrl(sourceUrl?: string, archivedUrl?: string | null) {
  const trimmedArchivedUrl = archivedUrl?.trim() ?? "";

  if (trimmedArchivedUrl) {
    return trimmedArchivedUrl;
  }

  const trimmedSourceUrl = sourceUrl?.trim() ?? "";

  if (!trimmedSourceUrl) {
    return "";
  }

  return `https://web.archive.org/web/*/${encodeURI(trimmedSourceUrl)}`;
}

function OfficialFileCard({ file }: { file: ResourceOfficialFile }) {
  const reliabilityMeta = officialFileReliabilityMeta[file.sourceReliability];
  const href = file.fileUrl || file.sourceUrl;

  return (
    <div className="version-detail-modal__file-card">
      <div className="version-detail-modal__file-head">
        <div className="min-w-0 flex-1">
          <div className="version-detail-modal__chip-row">
            <span
              className={`version-detail-modal__chip ${reliabilityMeta.className}`}
            >
              {reliabilityMeta.label}
            </span>
            {file.isPrimaryAccess ? (
              <span className="version-detail-modal__chip">
                主要访问入口
              </span>
            ) : null}
            <span className="version-detail-modal__chip">
              {getOfficialFileTypeLabel(file)}
            </span>
          </div>
          <h4 className="version-detail-modal__file-title">
            {file.titleZh}
          </h4>
          <p className="version-detail-modal__file-subtitle">
            {file.titleEn}
          </p>
          <p className="version-detail-modal__file-meta">
            来源：{file.sourceName}
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="version-detail-modal__action version-detail-modal__action--primary"
        >
          {getOfficialFileActionLabel(file)}
        </a>
      </div>
      <p className="version-detail-modal__file-description">
        {file.descriptionZh}
      </p>
      {file.accessNote ? (
        <p className="version-detail-modal__file-note">
          {file.accessNote}
        </p>
      ) : null}
    </div>
  );
}

function SnapshotFileCard({ file }: { file: ResourceFile }) {
  const normalizedFileUrl = normalizeFileUrl(file.fileUrl);
  const canOpenFile = file.visibility === "public" && normalizedFileUrl;

  return (
    <div className="version-detail-modal__file-card">
      <div className="version-detail-modal__file-head">
        <div className="min-w-0 flex-1">
          <div className="version-detail-modal__chip-row">
            <span className="version-detail-modal__chip">
              {resourceFileTypeZh[file.fileType] ?? file.fileType}
            </span>
            {file.capturedAt ? (
              <span className="version-detail-modal__chip">
                {file.capturedAt}
              </span>
            ) : null}
          </div>
          <h4 className="version-detail-modal__file-title break-all">
            {file.fileName || "未命名快照文件"}
          </h4>
          <p className="version-detail-modal__file-description">
            {file.description || "暂无文件说明。"}
          </p>
        </div>
        {canOpenFile ? (
          <a
            href={normalizedFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="version-detail-modal__action version-detail-modal__action--secondary"
          >
            {getSnapshotFileActionLabel(file)}
          </a>
        ) : (
          <span className="version-detail-modal__file-note max-w-48">
            本站已记录该快照，但暂不公开展示。
          </span>
        )}
      </div>
    </div>
  );
}

export function VersionDetailModal({
  version,
  files,
  officialFiles = [],
  isCurrent,
  onClose,
}: VersionDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!version) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, version]);

  if (!version || !mounted) {
    return null;
  }

  const isGeneratedVersion = isGeneratedSourcePublicationVersion(version);
  const siteSnapshotFiles = files.filter(isSiteSnapshotFile);
  const internetArchiveUrl = getInternetArchiveUrl(
    version.sourceUrl,
    version.archivedUrl,
  );
  const hasVersionSummary =
    Boolean(version.summaryZh) || (version.keyChanges?.length ?? 0) > 0;
  const hasAuxiliaryNotes = Boolean(version.humanNote) || Boolean(version.aiSummary);

  return createPortal(
    <div
      className="version-detail-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-detail-title"
        className="version-detail-modal__paper"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="version-detail-modal__header">
          <div>
            <div className="version-detail-modal__eyebrow">VERSION RECORD</div>
            <div className="version-detail-modal__chip-row">
              {isGeneratedVersion ? (
                <span className="version-detail-modal__chip version-detail-modal__chip--current">
                  当前收录版本
                </span>
              ) : (
                <VersionStatusBadge status={version.versionStatus} />
              )}
              {isCurrent && !isGeneratedVersion ? (
                <span className="version-detail-modal__chip version-detail-modal__chip--current">
                  当前版本
                </span>
              ) : null}
            </div>
            <h2
              id="version-detail-title"
              className="version-detail-modal__title"
            >
              {version.versionTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭版本详情"
            className="version-detail-modal__close"
          >
            ×
          </button>
        </div>

        <div className="version-detail-modal__body">
          <section className="version-detail-modal__section version-detail-modal__section--info">
            <h3 className="version-detail-modal__section-title">
              版本基本信息
            </h3>
            <dl className="version-detail-modal__info-grid">
              <div className="version-detail-modal__info-item version-detail-modal__info-item--wide">
                <dt>版本名称</dt>
                <dd>
                  {version.versionTitle}
                </dd>
              </div>
              <div className="version-detail-modal__info-item">
                <dt>版本状态</dt>
                <dd>
                  <VersionStatusBadge status={version.versionStatus} />
                </dd>
              </div>
              <div className="version-detail-modal__info-item">
                <dt>版本性质</dt>
                <dd>
                  {getVersionNatureLabel(version, isCurrent, isGeneratedVersion)}
                </dd>
              </div>
              {version.versionNumber ? (
                <div className="version-detail-modal__info-item">
                  <dt>版本号</dt>
                  <dd>
                    {version.versionNumber}
                  </dd>
                </div>
              ) : null}
              {version.publishDate ? (
                <div className="version-detail-modal__info-item">
                  <dt>发布日期</dt>
                  <dd>
                    {version.publishDate}
                  </dd>
                </div>
              ) : null}
              {version.effectiveDate ? (
                <div className="version-detail-modal__info-item">
                  <dt>生效日期</dt>
                  <dd>
                    {version.effectiveDate}
                  </dd>
                </div>
              ) : null}
              {version.replacedDate ? (
                <div className="version-detail-modal__info-item">
                  <dt>
                    被替代或废止日期
                  </dt>
                  <dd>
                    {version.replacedDate}
                  </dd>
                </div>
              ) : null}
              <div className="version-detail-modal__info-item">
                <dt>当前标识</dt>
                <dd>
                  {isCurrent || isGeneratedVersion
                    ? [
                        isCurrent ? "当前版本" : "",
                        isGeneratedVersion ? "当前整理版本" : "",
                      ]
                        .filter(Boolean)
                        .join(" / ")
                    : "非当前版本"}
                </dd>
              </div>
              {version.sourceUrl ? (
                <div className="version-detail-modal__info-item version-detail-modal__info-item--wide">
                  <dt>
                    版本来源链接
                  </dt>
                  <dd className="break-all">
                    {version.sourceUrl}
                  </dd>
                  <a
                    href={version.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="version-detail-modal__action version-detail-modal__action--primary"
                  >
                    访问版本来源
                  </a>
                </div>
              ) : null}
            </dl>
            {isGeneratedVersion ? (
              <p className="version-detail-modal__notice">
                该版本节点由资料来源元数据自动生成，用于标识当前收录资料的来源发布时间和官方链接，不代表完整历史版本沿革。
              </p>
            ) : null}
          </section>

          {hasVersionSummary ? (
            <section className="version-detail-modal__section">
              <h3 className="version-detail-modal__section-title">
                版本摘要
              </h3>
              {version.summaryZh ? (
                <p className="version-detail-modal__paragraph">
                  {version.summaryZh}
                </p>
              ) : null}
              {(version.keyChanges?.length ?? 0) > 0 ? (
                <ul className="version-detail-modal__list">
                  {version.keyChanges.map((change) => (
                    <li key={change}>
                      <span />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {officialFiles.length > 0 ? (
            <section className="version-detail-modal__section">
              <h3 className="version-detail-modal__section-title">
                官方有效文本与文件
              </h3>
              <p className="version-detail-modal__paragraph">
                以下来源用于帮助用户访问该版本或当前整理版本对应的官方有效文本。ArchiveScope
                不替代官方发布机构，正式引用请以官方来源最新版本为准。
              </p>
              <p className="version-detail-modal__small-note">
                该组来源对应当前整理版本或当前有效文本，并不代表所有历史版本。
              </p>
              <div className="version-detail-modal__stack">
                {officialFiles.map((file) => (
                  <OfficialFileCard key={file.id} file={file} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="version-detail-modal__section">
            <h3 className="version-detail-modal__section-title">
              本站来源快照
            </h3>
            <p className="version-detail-modal__paragraph">
              本站快照用于记录采集时页面状态，仅供来源核验和防止链接失效，不替代官方正式文本。
            </p>
            {siteSnapshotFiles.length > 0 ? (
              <div className="version-detail-modal__stack">
                {siteSnapshotFiles.map((file) => (
                  <SnapshotFileCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <p className="version-detail-modal__empty">
                该版本暂无本站来源快照。
              </p>
            )}
          </section>

          <section className="version-detail-modal__section">
            <div className="version-detail-modal__section-head">
              <div>
                <h3 className="version-detail-modal__section-title">
                  外部网页存档查询
                </h3>
                <p className="version-detail-modal__paragraph">
                  该链接会跳转到 Internet Archive 查询该 URL
                  是否存在历史存档。外部存档由第三方提供，可能不存在或无法访问。
                </p>
              </div>
              {internetArchiveUrl ? (
                <a
                  href={internetArchiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="version-detail-modal__action version-detail-modal__action--secondary"
                >
                  查询 Internet Archive
                </a>
              ) : null}
            </div>
            {!internetArchiveUrl ? (
              <p className="version-detail-modal__empty">
                暂无可用于查询 Internet Archive 的来源链接。
              </p>
            ) : null}
          </section>

          {hasAuxiliaryNotes ? (
            <section className="version-detail-modal__section">
              <h3 className="version-detail-modal__section-title">
                人工备注 / AI 摘要提示
              </h3>
              {version.humanNote ? (
                <div className="version-detail-modal__note-block">
                  <h4>
                    人工备注
                  </h4>
                  <p>
                    {version.humanNote}
                  </p>
                </div>
              ) : null}
              {version.aiSummary ? (
                <div className="version-detail-modal__ai-note">
                  <h4>
                    AI 版本摘要
                  </h4>
                  <p>
                    {version.aiSummary}
                  </p>
                  <small>
                    AI 摘要仅供辅助阅读，正式引用请以官方原文为准。
                  </small>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
