"use client";

import { useMemo, useState } from "react";
import type { ResourceOfficialFile } from "@/data/imports/us/resourceOfficialFiles";
import type { ResourceFile, ResourceVersion } from "@/types";
import { VersionDetailModal } from "@/components/VersionDetailModal";
import { VersionTimelineItem } from "@/components/VersionTimelineItem";

type VersionTimelineProps = {
  versions: ResourceVersion[];
  files: ResourceFile[];
  officialFiles?: ResourceOfficialFile[];
  currentVersionId?: string;
  versionNote?: string;
  description?: string;
};

function getVersionFiles(
  files: ResourceFile[],
  versionId: string,
  relatedFileIds?: string[],
) {
  const relatedIdSet = new Set(relatedFileIds ?? []);
  const versionFileMap = new Map<string, ResourceFile>();

  files.forEach((file) => {
    if (file.versionId === versionId || relatedIdSet.has(file.id)) {
      versionFileMap.set(file.id, file);
    }
  });

  return Array.from(versionFileMap.values());
}

function isGeneratedSourcePublicationVersion(version: ResourceVersion) {
  return version.id.includes("-source-publication");
}

function shouldShowOfficialFilesForVersion(
  version: ResourceVersion,
  currentVersionId?: string,
) {
  return (
    version.id === currentVersionId ||
    version.versionStatus === "current" ||
    isGeneratedSourcePublicationVersion(version)
  );
}

export function VersionTimeline({
  versions,
  files,
  officialFiles = [],
  currentVersionId,
  versionNote,
  description,
}: VersionTimelineProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const sortedVersions = useMemo(
    () =>
      [...versions].sort((a, b) => {
        if (a.id === currentVersionId) {
          return -1;
        }

        if (b.id === currentVersionId) {
          return 1;
        }

        return (b.publishDate ?? "").localeCompare(a.publishDate ?? "");
      }),
    [currentVersionId, versions],
  );

  const selectedVersion =
    sortedVersions.find((version) => version.id === selectedVersionId) ?? null;
  const selectedFiles = selectedVersion
    ? getVersionFiles(files, selectedVersion.id, selectedVersion.relatedFileIds)
    : [];
  const selectedOfficialFiles =
    selectedVersion &&
    shouldShowOfficialFilesForVersion(selectedVersion, currentVersionId)
      ? officialFiles
      : [];

  return (
    <article className="resource-dossier-paper-section resource-dossier-version-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            版本沿革与更新历史
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description ??
              "该模块按时间展示资料的主要版本节点。默认展示版本更迭脉络，点击具体版本可查看完整信息。"}
          </p>
          {versionNote ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {versionNote}
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {sortedVersions.length > 0 ? `${sortedVersions.length} 个版本节点` : "待整理"}
        </span>
      </div>

      {sortedVersions.length > 0 ? (
        <ol className="resource-version-timeline-strip">
          {sortedVersions.map((version) => (
            <VersionTimelineItem
              key={version.id}
              version={version}
              files={getVersionFiles(files, version.id, version.relatedFileIds)}
              isCurrent={version.id === currentVersionId}
              officialFileCount={
                shouldShowOfficialFilesForVersion(version, currentVersionId)
                  ? officialFiles.length
                  : 0
              }
              onViewDetails={() => setSelectedVersionId(version.id)}
            />
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm leading-relaxed text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          本站暂未整理该资料的历史版本。若官方页面发生更新，后续将补充版本沿革和来源快照。
        </p>
      )}

      <VersionDetailModal
        version={selectedVersion}
        files={selectedFiles}
        officialFiles={selectedOfficialFiles}
        isCurrent={selectedVersion?.id === currentVersionId}
        onClose={() => setSelectedVersionId(null)}
      />
    </article>
  );
}
