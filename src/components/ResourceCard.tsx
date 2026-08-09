import Link from "next/link";
import type { Resource } from "@/types";
import {
  getInstitutionDisplayName,
  getPrimaryTopic,
  getResourceSnapshotStatus,
} from "@/lib/data";
import {
  getPublicResourceStatusMeta,
  linkStatusBadge,
  linkStatusZh,
  resourceTypeZh,
} from "@/lib/display";

type ResourceCardProps = {
  resource: Resource;
};

export function ResourceCard({ resource }: ResourceCardProps) {
  const primaryTopic = getPrimaryTopic(resource);
  const relatedTopicCount = resource.topicIds.filter(
    (topicId) => topicId !== resource.primaryTopicId,
  ).length;
  const statusMeta = getPublicResourceStatusMeta(resource.status);
  const snapshotStatus = getResourceSnapshotStatus(resource.id);
  const displayTitle = resource.titleZh || resource.titleEn;
  const displaySummary =
    resource.summaryShort ||
    resource.summaryZh ||
    "该资料由自动采集流程导入，中文简介待补充。";
  const snapshotStatusClassName = {
    complete:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    partial:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    none: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  }[snapshotStatus.status];

  return (
    <Link
      href={`/resources/${resource.slug}`}
      className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
    >
      <article className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-700 dark:text-zinc-50 dark:group-hover:text-indigo-300">
              {displayTitle}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {resource.titleEn}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {statusMeta.showBadge ? (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                title={statusMeta.description}
              >
                {statusMeta.label}
              </span>
            ) : null}
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {resourceTypeZh[resource.resourceType]}
            </span>
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {displaySummary}
        </p>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          主专题：{primaryTopic?.titleZh ?? "未标注专题"}
          {relatedTopicCount > 0 ? ` · 另关联 ${relatedTopicCount} 个专题` : ""}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>{getInstitutionDisplayName(resource.institutionId)}</span>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 font-medium ${snapshotStatusClassName}`}
            >
              {snapshotStatus.label}
            </span>
            <span className={linkStatusBadge[resource.linkStatus]}>
              {linkStatusZh[resource.linkStatus]}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
