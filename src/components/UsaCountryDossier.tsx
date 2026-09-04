"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InstitutionDetailModal } from "@/components/InstitutionDetailModal";
import type { Country, Institution, Resource, Topic } from "@/types";
import { linkStatusZh, resourceTypeZh } from "@/lib/display";

type UsaCountryDossierProps = {
  country: Country;
  institutions: Institution[];
  resources: Resource[];
  topics: Topic[];
};

type DossierSectionId =
  | "overview"
  | "institutions"
  | "topics"
  | "resources"
  | "snapshots";

type DossierSection = {
  id: DossierSectionId;
  index: string;
  title: string;
  eyebrow: string;
  description: string;
  count: number;
};

type PaginatedSectionId = "institutions" | "resources" | "snapshots";

type CountryTopicGroup = {
  id: string;
  index: string;
  title: string;
  description: string;
  resourceTypes: Resource["resourceType"][];
  resources: Resource[];
  href: string;
};

type CountrySearchHit = {
  id: string;
  kind: string;
  title: string;
  description: string;
  href: string;
  meta: string;
};

const dossierSectionIds: DossierSectionId[] = [
  "overview",
  "institutions",
  "topics",
  "resources",
  "snapshots",
];

const listPageSizes: Record<PaginatedSectionId, number> = {
  institutions: 6,
  resources: 6,
  snapshots: 5,
};

const countryTopicConfigs: Array<
  Omit<CountryTopicGroup, "index" | "resources" | "href">
> = [
  {
    id: "resource-portals",
    title: "资源门户",
    description: "在线入口、目录、数据库与检索系统，帮助用户直接进入具体资源。",
    resourceTypes: ["portal", "catalog", "database", "system"],
  },
  {
    id: "laws-regulations",
    title: "法律法规",
    description: "法律、规章和制度文本，呈现美国档案治理的基础规范。",
    resourceTypes: ["law", "regulation"],
  },
  {
    id: "policy-guidance",
    title: "政策指南",
    description: "政策说明、业务指南和操作手册，解释档案管理如何具体执行。",
    resourceTypes: ["policy", "guidance"],
  },
  {
    id: "programs-plans",
    title: "项目计划",
    description: "战略规划、数字保存项目和档案数据建设计划。",
    resourceTypes: ["strategy", "program"],
  },
  {
    id: "reports-review",
    title: "报告评估",
    description: "评估报告、阶段总结与研究材料，用于观察建设成效和问题。",
    resourceTypes: ["report"],
  },
];

function isDossierSectionId(value: string | null): value is DossierSectionId {
  return dossierSectionIds.includes(value as DossierSectionId);
}

function isPaginatedSectionId(
  sectionId: DossierSectionId | null,
): sectionId is PaginatedSectionId {
  return (
    sectionId === "institutions" ||
    sectionId === "resources" ||
    sectionId === "snapshots"
  );
}

function readDossierStateFromUrl() {
  if (typeof window === "undefined") {
    return { sectionId: null, page: 1 };
  }

  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");
  const page = Number.parseInt(params.get("page") ?? "1", 10);

  return {
    sectionId: isDossierSectionId(file) ? file : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function writeSectionToUrl(
  sectionId: DossierSectionId | null,
  method: "push" | "replace",
  page = 1,
) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (sectionId) {
    url.searchParams.set("file", sectionId);
  } else {
    url.searchParams.delete("file");
  }

  if (sectionId && isPaginatedSectionId(sectionId) && page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const writer = method === "push" ? window.history.pushState : window.history.replaceState;

  writer.call(window.history, {}, "", nextUrl);
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    totalItems: items.length,
    items: items.slice(startIndex, startIndex + pageSize),
  };
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}"'“”‘’.,，。:：;；/\\|_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function countByResourceType(resources: Resource[]) {
  return resources.reduce<Record<string, number>>((acc, resource) => {
    acc[resource.resourceType] = (acc[resource.resourceType] ?? 0) + 1;
    return acc;
  }, {});
}

function buildCountryTopicGroups(resources: Resource[]) {
  return countryTopicConfigs
    .map((config, index) => {
      const groupResources = resources.filter((resource) =>
        config.resourceTypes.includes(resource.resourceType),
      );
      const firstType = config.resourceTypes[0];
      const href = firstType
        ? `/resources?country=usa&type=${firstType}`
        : "/resources?country=usa";

      return {
        ...config,
        index: String(index + 1).padStart(2, "0"),
        resources: groupResources,
        href,
      };
    })
    .filter((group) => group.resources.length > 0);
}

