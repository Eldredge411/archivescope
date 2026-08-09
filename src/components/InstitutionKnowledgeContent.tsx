"use client";

import Link from "next/link";
import { useState } from "react";
import type { LinkStatus, ResourceType } from "@/types";
import { linkStatusZh, resourceTypeZh } from "@/lib/display";

type TabKey = "resources" | "topics" | "institutions" | "network";

type ResourceItem = {
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

type TopicItem = {
  topic: {
    id: string;
    slug: string;
    titleZh: string;
    titleEn: string;
    shortDescription: string;
  };
  relationSourceZh: string;
  relationStrengthZh: string;
  relationStrengthClassName: string;
  relationBasis: string;
  supportingResourceCount: number;
  representativeResources: Array<{
    id: string;
    slug: string;
    titleZh: string;
    resourceType: ResourceType;
  }>;
};

type RelatedInstitutionItem = {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  countryName: string;
  institutionType: string;
  relationLabelZh: string;
  descriptionZh: string;
};

type NetworkNode = {
  id: string;
  slug: string;
  title: string;
  relationLabelZh: string;
};

type ResourceTypeStat = {
  type: ResourceType;
  label: string;
  count: number;
};

type InstitutionKnowledgeContentProps = {
  institutionId: string;
  resources: ResourceItem[];
  topics: TopicItem[];
  relatedInstitutions: RelatedInstitutionItem[];
  resourceTypeStats: ResourceTypeStat[];
  network: {
    centerLabel: string;
    centerTitle: string;
    resources: NetworkNode[];
    topics: NetworkNode[];
    institutions: NetworkNode[];
  };
};

const tabs: Array<{ key: TabKey; label: string; id: string }> = [
  { key: "resources", label: "相关资料", id: "related-resources" },
  { key: "topics", label: "研究专题", id: "related-topics" },
  { key: "institutions", label: "相关机构", id: "related-institutions" },
  { key: "network", label: "关系网络", id: "relation-network" },
];

export function InstitutionKnowledgeContent({
  institutionId,
  resources,
  topics,
  relatedInstitutions,
  resourceTypeStats,
  network,
}: InstitutionKnowledgeContentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("resources");
  const [selectedType, setSelectedType] = useState<ResourceType | "all">("all");

  const filteredResources =
    selectedType === "all"
      ? resources
      : resources.filter((resource) => resource.resourceType === selectedType);
  const visibleResources = filteredResources.slice(0, 6);

  const activeTabId = tabs.find((tab) => tab.key === activeTab)?.id;

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
  }

  const activeTabTitle = tabs.find((tab) => tab.key === activeTab)?.label;

  return (
    <section className="institution-dossier-content">
      <div className="institution-dossier-content__shell">
        <div
          id="institution-content"
          className="institution-dossier-reader scroll-mt-24"
        >
            <div className="institution-dossier-reader__header">
              <div>
                <span>INSTITUTION VOLUMES</span>
                <h2>
                  机构关联内容
                </h2>
              </div>
              <strong>
                当前：{activeTabTitle}
              </strong>
            </div>

            <div className="institution-dossier-reader__body">
            <nav className="institution-dossier-reader__tabs" aria-label="机构关联内容分卷">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchTab(tab.key)}
                  className={activeTab === tab.key ? "is-active" : ""}
                >
                  <span>{String(tabs.indexOf(tab) + 1).padStart(2, "0")}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <div id={activeTabId} className="institution-dossier-reader__page scroll-mt-24">
              {activeTab === "resources" ? (
                <ResourcesPanel
                  institutionId={institutionId}
                  resources={resources}
                  resourceTypeStats={resourceTypeStats}
                  selectedType={selectedType}
                  setSelectedType={setSelectedType}
                  visibleResources={visibleResources}
                  filteredResources={filteredResources}
                />
              ) : null}

              {activeTab === "topics" ? (
                <TopicsPanel institutionId={institutionId} topics={topics} />
              ) : null}

              {activeTab === "institutions" ? (
                <InstitutionsPanel relatedInstitutions={relatedInstitutions} />
              ) : null}

              {activeTab === "network" ? <NetworkPanel network={network} /> : null}
            </div>
            </div>
        </div>
      </div>
    </section>
  );
}

