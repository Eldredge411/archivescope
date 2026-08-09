"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ResourceType } from "@/types";

export type InstitutionRelatedEntry = {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  relationLabelZh: string;
};

export type InstitutionRelatedEntryGroup = {
  type: ResourceType;
  label: string;
  items: InstitutionRelatedEntry[];
};

type InstitutionRelatedEntriesBoardProps = {
  groups: InstitutionRelatedEntryGroup[];
};

export function InstitutionRelatedEntriesBoard({
  groups,
}: InstitutionRelatedEntriesBoardProps) {
  const [selectedType, setSelectedType] = useState<ResourceType | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.type === selectedType),
    [groups, selectedType],
  );

  function handleSelectGroup(type: ResourceType) {
    setSelectedType((currentType) => (currentType === type ? null : type));
    setExpandedEntryId(null);
  }

  function toggleEntry(entryId: string) {
    setExpandedEntryId((currentEntryId) =>
      currentEntryId === entryId ? null : entryId,
    );
  }

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            相关条目
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            先按类型查看该机构关联条目的数量与名称，点击类型卡片后再展开简介。
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {groups.reduce((total, group) => total + group.items.length, 0)} 个条目
        </span>
      </div>

      {groups.length > 0 ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const isSelected = selectedGroup?.type === group.type;

              return (
                <button
                  key={group.type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectGroup(group.type)}
                  className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20 ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {group.label}
                    </h3>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-indigo-700 ring-1 ring-indigo-100 dark:bg-zinc-900 dark:text-indigo-300 dark:ring-indigo-900">
                      {group.items.length} 个
                    </span>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {group.items.slice(0, 4).map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg bg-indigo-50/70 px-3 py-2 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900/70"
                      >
                        <span className="block line-clamp-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {entry.titleZh}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">
                          {entry.titleEn}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {group.items.length > 4 ? (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      另有 {group.items.length - 4} 个条目
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedGroup ? (
            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedGroup.label}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    点击条目卡片查看简介，点击条目名称进入详情页。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType(null);
                    setExpandedEntryId(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  收起
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {selectedGroup.items.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;

                  return (
                    <article
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleEntry(entry.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleEntry(entry.id);
                        }
                      }}
                      className="rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 rounded-lg bg-indigo-50/70 px-3 py-2 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900/70">
                          <Link
                            href={`/resources/${entry.slug}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block line-clamp-1 font-semibold text-zinc-900 hover:text-indigo-700 dark:text-zinc-50 dark:hover:text-indigo-300"
                          >
                            {entry.titleZh}
                          </Link>
                          <p className="mt-1 line-clamp-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">
                            {entry.titleEn}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {entry.relationLabelZh}
                        </span>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {entry.summaryZh}
                          </p>
                          <Link
                            href={`/resources/${entry.slug}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                          >
                            进入条目详情
                          </Link>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                          点击卡片查看简介
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              请选择上方类型卡片查看对应条目的简介。
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          暂无该机构相关条目。
        </p>
      )}
    </article>
  );
}