function pickFeaturedResources(resources: Resource[]) {
  return [...resources]
    .sort((a, b) => {
      const backupScore = Number(b.hasBackup) - Number(a.hasBackup);

      if (backupScore !== 0) {
        return backupScore;
      }

      return (b.summaryZh?.length ?? 0) - (a.summaryZh?.length ?? 0);
    });
}

function buildSearchHits({
  resources,
  institutions,
  topicGroups,
}: {
  resources: Resource[];
  institutions: Institution[];
  topicGroups: CountryTopicGroup[];
}) {
  const resourceHits = resources.map<CountrySearchHit>((resource) => ({
    id: `resource-${resource.id}`,
    kind: "资料",
    title: resource.titleZh || resource.titleEn,
    description: resource.summaryShort || resource.summaryZh || resource.titleEn,
    href: `/resources/${resource.slug}`,
    meta: `${resourceTypeZh[resource.resourceType]} · ${resource.sourceDomain}`,
  }));
  const institutionHits = institutions.map<CountrySearchHit>((institution) => ({
    id: `institution-${institution.id}`,
    kind: "机构",
    title: institution.nameZh || institution.nameEn,
    description: institution.descriptionZh || institution.nameEn,
    href: `/institutions/${institution.slug}`,
    meta: institution.shortName || institution.institutionType,
  }));
  const topicHits = topicGroups.map<CountrySearchHit>((group) => ({
    id: `topic-${group.id}`,
    kind: "分类",
    title: group.title,
    description: group.description,
    href: group.href,
    meta: `${group.resources.length} 条资料`,
  }));

  return [...topicHits, ...resourceHits, ...institutionHits];
}

function filterSearchHits(hits: CountrySearchHit[], query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return [];
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return hits
    .filter((hit) => {
      const text = normalizeSearch(
        [hit.kind, hit.title, hit.description, hit.meta].join(" "),
      );

      return queryTokens.every((token) => text.includes(token));
    })
    .slice(0, 28);
}

