"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InstitutionDetailModal } from "@/components/InstitutionDetailModal";
import {
  getUsStateByCode,
  getUsStateDisplayName,
  getUsStateNameZh,
  usStates,
} from "@/data/constants/usStates";
import type {
  Institution,
  InstitutionGroup,
  InstitutionTypeCode,
  Resource,
} from "@/types";

type ActiveTab = "all" | InstitutionGroup;

type InstitutionGroupMeta = {
  value: InstitutionGroup;
  label: string;
  description: string;
  emptyText: string;
  color: string;
};

type UsInstitutionNavigatorProps = {
  institutions: Institution[];
  resources: Resource[];
  countryName: string;
};

type StateFilterOption = {
  value: string;
  code: string;
  label: string;
  sortIndex: number;
};

const allValue = "all";
const usStateOrder = new Map(
  usStates.map((state, index) => [state.code, index]),
);

const groupMetas: InstitutionGroupMeta[] = [
  {
    value: "federal",
    label: "联邦机构",
    description: "国家层面的档案、文件管理、文化记忆和信息服务机构。",
    emptyText: "该分类下的机构数据正在整理中。",
    color: "#4f46e5",
  },
  {
    value: "state",
    label: "各州机构",
    description: "州级档案馆、图书馆、博物馆及公共文件管理机构。",
    emptyText: "州级档案馆、图书馆和博物馆数据正在整理中。",
    color: "#0891b2",
  },
  {
    value: "social",
    label: "社会机构",
    description: "专业协会、社会组织和行业共同体。",
    emptyText: "该分类下的机构数据正在整理中。",
    color: "#9333ea",
  },
  {
    value: "academic",
    label: "高校与研究机构",
    description: "高校、研究中心和档案学教育研究机构。",
    emptyText: "该分类下的机构数据正在整理中。",
    color: "#16a34a",
  },
  {
    value: "commercial",
    label: "商业与服务机构",
    description: "面向档案、文件管理和数字保存的商业服务机构。",
    emptyText: "该分类下的机构数据正在整理中。",
    color: "#ea580c",
  },
  {
    value: "other",
    label: "其他机构",
    description: "暂未归入上述类别的相关机构。",
    emptyText: "该分类下的机构数据正在整理中。",
    color: "#71717a",
  },
];

const tabOptions: Array<{ value: ActiveTab; label: string }> = [
  { value: "all", label: "全部" },
  ...groupMetas.map((group) => ({
    value: group.value,
    label: group.label,
  })),
];

const institutionGroupZh: Record<InstitutionGroup, string> = {
  federal: "联邦机构",
  state: "各州机构",
  social: "社会机构",
  academic: "高校与研究机构",
  commercial: "商业与服务机构",
  other: "其他机构",
};

const institutionTypeZh: Record<InstitutionTypeCode, string> = {
  archives: "档案馆",
  library: "图书馆",
  museum: "博物馆",
  association: "协会",
  government: "政府机构",
  research: "研究机构",
  company: "公司",
  nonprofit: "非营利组织",
  other: "其他",
};

