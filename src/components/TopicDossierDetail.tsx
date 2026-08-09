"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { linkStatusZh } from "@/lib/display";
import type { LinkStatus, ResourceType } from "@/types";

type TopicDossierStat = {
  label: string;
  value: number;
  description: string;
};

type TopicDossierTopic = {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  plainQuestion: string;
  description: string;
  examples: string[];
  relatedKeywords: string[];
};

type TopicDossierResource = {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  resourceType: ResourceType;
  resourceTypeLabel: string;
  institutionName: string;
  summary: string;
  updatedDate: string;
  linkStatus: LinkStatus;
  hasBackup: boolean;
  sourceDomain: string;
  tags: string[];
};

type TopicDossierGroup = {
  type: ResourceType;
  label: string;
  labelEn: string;
  resources: TopicDossierResource[];
};

type TopicDossierDetailProps = {
  topic: TopicDossierTopic;
  topicIndex: number;
  stats: TopicDossierStat[];
  groups: TopicDossierGroup[];
};

const RESOURCE_PAGE_SIZE = 5;

function getGroupDescription(group?: TopicDossierGroup) {
  if (!group) {
    return "该专题下暂无已收录资料，后续扩充资料库后会在这里形成专题文件。";
  }

  if (group.type === "portal") {
    return "这类条目适合作为进一步查找官方栏目、系统入口和专题导航的起点。";
  }

  if (group.type === "law" || group.type === "regulation") {
    return "这里集中呈现制度依据、规则条文和治理框架，适合先建立研究背景。";
  }

  if (group.type === "program" || group.type === "system") {
    return "这里更侧重具体项目、运行系统和建设实践，可用于观察档案资源建设的落地方式。";
  }

  return "这里按资料类型整理相关条目，便于从同一专题下横向比较不同来源和不同文件。";
}