export function UsaCountryDossier({
  country,
  institutions,
  resources,
  topics,
}: UsaCountryDossierProps) {
  const [activeSection, setActiveSection] =
    useState<DossierSectionId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageBySection, setPageBySection] = useState<
    Partial<Record<PaginatedSectionId, number>>
  >({});
  const typeCounts = useMemo(() => countByResourceType(resources), [resources]);
  const featuredResources = useMemo(
    () => pickFeaturedResources(resources),
    [resources],
  );
  const backedUpResources = resources.filter((resource) => resource.hasBackup);
  const institutionPage = paginateItems(
    institutions,
    pageBySection.institutions ?? 1,
    listPageSizes.institutions,
  );
  const resourcePage = paginateItems(
    featuredResources,
    pageBySection.resources ?? 1,
    listPageSizes.resources,
  );
  const snapshotPage = paginateItems(
    backedUpResources,
    pageBySection.snapshots ?? 1,
    listPageSizes.snapshots,
  );
  const countryTopicGroups = useMemo(
    () => buildCountryTopicGroups(resources),
    [resources],
  );
  const searchHits = useMemo(
    () =>
      buildSearchHits({
        resources,
        institutions,
        topicGroups: countryTopicGroups,
      }),
    [countryTopicGroups, institutions, resources],
  );
  const searchResults = useMemo(
    () => filterSearchHits(searchHits, searchQuery),
    [searchHits, searchQuery],
  );
  const isSearching = normalizeSearch(searchQuery).length > 0;
  const sections: DossierSection[] = [
    {
      id: "overview",
      index: "01",
      title: "国家概览",
      eyebrow: "Country File",
      description: "美国档案资源建设的总体收录情况、资料类型与入口。",
      count: resources.length,
    },
    {
      id: "institutions",
      index: "02",
      title: "机构网络",
      eyebrow: "Institutions",
      description: "国家档案机构、图书馆、协会与相关研究组织。",
      count: institutions.length,
    },
    {
      id: "topics",
      index: "03",
      title: "研究专题",
      eyebrow: "Topics",
      description: "按资源门户、法律法规、政策指南、项目计划等直观类型组织。",
      count: countryTopicGroups.length,
    },
    {
      id: "resources",
      index: "04",
      title: "资料目录",
      eyebrow: "Resources",
      description: "法规、政策、指南、项目、目录与系统等核心资料。",
      count: resources.length,
    },
    {
      id: "snapshots",
      index: "05",
      title: "保存快照",
      eyebrow: "Snapshots",
      description: "已保存来源快照与可追溯资料的覆盖情况。",
      count: backedUpResources.length,
    },
  ];
  const selectedIndex = sections.findIndex(
    (section) => section.id === activeSection,
  );
  const selectedSection =
    selectedIndex >= 0 ? sections[selectedIndex] : null;
  const openSection = (sectionId: DossierSectionId) => {
    writeSectionToUrl(sectionId, "push", 1);
    setActiveSection(sectionId);
    if (isPaginatedSectionId(sectionId)) {
      setPageBySection((current) => ({ ...current, [sectionId]: 1 }));
    }
    setSearchQuery("");
  };
  const closeSection = () => {
    writeSectionToUrl(null, "replace");
    setActiveSection(null);
    setSearchQuery("");
  };
  const getActivePagination = () => {
    if (!selectedSection || !isPaginatedSectionId(selectedSection.id)) {
      return null;
    }

    if (selectedSection.id === "institutions") {
      return {
        sectionId: selectedSection.id,
        label: "个机构",
        ...institutionPage,
      };
    }

    if (selectedSection.id === "resources") {
      return {
        sectionId: selectedSection.id,
        label: "条资料",
        ...resourcePage,
      };
    }

    return {
      sectionId: selectedSection.id,
      label: "条快照",
      ...snapshotPage,
    };
  };
  const activePagination = getActivePagination();
  const moveListPage = (direction: -1 | 1) => {
    if (!activePagination) {
      return;
    }

    const nextPage = Math.min(
      activePagination.totalPages,
      Math.max(1, activePagination.page + direction),
    );

    setPageBySection((current) => ({
      ...current,
      [activePagination.sectionId]: nextPage,
    }));
    writeSectionToUrl(activePagination.sectionId, "push", nextPage);
  };

  useEffect(() => {
    const syncSection = () => {
      const { sectionId, page } = readDossierStateFromUrl();

      setActiveSection(sectionId);
      if (isPaginatedSectionId(sectionId)) {
        setPageBySection((current) => ({ ...current, [sectionId]: page }));
      }
      setSearchQuery("");
    };

    syncSection();
    window.addEventListener("popstate", syncSection);

    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  return (
    <main className="country-dossier-page">
      <section className="country-dossier-hero">
        <div className="country-dossier-hero__copy">
          <span>United States Archive File</span>
          <h1>{country.nameZh}档案知识板块</h1>
          <p>{country.descriptionZh}</p>
        </div>
        <div className="country-dossier-hero__stamp">
          <strong>{resources.length}</strong>
          <span>收录资料</span>
        </div>
      </section>

      <section className="country-dossier-cover-stage" aria-label="美国档案袋封面">
        <div className="country-dossier-cover-shadow" aria-hidden="true" />
        <div className="country-dossier-cover-shell">
          <div className="country-dossier-cord" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <article className="country-dossier-cover">
            <div className="country-dossier-cover__topline">
              <span>ARCHIVESCOPE</span>
              <span>COUNTRY DOSSIER / USA</span>
            </div>

            <div className="country-dossier-cover__plate">
              <div>
                <small>国家档案袋</small>
                <strong>{country.nameZh}</strong>
              </div>
              <div>
                <small>Country</small>
                <strong>{country.nameEn}</strong>
              </div>
              <div>
                <small>Resources</small>
                <strong>{resources.length}</strong>
              </div>
            </div>

            <p className="country-dossier-cover__note">
              本档案袋汇集美国档案数据资源建设中的机构、专题、法规政策、项目资料与来源快照。
            </p>

            <div className="country-dossier-cover__directory">
              <span>袋内目录</span>
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => openSection(section.id)}
                >
                  <b>{section.index}</b>
                  <strong>{section.title}</strong>
                  <small>{section.count}</small>
                </button>
              ))}
            </div>

            <div className="country-dossier-cover__handwriting" aria-hidden="true">
              verified archive index / open selected file
            </div>
          </article>
        </div>
      </section>

      {selectedSection ? (
        <div className="country-dossier-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="country-dossier-modal__backdrop"
            aria-label="关闭"
            onClick={closeSection}
          />
          <article className="country-dossier-reader">
            <div className="country-dossier-reader__binding" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <aside className="country-dossier-reader__page country-dossier-reader__page--left">
              <div className="country-dossier-reader__label">
                <span>FILE CONTENTS</span>
                <h2>{country.nameZh}</h2>
                <p>{country.nameEn}</p>
              </div>
              <form
                className="country-dossier-search"
                onSubmit={(event) => event.preventDefault()}
              >
                <label htmlFor="usa-dossier-search">搜索美国专题内容</label>
                <div>
                  <input
                    id="usa-dossier-search"
                    type="search"
                    value={searchQuery}
                    placeholder="输入法规、项目、机构或关键词"
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                  {searchQuery ? (
                    <button type="button" onClick={() => setSearchQuery("")}>
                      清空
                    </button>
                  ) : null}
                </div>
              </form>
              <div className="country-dossier-reader__tabs">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={section.id === selectedSection.id ? "is-active" : ""}
                    onClick={() => openSection(section.id)}
                  >
                    <b>{section.index}</b>
                    <span>{section.title}</span>
                    <small>{section.count}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="country-dossier-reader__page country-dossier-reader__page--right">
              <header className="country-dossier-modal__header">
                <div>
                  <span>{isSearching ? "Search" : selectedSection.eyebrow}</span>
                  <h2>{isSearching ? "搜索结果" : selectedSection.title}</h2>
                  <p>
                    {isSearching
                      ? `在美国档案袋中找到 ${searchResults.length} 条相关内容。`
                      : selectedSection.description}
                  </p>
                </div>
                <button type="button" onClick={closeSection}>
                  关闭
                </button>
              </header>

              <div className="country-dossier-modal__body">
                {isSearching ? (
                  <SearchResultsPanel
                    query={searchQuery}
                    results={searchResults}
                  />
                ) : null}

                {!isSearching && selectedSection.id === "overview" ? (
                  <OverviewPanel
                    resources={resources}
                    institutions={institutions}
                    topicCount={countryTopicGroups.length}
                    typeCounts={typeCounts}
                  />
                ) : null}

                {!isSearching && selectedSection.id === "institutions" ? (
                  <InstitutionsPanel
                    institutions={institutionPage.items}
                    countryName={country.nameZh}
                    resources={resources}
                  />
                ) : null}

                {!isSearching && selectedSection.id === "topics" ? (
                  <TopicsPanel groups={countryTopicGroups} />
                ) : null}

                {!isSearching && selectedSection.id === "resources" ? (
                  <ResourcesPanel resources={resourcePage.items} />
                ) : null}

                {!isSearching && selectedSection.id === "snapshots" ? (
                  <SnapshotsPanel
                    resources={resources}
                    backedUpResources={snapshotPage.items}
                  />
                ) : null}
              </div>

              <footer className="country-dossier-reader__footer">
                {isSearching ? (
                  <>
                    <button type="button" onClick={() => setSearchQuery("")}>
                      返回当前卷
                    </button>
                    <span>{searchResults.length} 条结果</span>
                  </>
                ) : activePagination ? (
                  <>
                    <button
                      type="button"
                      disabled={activePagination.page <= 1}
                      onClick={() => moveListPage(-1)}
                    >
                      上一页
                    </button>
                    <span>
                      第 {activePagination.page} / {activePagination.totalPages} 页 · 共{" "}
                      {activePagination.totalItems} {activePagination.label}
                    </span>
                    <button
                      type="button"
                      disabled={activePagination.page >= activePagination.totalPages}
                      onClick={() => moveListPage(1)}
                    >
                      下一页
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={closeSection}>
                      返回档案袋
                    </button>
                    <span>{selectedSection.title}</span>
                  </>
                )}
              </footer>
            </section>
          </article>
        </div>
      ) : null}
    </main>
  );
}

