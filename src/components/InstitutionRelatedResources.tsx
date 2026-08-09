"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LinkStatus, ResourceType } from "@/types";
import {
  linkStatusBadge,
  linkStatusZh,
  resourceTypeZh,
} from "@/lib/display";

export type InstitutionRelatedResourceItem = {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  resourceType: ResourceType;
  primaryTopicTitle: string;
  summaryZh: string;
  linkStatus: LinkStatus;
  hasBackup: boolean;
  relationLabelZh: string;
  sourceUrl: string;
};

type InstitutionRelatedResourcesProps = {
  institutionId: string;
  items: InstitutionRelatedResourceItem[];
};

export function InstitutionRelatedResources({
  institutionId,
  items,
}: InstitutionRelatedResourcesProps) {
  const [selectedType, setSelectedType] = useState<ResourceType | "all">("all");

  const typeFilters = useMemo(
    () =>
      Object.entries(resourceTypeZh)
        .map(([type, label]) => ({
          type: type as ResourceType,
          label,
          count: items.filter((item) => item.resourceType === type).length,
        }))
        .filter((item) => item.count > 0),
    [items],
  );

  const filteredItems =
    selectedType === "all"
      ? items
      : items.filter((item) => item.resourceType === selectedType);
  const visibleItems = filteredItems.slice(0, 6);

  return (
    <article
      id="related-resources"
      className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            该机构相关资料
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            这里汇总该机构发布、运营、管理或与其职责相关的政策、指南、项目、平台和其他资料。
          </p>
        </div>
        <Link
          href={`/resources?institution=${institutionId}`}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          查看全部相关资料
        </Link>
      </div>

      {items.length > 0 ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedType === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              全部 {items.length}
            </button>
            {typeFilters.map((filter) => (
              <button
                key={filter.type}
                type="button"
                onClick={() => setSelectedType(filter.type)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  selectedType === filter.type
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {filter.label} {filter.count}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-zinc-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-zinc-800 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/resources/${item.slug}`}
                      className="font-semibold text-zinc-900 hover:text-indigo-700 dark:text-zinc-50 dark:hover:text-indigo-300"
                    >
                      {item.titleZh}
                    </Link>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.titleEn}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {item.relationLabelZh}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {resourceTypeZh[item.resourceType]}
                  </span>
                  <span className="rounded bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    主专题：{item.primaryTopicTitle}
                  </span>
                  <span className={linkStatusBadge[item.linkStatus]}>
                    {linkStatusZh[item.linkStatus]}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {item.hasBackup ? "已备份" : "暂无备份"}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {item.summaryZh}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/resources/${item.slug}`}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    查看详情
                  </Link>
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      访问官方链接
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {filteredItems.length > visibleItems.length ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              当前筛选下还有 {filteredItems.length - visibleItems.length} 条资料未展示。
              <Link
                href={`/resources?institution=${institutionId}${
                  selectedType === "all" ? "" : `&type=${selectedType}`
                }`}
                className="ml-2 font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                前往资料库查看全部
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          暂未收录该机构相关资料。后续将持续补充其政策、指南、项目和平台信息。
        </p>
      )}
    </article>
  );
}