function ResourcesPanel({
  institutionId,
  resources,
  resourceTypeStats,
  selectedType,
  setSelectedType,
  visibleResources,
  filteredResources,
}: {
  institutionId: string;
  resources: ResourceItem[];
  resourceTypeStats: ResourceTypeStat[];
  selectedType: ResourceType | "all";
  setSelectedType: (type: ResourceType | "all") => void;
  visibleResources: ResourceItem[];
  filteredResources: ResourceItem[];
}) {
  return (
    <div className="institution-volume">
      <div className="institution-volume__topline">
        <div>
          <h3>
            相关资料
          </h3>
          <p>
            汇总该机构发布、运营、管理或与其职责相关的资料。
          </p>
        </div>
        <Link
          href={`/resources?institution=${institutionId}`}
          className="institution-volume__link"
        >
          查看全部相关资料
        </Link>
      </div>

      {resources.length > 0 ? (
        <>
          <div className="institution-volume__filters">
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={selectedType === "all" ? "is-active" : ""}
            >
              全部 {resources.length}
            </button>
            {resourceTypeStats.map((filter) => (
              <button
                key={filter.type}
                type="button"
                onClick={() => setSelectedType(filter.type)}
                className={selectedType === filter.type ? "is-active" : ""}
              >
                {filter.label} {filter.count}
              </button>
            ))}
          </div>

          <div className="institution-volume__resource-list">
            {visibleResources.map((item) => (
              <article
                key={item.id}
                className="institution-volume__resource"
              >
                <div>
                  <div>
                    <Link
                      href={`/resources/${item.slug}`}
                    >
                      {item.titleZh}
                    </Link>
                    <p>
                      {item.titleEn}
                    </p>
                  </div>
                  <span>
                    {item.relationLabelZh}
                  </span>
                </div>

                <div className="institution-volume__badges">
                  <span>
                    {resourceTypeZh[item.resourceType]}
                  </span>
                  <span>
                    主专题：{item.primaryTopicTitle}
                  </span>
                  <span>
                    {linkStatusZh[item.linkStatus]}
                  </span>
                  <span>
                    {item.hasBackup ? "已备份" : "暂无备份"}
                  </span>
                </div>

                <p className="institution-volume__summary">
                  {item.summaryZh}
                </p>

                <div className="institution-volume__actions">
                  <Link
                    href={`/resources/${item.slug}`}
                  >
                    查看详情
                  </Link>
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      访问官方链接
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {filteredResources.length > visibleResources.length ? (
            <div className="institution-volume__more">
              当前筛选下还有 {filteredResources.length - visibleResources.length} 条资料未展示。
              <Link
                href={`/resources?institution=${institutionId}${
                  selectedType === "all" ? "" : `&type=${selectedType}`
                }`}
              >
                前往资料库查看全部
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <p className="institution-volume__empty">
          暂未收录该机构相关资料。后续将持续补充其政策、指南、项目和平台信息。
        </p>
      )}
    </div>
  );
}

function TopicsPanel({
  institutionId,
  topics,
}: {
  institutionId: string;
  topics: TopicItem[];
}) {
  return (
    <div className="institution-volume">
      <h3>
        研究专题
      </h3>
      <p>
        解释该机构主要涉及哪些研究专题，以及为什么相关。
      </p>
      {topics.length > 0 ? (
        <div className="institution-volume__topic-list">
          {topics.map((item) => (
            <article
              key={item.topic.id}
              className="institution-volume__topic"
            >
              <div className="institution-volume__topic-head">
                <div>
                  <h4>
                    {item.topic.titleZh}
                  </h4>
                  <p>
                    {item.topic.titleEn}
                  </p>
                </div>
                <span>
                  {item.relationStrengthZh}
                </span>
              </div>

              <p className="institution-volume__summary">
                {item.topic.shortDescription}
              </p>

              <div className="institution-volume__basis">
                <p>
                  关联依据
                </p>
                <strong>
                  {item.relationBasis}
                </strong>
                <small>
                  关联来源：{item.relationSourceZh}
                </small>
              </div>

              <div className="institution-volume__representatives">
                <p>
                  代表性资料
                </p>
                {item.representativeResources.length > 0 ? (
                  <ul>
                    {item.representativeResources.map((resource) => (
                      <li key={resource.id}>
                        <Link
                          href={`/resources/${resource.slug}`}
                        >
                          <span>
                            {resource.titleZh}
                          </span>
                          <small>
                            {resourceTypeZh[resource.resourceType]}
                          </small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    暂无代表资料。
                  </p>
                )}
                {item.supportingResourceCount > 3 ? (
                  <small>
                    另有 {item.supportingResourceCount - 3} 条相关资料
                  </small>
                ) : null}
              </div>

              <div className="institution-volume__actions">
                <Link
                  href={`/resources?institution=${institutionId}&topic=${item.topic.id}`}
                >
                  查看该机构在此专题下的资料
                </Link>
                <Link
                  href={`/topics/${item.topic.slug}`}
                >
                  查看专题
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="institution-volume__empty">
          暂未整理出该机构的相关研究专题。后续将根据收录资料和机构关系持续补充。
        </p>
      )}
    </div>
  );
}

function InstitutionsPanel({
  relatedInstitutions,
}: {
  relatedInstitutions: RelatedInstitutionItem[];
}) {
  return (
    <div className="institution-volume">
      <h3>
        相关机构
      </h3>
      {relatedInstitutions.length > 0 ? (
        <div className="institution-volume__institution-list">
          {relatedInstitutions.map((item) => (
            <article
              key={item.id}
              className="institution-volume__institution"
            >
              <div>
                <div>
                  <h4>
                    {item.nameZh}
                  </h4>
                  <p>
                    {item.nameEn} · {item.countryName}
                  </p>
                </div>
                <span>
                  {item.relationLabelZh}
                </span>
              </div>
              <p>
                {item.descriptionZh}
              </p>
              <div>
                <span>
                  {item.institutionType}
                </span>
                <Link
                  href={`/institutions/${item.slug}`}
                >
                  查看机构
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="institution-volume__empty">
          暂未整理出与该机构相关的其他机构。
        </p>
      )}
    </div>
  );
}

function NetworkPanel({
  network,
}: {
  network: InstitutionKnowledgeContentProps["network"];
}) {
  return (
    <div className="institution-volume">
      <h3>
        关系网络
      </h3>
      <p>
        以当前机构为中心，展示它与资料、专题和其他机构之间的主要关联。
      </p>
      <div className="institution-volume__network">
        <div className="institution-volume__network-center">
          <p>
            {network.centerLabel}
          </p>
          <h4>
            {network.centerTitle}
          </h4>
        </div>
        <div className="institution-volume__network-columns">
          <NetworkColumn
            title="资料节点"
            emptyText="暂无已整理的资料节点。"
            items={network.resources}
            hrefPrefix="/resources"
          />
          <NetworkColumn
            title="专题节点"
            emptyText="暂无已整理的专题节点。"
            items={network.topics}
            hrefPrefix="/topics"
          />
          <NetworkColumn
            title="机构节点"
            emptyText="暂无已整理的机构节点。"
            items={network.institutions}
            hrefPrefix="/institutions"
          />
        </div>
      </div>
    </div>
  );
}

function NetworkColumn({
  title,
  emptyText,
  items,
  hrefPrefix,
}: {
  title: string;
  emptyText: string;
  items: NetworkNode[];
  hrefPrefix: string;
}) {
  return (
    <div className="institution-volume__network-column">
      <h4>
        {title}
      </h4>
      <div>
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={`${hrefPrefix}/${item.slug}`}
            >
              <span>
                {item.relationLabelZh}
              </span>
              <p>
                {item.title}
              </p>
            </Link>
          ))
        ) : (
          <p className="institution-volume__empty">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}
