import type { ResourceFile, ResourceVersion } from "@/types";
import { VersionStatusBadge } from "@/components/VersionStatusBadge";

type VersionTimelineItemProps = {
  version: ResourceVersion;
  files: ResourceFile[];
  isCurrent: boolean;
  officialFileCount?: number;
  onViewDetails: () => void;
};

function isGeneratedSourcePublicationVersion(version: ResourceVersion) {
  return version.id.includes("-source-publication");
}

export function VersionTimelineItem({
  version,
  files,
  isCurrent,
  officialFileCount = 0,
  onViewDetails,
}: VersionTimelineItemProps) {
  const isGeneratedVersion = isGeneratedSourcePublicationVersion(version);

  return (
    <li className="resource-version-timeline-item">
      <span className="resource-version-timeline-item__pin" />
      <article>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isGeneratedVersion ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  当前收录版本
                </span>
              ) : (
                <VersionStatusBadge status={version.versionStatus} />
              )}
              {isCurrent && !isGeneratedVersion ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  当前版本
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">
              {version.versionTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onViewDetails}
            className="resource-version-timeline-item__button"
          >
            查看版本详情
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          {version.publishDate ? (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">发布日期</dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-50">
                {version.publishDate}
              </dd>
            </div>
          ) : null}
          {version.effectiveDate ? (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">生效日期</dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-50">
                {version.effectiveDate}
              </dd>
            </div>
          ) : null}
        </dl>

        {version.summaryZh ? (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {version.summaryZh}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {version.sourceUrl ? "有官方链接" : "暂无官方链接"}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {files.length > 0 ? "有关联备份文件" : "暂无关联备份文件"}
          </span>
          {officialFileCount > 0 ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              已关联 {officialFileCount} 个官方有效文本来源
            </span>
          ) : null}
        </div>
      </article>
    </li>
  );
}
