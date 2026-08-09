"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Institution, Resource, ResourceType } from "@/types";
import { linkStatusZh, resourceTypeZh } from "@/lib/display";

type InstitutionDetailModalProps = {
  institution: Institution;
  countryName?: string;
  relatedResources?: Resource[];
  onClose: () => void;
};

type RelatedResourceGroupConfig = {
  id: string;
  title: string;
  description: string;
  resourceTypes: ResourceType[];
};

const relatedResourceGroupConfigs: RelatedResourceGroupConfig[] = [
  {
    id: "portals-systems",
    title: "资源门户与系统",
    description: "目录、数据库、系统和在线入口。",
    resourceTypes: ["portal", "catalog", "database", "system"],
  },
  {
    id: "laws-regulations",
    title: "制度法规",
    description: "法律、规章和制度依据。",
    resourceTypes: ["law", "regulation"],
  },
  {
    id: "policy-guidance",
    title: "政策指南",
    description: "政策、指南和业务说明。",
    resourceTypes: ["policy", "guidance"],
  },
  {
    id: "programs-plans",
    title: "项目计划",
    description: "战略、项目和建设计划。",
    resourceTypes: ["strategy", "program"],
  },
  {
    id: "reports-review",
    title: "报告评估",
    description: "报告、评估和阶段总结。",
    resourceTypes: ["report"],
  },
];

const relatedResourcePageSize = 4;

function buildRelatedResourceGroups(resources: Resource[]) {
  const grouped = relatedResourceGroupConfigs
    .map((config) => ({
      ...config,
      resources: resources.filter((resource) =>
        config.resourceTypes.includes(resource.resourceType),
      ),
    }))
    .filter((group) => group.resources.length > 0);
  const groupedResourceIds = new Set(
    grouped.flatMap((group) => group.resources.map((resource) => resource.id)),
  );
  const otherResources = resources.filter(
    (resource) => !groupedResourceIds.has(resource.id),
  );

  if (otherResources.length > 0) {
    grouped.push({
      id: "other",
      title: "其他资料",
      description: "暂未归入主要类型的关联资料。",
      resourceTypes: [],
      resources: otherResources,
    });
  }

  return grouped;
}