const typeOptions: InstitutionTypeCode[] = [
  "archives",
  "library",
  "museum",
  "association",
  "government",
  "research",
  "company",
  "nonprofit",
  "other",
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getInstitutionGroup(institution: Institution): InstitutionGroup {
  return institution.institutionGroup ?? "other";
}

function getInstitutionTypeCode(institution: Institution): InstitutionTypeCode {
  return institution.institutionTypeCode ?? "other";
}

function getStateCode(institution: Institution) {
  return String(institution.stateCode ?? "")
    .trim()
    .toUpperCase();
}

function getStateNameEn(institution: Institution) {
  const code = getStateCode(institution);

  return (
    String(institution.stateName ?? "").trim() ||
    getUsStateByCode(code)?.nameEn ||
    ""
  );
}

function getStateNameZh(institution: Institution) {
  const code = getStateCode(institution);

  return (
    String(institution.stateNameZh ?? "").trim() ||
    getUsStateNameZh(code) ||
    ""
  );
}

function getStateDisplayNameFromParts({
  code,
  nameEn,
  nameZh,
}: {
  code?: string;
  nameEn?: string;
  nameZh?: string;
}) {
  const normalizedCode = String(code ?? "").trim().toUpperCase();
  const normalizedNameEn =
    String(nameEn ?? "").trim() || getUsStateByCode(normalizedCode)?.nameEn || "";
  const normalizedNameZh =
    String(nameZh ?? "").trim() || getUsStateNameZh(normalizedCode);
  const displayFromCode = getUsStateDisplayName(normalizedCode);

  if (normalizedNameZh && normalizedNameEn) {
    return `${normalizedNameZh} ${normalizedNameEn}`;
  }

  return normalizedNameZh || normalizedNameEn || displayFromCode || normalizedCode;
}

function getStateDisplayNameForInstitution(institution: Institution) {
  return getStateDisplayNameFromParts({
    code: getStateCode(institution),
    nameEn: getStateNameEn(institution),
    nameZh: getStateNameZh(institution),
  });
}

function getStateFilterValue(institution: Institution) {
  return (
    getStateCode(institution) ||
    getStateNameEn(institution) ||
    getStateNameZh(institution)
  );
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
}

function matchesKeyword(institution: Institution, keyword: string) {
  if (!keyword) {
    return true;
  }

  const fields = [
    institution.nameZh,
    institution.nameEn,
    institution.shortName,
    institution.institutionType,
    institution.institutionSubType,
    institution.stateNameZh,
    institution.stateName,
    institution.stateCode,
    getStateDisplayNameForInstitution(institution),
    institution.descriptionZh,
    institution.officialUrl,
    ...institution.tags,
  ];

  return fields.some((field) => normalizeText(field).includes(keyword));
}

function getGroupMeta(tab: ActiveTab) {
  return tab === "all"
    ? {
        label: "全部机构",
        description: "当前筛选条件下的美国档案相关机构。",
        emptyText: "暂无匹配机构。",
      }
    : (groupMetas.find((group) => group.value === tab) ?? {
        label: institutionGroupZh[tab],
        description: "",
        emptyText: "该分类下的机构数据正在整理中。",
      });
}

function getStateFilterOptions(institutions: Institution[]): StateFilterOption[] {
  const optionMap = new Map<string, StateFilterOption>();

  institutions.forEach((institution) => {
    const value = getStateFilterValue(institution);

    if (!value) {
      return;
    }

    const code = getStateCode(institution);
    const label = getStateDisplayNameForInstitution(institution);

    if (!optionMap.has(value)) {
      optionMap.set(value, {
        value,
        code,
        label,
        sortIndex: code ? (usStateOrder.get(code) ?? 999) : 999,
      });
    }
  });

  return Array.from(optionMap.values()).sort(
    (a, b) =>
      a.sortIndex - b.sortIndex ||
      a.label.localeCompare(b.label) ||
      a.value.localeCompare(b.value),
  );
}

function InstitutionEcologyOverview({
  total,
  groupCounts,
  activeTab,
  onSelect,
}: {
  total: number;
  groupCounts: Map<InstitutionGroup, number>;
  activeTab: ActiveTab;
  onSelect: (tab: ActiveTab) => void;
}) {
  const radius = 72;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let cumulativeRatio = 0;
  const visibleGroups = groupMetas.filter(
    (group) => (groupCounts.get(group.value) ?? 0) > 0,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            机构生态概览
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            按机构分组展示当前已收录的美国档案相关机构分布。点击图例或分类按钮可切换下方机构列表。
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            activeTab === "all"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          查看全部
        </button>
      </div>

      {total === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          美国机构数据正在整理中。
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-center">
            <div className="relative h-56 w-56">
              <svg
                viewBox="0 0 200 200"
                className="h-56 w-56"
                role="img"
                aria-label={`美国机构生态分布，共 ${total} 个机构`}
              >
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth={strokeWidth}
                  className="dark:stroke-zinc-800"
                />
                {visibleGroups.map((group) => {
                  const count = groupCounts.get(group.value) ?? 0;
                  const ratio = count / total;
                  const dashLength = ratio * circumference;
                  const dashOffset = -cumulativeRatio * circumference;

                  cumulativeRatio += ratio;

                  return (
                    <circle
                      key={group.value}
                      aria-label={`${group.label}：${count} 个机构，占 ${Math.round(
                        ratio * 100,
                      )}%`}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      role="button"
                      stroke={group.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                      strokeDashoffset={dashOffset}
                      tabIndex={0}
                      transform="rotate(-90 100 100)"
                      className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus:opacity-80"
                      onClick={() => onSelect(group.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(group.value);
                        }
                      }}
                    >
                      <title>{`${group.label}：${count} 个机构，占 ${Math.round(
                        ratio * 100,
                      )}%`}</title>
                    </circle>
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {total}
                </span>
                <span className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  个机构
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {groupMetas.map((group) => {
              const count = groupCounts.get(group.value) ?? 0;
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              const selected = activeTab === group.value;

              return (
                <button
                  key={group.value}
                  type="button"
                  onClick={() => onSelect(group.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/40"
                      : count > 0
                        ? "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: count > 0 ? group.color : "#a1a1aa" }}
                      />
                      <span
                        className={`truncate text-sm font-medium ${
                          count > 0
                            ? "text-zinc-900 dark:text-zinc-50"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {group.label}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        count > 0
                          ? "text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      count > 0
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {count > 0 ? `占 ${percentage}%` : "暂无收录"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function InstitutionCard({
  institution,
  countryName,
  onOpen,
}: {
  institution: Institution;
  countryName: string;
  onOpen: (institution: Institution) => void;
}) {
  const group = getInstitutionGroup(institution);
  const typeCode = getInstitutionTypeCode(institution);
  const visibleTags = institution.tags.slice(0, 4);
  const hiddenTagCount = Math.max(institution.tags.length - visibleTags.length, 0);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(institution)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(institution);
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900 dark:focus:ring-indigo-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {institution.nameZh}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {institution.nameEn}
          </p>
          {institution.shortName ? (
            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {institution.shortName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {institutionGroupZh[group]}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {institutionTypeZh[typeCode]}
        </span>
        {getStateFilterValue(institution) ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {getStateDisplayNameForInstitution(institution)}
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          <dt>国家</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">{countryName}</dd>
        </div>
        <div>
          <dt>机构分类</dt>
          <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
            {institution.institutionType}
          </dd>
        </div>
      </dl>

      <p
        className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
      >
        {institution.descriptionZh}
      </p>

      {visibleTags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
              +{hiddenTagCount}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {institution.officialUrl ? (
          <a
            href={institution.officialUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            访问官网
          </a>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(institution);
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          查看详情
        </button>
      </div>
    </article>
  );
}

function InstitutionGrid({
  institutions,
  countryName,
  onOpen,
}: {
  institutions: Institution[];
  countryName: string;
  onOpen: (institution: Institution) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {institutions.map((institution) => (
        <InstitutionCard
          key={institution.id}
          institution={institution}
          countryName={countryName}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function StateInstitutionList({
  institutions,
  countryName,
  onOpen,
}: {
  institutions: Institution[];
  countryName: string;
  onOpen: (institution: Institution) => void;
}) {
  const groupedByState = institutions.reduce<
    Record<
      string,
      {
        code: string;
        displayName: string;
        sortIndex: number;
        institutions: Institution[];
      }
    >
  >(
    (groups, institution) => {
      const stateKey = getStateFilterValue(institution) || "unknown";
      const code = getStateCode(institution);

      if (!groups[stateKey]) {
        groups[stateKey] = {
          code,
          displayName: getStateDisplayNameForInstitution(institution) || "州名待补充",
          sortIndex: code ? (usStateOrder.get(code) ?? 999) : 999,
          institutions: [],
        };
      }

      groups[stateKey].institutions.push(institution);

      return groups;
    },
    {},
  );
  const stateEntries = Object.values(groupedByState).sort(
    (a, b) =>
      a.sortIndex - b.sortIndex ||
      a.displayName.localeCompare(b.displayName) ||
      a.code.localeCompare(b.code),
  );

  return (
    <div className="space-y-4">
      {stateEntries.map((stateGroup) => (
        <details
          key={stateGroup.code || stateGroup.displayName}
          open
          className="group overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm dark:border-sky-950/60 dark:bg-zinc-900"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-sky-50 px-4 py-3 text-left transition hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-sm font-semibold text-white">
                {stateGroup.code || "州"}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {stateGroup.displayName}
                  {stateGroup.code ? ` · ${stateGroup.code}` : ""}
                </h3>
                <p className="mt-0.5 text-xs text-sky-700 dark:text-sky-300">
                  州级档案馆、图书馆和公共文件机构
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-sky-700 shadow-sm dark:bg-zinc-900 dark:text-sky-300">
                {stateGroup.institutions.length} 个机构
              </span>
              <span className="text-xs text-zinc-400 transition group-open:rotate-180">
                ▼
              </span>
            </div>
          </summary>
          <div className="border-t border-sky-100 p-4 dark:border-sky-950/60">
            <InstitutionGrid
              institutions={stateGroup.institutions}
              countryName={countryName}
              onOpen={onOpen}
            />
          </div>
        </details>
      ))}
    </div>
  );
}

export function UsInstitutionNavigator({
  institutions,
  resources,
  countryName,
}: UsInstitutionNavigatorProps) {
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [typeFilter, setTypeFilter] = useState(allValue);
  const [stateFilter, setStateFilter] = useState(allValue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);

  const groupCounts = useMemo(() => {
    const counts = new Map<InstitutionGroup, number>();

    groupMetas.forEach((group) => counts.set(group.value, 0));
    institutions.forEach((institution) => {
      const group = getInstitutionGroup(institution);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    });

    return counts;
  }, [institutions]);

  const filterOptions = useMemo(
    () => ({
      states: getStateFilterOptions(institutions),
    }),
    [institutions],
  );
  const showStateFilter = filterOptions.states.length > 0;

  const filteredInstitutions = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);

    return institutions.filter((institution) => {
      const group = getInstitutionGroup(institution);
      const typeCode = getInstitutionTypeCode(institution);
      const stateFilterValue = getStateFilterValue(institution);

      return (
        matchesKeyword(institution, normalizedKeyword) &&
        (activeTab === "all" || group === activeTab) &&
        (typeFilter === allValue || typeCode === typeFilter) &&
        (stateFilter === allValue || stateFilterValue === stateFilter)
      );
    });
  }, [activeTab, institutions, keyword, stateFilter, typeFilter]);

  const activeMeta = getGroupMeta(activeTab);
  const currentInstitution = filteredInstitutions[currentIndex] ?? null;
  const currentGroup = currentInstitution
    ? getInstitutionGroup(currentInstitution)
    : null;
  const currentType = currentInstitution
    ? getInstitutionTypeCode(currentInstitution)
    : null;
  const currentRelatedResources = currentInstitution
    ? resources.filter((resource) => resource.institutionId === currentInstitution.id)
    : [];
  const currentVisibleTags = currentInstitution
    ? currentInstitution.tags.slice(0, 7)
    : [];
  const currentHiddenTagCount = currentInstitution
    ? Math.max(currentInstitution.tags.length - currentVisibleTags.length, 0)
    : 0;

  useEffect(() => {
    setCurrentIndex(0);
  }, [activeTab, keyword, stateFilter, typeFilter]);

  useEffect(() => {
    if (filteredInstitutions.length === 0) {
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((index) =>
      Math.min(Math.max(index, 0), filteredInstitutions.length - 1),
    );
  }, [filteredInstitutions.length]);

  return (
    <section className="us-institution-book-page">
      <div className="us-institution-book-shell">
        <nav className="us-institution-book-breadcrumb" aria-label="页面层级">
          <Link href="/">首页</Link>
          <span>/</span>
          <Link href="/institutions">机构导航</Link>
          <span>/</span>
          <strong>{countryName}</strong>
        </nav>

        <header className="us-institution-book-hero">
          <div>
            <span>Institution Album</span>
            <h1>{countryName}档案机构</h1>
            <p>
              浏览档案馆、图书馆、协会、高校与研究机构。你可以先搜索或选择分类，再像翻阅档案页一样查看每个机构。
            </p>
          </div>
          <div className="us-institution-book-hero__stats">
            <div>
              <strong>{institutions.length}</strong>
              <span>收录机构</span>
            </div>
            <div>
              <strong>{filteredInstitutions.length}</strong>
              <span>当前结果</span>
            </div>
            <div>
              <strong>{resources.length}</strong>
              <span>关联资料</span>
            </div>
          </div>
        </header>

        <section className="us-institution-book-search" aria-label="机构检索">
          <label className="us-institution-book-search__keyword">
            <span>关键词搜索</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索中文名、英文名、缩写、简介、标签或州名"
            />
          </label>

          <label>
            <span>机构类型</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value={allValue}>全部类型</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {institutionTypeZh[type]}
                </option>
              ))}
            </select>
          </label>

          {showStateFilter ? (
            <label>
              <span>州</span>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
              >
                <option value={allValue}>全部州</option>
                {filterOptions.states.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>

        <section className="us-institution-cardbook" aria-label="机构档案">
          <aside className="us-institution-cardbook__index">
            <span>分类索引</span>
            <strong>{activeMeta.label}</strong>
            <p>{activeMeta.description}</p>
            <div className="us-institution-cardbook__tabs">
              {tabOptions.map((tab) => {
                const count =
                  tab.value === "all"
                    ? institutions.length
                    : (groupCounts.get(tab.value) ?? 0);

                return (
                  <button
                    key={tab.value}
                    type="button"
                    className={activeTab === tab.value ? "is-active" : ""}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    <span>{tab.label}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="us-institution-cardbook__stage">
            {currentInstitution && currentGroup && currentType ? (
              <>
                <div
                  key={currentInstitution.id}
                  className="us-institution-cardbook__spread"
                >
                  <article className="us-institution-cardbook__page us-institution-cardbook__page--main">
                    <div className="us-institution-cardbook__page-number">
                      {String(currentIndex + 1).padStart(2, "0")} /{" "}
                      {String(filteredInstitutions.length).padStart(2, "0")}
                    </div>
                    <div className="us-institution-cardbook__stamp">
                      {currentInstitution.shortName ||
                        currentInstitution.nameEn.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="us-institution-cardbook__eyebrow">
                      {institutionGroupZh[currentGroup]} · {institutionTypeZh[currentType]}
                    </span>
                    <h2>{currentInstitution.nameZh}</h2>
                    <p className="us-institution-cardbook__en-name">
                      {currentInstitution.nameEn}
                    </p>
                    <p className="us-institution-cardbook__summary">
                      {currentInstitution.descriptionZh}
                    </p>
                    <dl className="us-institution-cardbook__facts">
                      <div>
                        <dt>所在地</dt>
                        <dd>
                          {getStateDisplayNameForInstitution(currentInstitution) ||
                            currentInstitution.location ||
                            "待补充"}
                        </dd>
                      </div>
                      <div>
                        <dt>成立年份</dt>
                        <dd>
                          {currentInstitution.establishedYear
                            ? `${currentInstitution.establishedYear}`
                            : "待补充"}
                        </dd>
                      </div>
                      <div>
                        <dt>关联资料</dt>
                        <dd>{currentRelatedResources.length} 条</dd>
                      </div>
                    </dl>
                    <div className="us-institution-cardbook__actions">
                      <button
                        type="button"
                        onClick={() => setSelectedInstitution(currentInstitution)}
                      >
                        查看完整档案
                      </button>
                      {currentInstitution.officialUrl ? (
                        <a
                          href={currentInstitution.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          访问官网
                        </a>
                      ) : null}
                    </div>
                  </article>

                  <aside className="us-institution-cardbook__page us-institution-cardbook__page--notes">
                    <span className="us-institution-cardbook__eyebrow">Card Notes</span>
                    <h3>机构目录卡</h3>
                    <div className="us-institution-cardbook__ledger">
                      <div>
                        <span>机构大类</span>
                        <strong>{currentInstitution.institutionType}</strong>
                      </div>
                      <div>
                        <span>机构层级</span>
                        <strong>{currentInstitution.institutionLevel}</strong>
                      </div>
                      <div>
                        <span>最近检查</span>
                        <strong>{currentInstitution.lastCheckedAt || "待补充"}</strong>
                      </div>
                    </div>

                    <div className="us-institution-cardbook__tags">
                      {currentVisibleTags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                      {currentHiddenTagCount > 0 ? (
                        <span>+{currentHiddenTagCount}</span>
                      ) : null}
                    </div>

                    <div className="us-institution-cardbook__related">
                      <span>关联资料预览</span>
                      {currentRelatedResources.slice(0, 3).map((resource) => (
                        <Link key={resource.id} href={`/resources/${resource.slug}`}>
                          {resource.titleZh || resource.titleEn}
                        </Link>
                      ))}
                      {currentRelatedResources.length === 0 ? (
                        <p>暂未建立直接关联资料。</p>
                      ) : null}
                    </div>
                  </aside>
                </div>

                <footer className="us-institution-cardbook__pager">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={() =>
                      setCurrentIndex((index) => Math.max(0, index - 1))
                    }
                  >
                    上一页
                  </button>
                  <div>
                    <span>
                      第 {currentIndex + 1} 页 / 共 {filteredInstitutions.length} 页
                    </span>
                    <strong>{currentInstitution.nameZh}</strong>
                  </div>
                  <button
                    type="button"
                    disabled={currentIndex >= filteredInstitutions.length - 1}
                    onClick={() =>
                      setCurrentIndex((index) =>
                        Math.min(filteredInstitutions.length - 1, index + 1),
                      )
                    }
                  >
                    下一页
                  </button>
                </footer>
              </>
            ) : (
              <div className="us-institution-cardbook__empty">
                <span>没有找到匹配机构</span>
                <p>{activeMeta.emptyText}</p>
              </div>
            )}
          </div>
        </section>
      </div>
      {selectedInstitution ? (
        <InstitutionDetailModal
          institution={selectedInstitution}
          countryName={countryName}
          relatedResources={resources.filter(
            (resource) => resource.institutionId === selectedInstitution.id,
          )}
          onClose={() => setSelectedInstitution(null)}
        />
      ) : null}
    </section>
  );
}