export function TopicDossierDetail({
  topic,
  topicIndex,
  stats,
  groups,
}: TopicDossierDetailProps) {
  const [activeType, setActiveType] = useState<ResourceType | null>(
    groups[0]?.type ?? null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [resourcePage, setResourcePage] = useState(1);

  const activeGroup = groups.find((group) => group.type === activeType) ?? groups[0];
  const allResources = useMemo(
    () => groups.flatMap((group) => group.resources),
    [groups],
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;
  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return allResources.filter((resource) =>
      [
        resource.titleZh,
        resource.titleEn,
        resource.summary,
        resource.institutionName,
        resource.resourceTypeLabel,
        resource.sourceDomain,
        ...resource.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [allResources, normalizedQuery]);
  const visibleResources = isSearching
    ? searchResults
    : activeGroup?.resources ?? [];
  const totalResourcePages = Math.max(
    1,
    Math.ceil(visibleResources.length / RESOURCE_PAGE_SIZE),
  );
  const currentResourcePage = Math.min(resourcePage, totalResourcePages);
  const firstResourceIndex = (currentResourcePage - 1) * RESOURCE_PAGE_SIZE;
  const pagedResources = visibleResources.slice(
    firstResourceIndex,
    firstResourceIndex + RESOURCE_PAGE_SIZE,
  );

  useEffect(() => {
    setResourcePage(1);
  }, [activeType, normalizedQuery]);

  useEffect(() => {
    if (resourcePage > totalResourcePages) {
      setResourcePage(totalResourcePages);
    }
  }, [resourcePage, totalResourcePages]);

  function openGroup(type: ResourceType, shouldScroll = false) {
    setActiveType(type);
    setSearchQuery("");
    setResourcePage(1);

    if (shouldScroll) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("topic-reader-book")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <main className="topic-dossier-page topic-reader-page">
      <div className="topic-dossier-shell topic-reader-shell">
        <nav aria-label="页面层级" className="topic-dossier-breadcrumb">
          <Link href="/">首页</Link>
          <span>/</span>
          <Link href="/topics">研究专题</Link>
          <span>/</span>
          <strong>{topic.titleZh}</strong>
        </nav>

        <section
          className={`topic-open-file-header topic-open-file-header--${topicIndex + 1}`}
          aria-label="已打开的专题文件"
        >
          <span className="topic-open-file-header__tab">
            FILE {String(topicIndex + 1).padStart(2, "0")}
          </span>
          <div className="topic-open-file-header__stamp">已打开专题</div>
          <div className="topic-open-file-header__copy">
            <span>OPEN RESEARCH FILE</span>
            <h1>{topic.titleZh}</h1>
            <p>{topic.plainQuestion}</p>
          </div>
          <div className="topic-open-file-header__meta" aria-label="专题概况">
            <div>
              <strong>{allResources.length}</strong>
              <span>条资料</span>
            </div>
            <div>
              <strong>{groups.length}</strong>
              <span>类文件</span>
            </div>
            <Link href="/topics">返回专题目录</Link>
          </div>
        </section>

        <section
          id="topic-reader-book"
          className="topic-reader-book"
          aria-label="专题资料阅读页"
        >
          <div className="topic-reader-book__binding" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <aside className="topic-reader-page-left">
            <div className="topic-reader-label">
              <span>TOPIC FILE</span>
              <h1>{topic.titleZh}</h1>
              <p>{topic.titleEn}</p>
            </div>

            <form
              className="topic-reader-search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="topic-dossier-search">搜索本专题资料</label>
              <div>
                <input
                  id="topic-dossier-search"
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

            <div className="topic-reader-stats" aria-label="专题统计">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                  <small>{stat.description}</small>
                </div>
              ))}
            </div>

            <div className="topic-reader-tabs" aria-label="资料类型">
              {groups.map((group, index) => (
                <button
                  key={group.type}
                  type="button"
                  className={group.type === activeGroup?.type && !isSearching ? "is-active" : ""}
                  onClick={() => openGroup(group.type)}
                >
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>{group.label}</span>
                  <small>{group.resources.length}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="topic-reader-page-right">
            <header className="topic-reader-content-head">
              <div>
                <span>{isSearching ? "SEARCH RESULT" : activeGroup?.labelEn ?? "EMPTY FILE"}</span>
                <h2>{isSearching ? "搜索结果" : activeGroup?.label ?? "暂无资料"}</h2>
                <p>
                  {isSearching
                    ? `在“${topic.titleZh}”中找到 ${searchResults.length} 条相关内容。`
                    : getGroupDescription(activeGroup)}
                </p>
              </div>
              <Link href={`/resources?topic=${topic.id}`}>查看全部资料</Link>
            </header>

            <div className="topic-reader-body">
              <section className="topic-reader-notes" aria-label="专题说明">
                <article>
                  <span>适合收录</span>
                  <div>
                    {topic.examples.map((example) => (
                      <em key={example}>{example}</em>
                    ))}
                  </div>
                </article>
                <article>
                  <span>相关关键词</span>
                  <div>
                    {topic.relatedKeywords.map((keyword) => (
                      <em key={keyword}>{keyword}</em>
                    ))}
                  </div>
                </article>
              </section>

              {visibleResources.length > 0 ? (
                <div className="topic-reader-resource-list">
                  {pagedResources.map((resource) => (
                    <Link
                      key={resource.id}
                      href={`/resources/${resource.slug}`}
                      className="topic-reader-resource"
                    >
                      <div>
                        <span>{resource.resourceTypeLabel}</span>
                        <h3>{resource.titleZh || resource.titleEn}</h3>
                        <p>{resource.summary || resource.titleEn}</p>
                      </div>
                      <aside>
                        <strong>{resource.institutionName}</strong>
                        <small>{resource.updatedDate}</small>
                        <em>{linkStatusZh[resource.linkStatus]}</em>
                      </aside>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="topic-reader-empty">
                  <strong>{isSearching ? "没有找到匹配资料" : "暂无相关资料"}</strong>
                  <p>
                    {isSearching
                      ? "可以换一个关键词，或返回左侧资料类型继续浏览。"
                      : "后续扩充资料库后，这个分类会自动显示对应条目。"}
                  </p>
                </div>
              )}
            </div>

            {visibleResources.length > 0 ? (
              <footer className="topic-reader-pager" aria-label="资料分页">
                <button
                  type="button"
                  disabled={currentResourcePage <= 1}
                  onClick={() =>
                    setResourcePage((page) => Math.max(1, page - 1))
                  }
                >
                  上一页
                </button>
                <div>
                  <strong>
                    第 {String(currentResourcePage).padStart(2, "0")} /{" "}
                    {String(totalResourcePages).padStart(2, "0")} 页
                  </strong>
                  <span>
                    本页 {firstResourceIndex + 1}-
                    {Math.min(
                      firstResourceIndex + RESOURCE_PAGE_SIZE,
                      visibleResources.length,
                    )}{" "}
                    条 · 共 {visibleResources.length} 条
                  </span>
                </div>
                <button
                  type="button"
                  disabled={currentResourcePage >= totalResourcePages}
                  onClick={() =>
                    setResourcePage((page) =>
                      Math.min(totalResourcePages, page + 1),
                    )
                  }
                >
                  下一页
                </button>
              </footer>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