export function InstitutionDetailModal({
  institution,
  countryName = "未标注国家",
  relatedResources = [],
  onClose,
}: InstitutionDetailModalProps) {
  const [showRelatedResources, setShowRelatedResources] = useState(false);
  const [selectedRelatedGroupId, setSelectedRelatedGroupId] = useState("");
  const [relatedPage, setRelatedPage] = useState(1);
  const relatedResourceGroups = useMemo(
    () => buildRelatedResourceGroups(relatedResources),
    [relatedResources],
  );
  const selectedRelatedGroup =
    relatedResourceGroups.find((group) => group.id === selectedRelatedGroupId) ??
    relatedResourceGroups[0] ??
    null;
  const relatedTotalPages = selectedRelatedGroup
    ? Math.max(
        1,
        Math.ceil(selectedRelatedGroup.resources.length / relatedResourcePageSize),
      )
    : 1;
  const safeRelatedPage = Math.min(Math.max(relatedPage, 1), relatedTotalPages);
  const visibleRelatedResources = selectedRelatedGroup
    ? selectedRelatedGroup.resources.slice(
        (safeRelatedPage - 1) * relatedResourcePageSize,
        safeRelatedPage * relatedResourcePageSize,
      )
    : [];
  const details = [
    { label: "缩写", value: institution.shortName },
    { label: "国家地区", value: countryName },
    { label: "机构大类", value: institution.institutionType },
    { label: "机构子类", value: institution.institutionSubType },
    { label: "机构层级", value: institution.institutionLevel },
    { label: "所在地", value: institution.location },
    {
      label: "成立年份",
      value: institution.establishedYear ? String(institution.establishedYear) : "",
    },
    {
      label: "官网链接",
      value: institution.officialUrl,
      href: institution.officialUrl,
    },
    { label: "最近检查", value: institution.lastCheckedAt },
  ].filter((item) => Boolean(String(item.value ?? "").trim()));

  useEffect(() => {
    const hasSelectedGroup = relatedResourceGroups.some(
      (group) => group.id === selectedRelatedGroupId,
    );

    if (!hasSelectedGroup) {
      setSelectedRelatedGroupId(relatedResourceGroups[0]?.id ?? "");
      setRelatedPage(1);
    }
  }, [relatedResourceGroups, selectedRelatedGroupId]);

  return (
    <div
      className="institution-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${institution.nameZh} 机构详情`}
    >
      <button
        type="button"
        className="institution-detail-modal__backdrop"
        aria-label="关闭机构详情"
        onClick={onClose}
      />
      <article className="institution-detail-modal__paper">
        <header className="institution-detail-modal__header">
          <div>
            <span>Institution File</span>
            <h2>{institution.nameZh}</h2>
            <p>
              {institution.nameEn}
              {institution.shortName ? ` · ${institution.shortName}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="institution-detail-modal__body">
          <section className="institution-detail-modal__summary">
            <span>简介</span>
            <p>{institution.descriptionZh}</p>
          </section>

          <section className="institution-detail-modal__grid" aria-label="机构基本信息">
            {details.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {item.value}
                  </a>
                ) : (
                  <strong>{item.value}</strong>
                )}
              </div>
            ))}
          </section>

          {institution.tags.length ? (
            <section className="institution-detail-modal__tags" aria-label="机构标签">
              {institution.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </section>
          ) : null}

          <section className="institution-detail-modal__actions">
            {institution.officialUrl ? (
              <a href={institution.officialUrl} target="_blank" rel="noreferrer">
                访问官网
              </a>
            ) : null}
            <Link href={`/institutions/${institution.slug}`}>打开完整机构页</Link>
            <button
              type="button"
              onClick={() => setShowRelatedResources((current) => !current)}
            >
              查看相关资料
            </button>
          </section>

          {showRelatedResources ? (
            <section className="institution-detail-modal__related">
              <div>
                <span>关联资料索引</span>
                <strong>{relatedResources.length} 条相关资料</strong>
              </div>
              {relatedResources.length > 0 ? (
                <>
                  <p>
                    该机构资料已按内容类型整理。先选择分类，再打开具体资料查看详情。
                  </p>
                  <div className="institution-detail-modal__related-groups">
                    {relatedResourceGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        className={
                          group.id === selectedRelatedGroup?.id ? "is-active" : ""
                        }
                        onClick={() => {
                          setSelectedRelatedGroupId(group.id);
                          setRelatedPage(1);
                        }}
                      >
                        <span>{group.title}</span>
                        <strong>{group.resources.length}</strong>
                        <small>{group.description}</small>
                      </button>
                    ))}
                  </div>

                  {selectedRelatedGroup ? (
                    <div className="institution-detail-modal__related-current">
                      <div>
                        <span>{selectedRelatedGroup.title}</span>
                        <strong>{selectedRelatedGroup.description}</strong>
                      </div>
                      <div className="institution-detail-modal__resource-list">
                        {visibleRelatedResources.map((resource) => (
                          <Link key={resource.id} href={`/resources/${resource.slug}`}>
                            <span>{resourceTypeZh[resource.resourceType]}</span>
                            <h3>{resource.titleZh || resource.titleEn}</h3>
                            <p>{resource.summaryShort || resource.summaryZh}</p>
                            <small>{resource.sourceDomain}</small>
                          </Link>
                        ))}
                      </div>
                      {relatedTotalPages > 1 ? (
                        <footer className="institution-detail-modal__related-pager">
                          <button
                            type="button"
                            disabled={safeRelatedPage <= 1}
                            onClick={() =>
                              setRelatedPage((current) => Math.max(1, current - 1))
                            }
                          >
                            上一页
                          </button>
                          <span>
                            第 {safeRelatedPage} / {relatedTotalPages} 页
                          </span>
                          <button
                            type="button"
                            disabled={safeRelatedPage >= relatedTotalPages}
                            onClick={() =>
                              setRelatedPage((current) =>
                                Math.min(relatedTotalPages, current + 1),
                              )
                            }
                          >
                            下一页
                          </button>
                        </footer>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <p>
                  当前还没有为该机构建立直接关联资料。你可以打开完整机构页查看它的机构信息和后续整理状态。
                </p>
              )}
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}