function OverviewPanel({
  resources,
  institutions,
  topicCount,
  typeCounts,
}: {
  resources: Resource[];
  institutions: Institution[];
  topicCount: number;
  typeCounts: Record<string, number>;
}) {
  const overviewStats = [
    ["收录资料", resources.length],
    ["相关机构", institutions.length],
    ["专题分类", topicCount],
    ["来源快照", resources.filter((resource) => resource.hasBackup).length],
  ];

  return (
    <div className="country-dossier-overview">
      <div className="country-dossier-stat-grid">
        {overviewStats.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="country-dossier-type-ledger">
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type}>
            <span>{resourceTypeZh[type as keyof typeof resourceTypeZh] ?? type}</span>
            <b>{count}</b>
          </div>
        ))}
      </div>
      <div className="country-dossier-actions">
        <Link href="/resources?country=usa">进入美国资料库</Link>
        <Link href="/institutions?country=usa">查看美国机构</Link>
      </div>
    </div>
  );
}

function InstitutionsPanel({
  institutions,
  countryName,
  resources,
}: {
  institutions: Institution[];
  countryName: string;
  resources: Resource[];
}) {
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);

  return (
    <>
      <div className="country-dossier-list">
        {institutions.map((institution) => (
          <button
            key={institution.id}
            type="button"
            className="country-dossier-list__institution"
            onClick={() => setSelectedInstitution(institution)}
          >
            <div>
              <span>{institution.shortName}</span>
              <h3>{institution.nameZh}</h3>
              <p>{institution.nameEn}</p>
            </div>
            <p>{institution.descriptionZh}</p>
            <div>
              <small>{institution.institutionType}</small>
              <small>
                {institution.linkStatus
                  ? linkStatusZh[institution.linkStatus]
                  : "未知"}
              </small>
            </div>
          </button>
        ))}
        <Link href="/institutions/usa" className="country-dossier-more">
          打开完整机构导航
        </Link>
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
    </>
  );
}

function TopicsPanel({ groups }: { groups: CountryTopicGroup[] }) {
  return (
    <div className="country-dossier-topic-grid">
      {groups.map((group) => (
        <Link key={group.id} href={group.href}>
          <span>{group.index}</span>
          <h3>{group.title}</h3>
          <p>{group.description}</p>
          <small>{group.resources.length} 条资料</small>
        </Link>
      ))}
    </div>
  );
}

function SearchResultsPanel({
  query,
  results,
}: {
  query: string;
  results: CountrySearchHit[];
}) {
  if (results.length === 0) {
    return (
      <div className="country-dossier-empty">
        <strong>没有找到匹配内容</strong>
        <p>可以换一个关键词，例如“电子文件”“隐私法”“NARA”或“开放数据”。</p>
      </div>
    );
  }

  return (
    <div className="country-dossier-search-results">
      <p>关键词：{query}</p>
      {results.map((result) => (
        <Link key={result.id} href={result.href}>
          <span>{result.kind}</span>
          <h3>{result.title}</h3>
          <p>{result.description}</p>
          <small>{result.meta}</small>
        </Link>
      ))}
    </div>
  );
}

function ResourcesPanel({ resources }: { resources: Resource[] }) {
  return (
    <div className="country-dossier-resource-list">
      {resources.map((resource) => (
        <Link key={resource.id} href={`/resources/${resource.slug}`}>
          <span>{resourceTypeZh[resource.resourceType]}</span>
          <h3>{resource.titleZh || resource.titleEn}</h3>
          <p>{resource.summaryShort || resource.summaryZh}</p>
          <small>{resource.sourceDomain}</small>
        </Link>
      ))}
      <Link href="/resources?country=usa" className="country-dossier-more">
        查看全部资料
      </Link>
    </div>
  );
}

function SnapshotsPanel({
  resources,
  backedUpResources,
}: {
  resources: Resource[];
  backedUpResources: Resource[];
}) {
  const backupRate =
    resources.length > 0
      ? Math.round((backedUpResources.length / resources.length) * 100)
      : 0;

  return (
    <div className="country-dossier-snapshot-panel">
      <div>
        <strong>{backupRate}%</strong>
        <span>资料已保存来源快照</span>
      </div>
      <div className="country-dossier-resource-list">
        {backedUpResources.slice(0, 8).map((resource) => (
          <Link key={resource.id} href={`/resources/${resource.slug}`}>
            <span>已保存</span>
            <h3>{resource.titleZh || resource.titleEn}</h3>
            <p>{resource.summaryShort || resource.summaryZh}</p>
            <small>{resource.sourceDomain}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
