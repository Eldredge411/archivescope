"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type {
  AtlasGraphEdge,
  AtlasGraphEdgeType,
} from "@/lib/atlas/atlasGraph";
import type {
  Institution,
  Resource,
  ResourceFile,
  ResourceVersion,
} from "@/types";

type KnowledgeEvidenceDrawerProps = {
  edge: AtlasGraphEdge;
  resources: Resource[];
  institutions: Institution[];
  resourceFiles: ResourceFile[];
  resourceVersions: ResourceVersion[];
  onClose: () => void;
};

const relationLabels: Record<AtlasGraphEdgeType, string> = {
  AUTHORIZE: "AUTHORIZE 授权",
  AMEND: "AMEND 修订",
  SUPERSEDE: "SUPERSEDE 取代",
  ISSUED_BY: "ISSUED_BY 发布",
  OPERATED_BY: "OPERATED_BY 运营",
  INFERRED: "INFERRED 研究线索",
};

function getResource(resources: Resource[], id: string) {
  return resources.find((resource) => resource.id === id);
}

function getInstitution(institutions: Institution[], id: string) {
  return institutions.find((institution) => institution.id === id);
}

function getEntityLabel(
  id: string,
  resources: Resource[],
  institutions: Institution[],
) {
  const resource = getResource(resources, id);

  if (resource) {
    return `${resource.titleEn || "Title not recorded"} / ${
      resource.titleZh || "中文标题待补充"
    }`;
  }

  const institution = getInstitution(institutions, id);

  if (institution) {
    return `${institution.nameEn || "Institution not recorded"} / ${
      institution.nameZh || "机构名称待补充"
    }`;
  }

  return "未记录节点";
}

function getLinkStatus(resource: Resource) {
  if (resource.linkStatus === "ok") {
    return { label: "链接正常 ✓", className: "is-ok" };
  }

  if (resource.linkStatus === "redirect") {
    return { label: "链接跳转 ✓", className: "is-ok" };
  }

  if (resource.linkStatus === "broken") {
    return { label: "已失效 ✗", className: "is-broken" };
  }

  return { label: "待核验 ○", className: "is-unknown" };
}

function getSnapshotFile(files: ResourceFile[], resourceId: string) {
  return files.find(
    (file) =>
      file.resourceId === resourceId &&
      file.fileType === "screenshot" &&
      file.visibility === "public",
  );
}

function truncateSummary(resource: Resource) {
  const summary = resource.summaryShort || resource.summaryZh;

  if (!summary) {
    return "该资料摘要待补充。";
  }

  return summary.length > 80 ? `${summary.slice(0, 80)}…` : summary;
}

function getVersionDate(version: ResourceVersion) {
  return version.effectiveDate || version.publishDate || "";
}

export function KnowledgeEvidenceDrawer({
  edge,
  resources,
  institutions,
  resourceFiles,
  resourceVersions,
  onClose,
}: KnowledgeEvidenceDrawerProps) {
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [leadNote, setLeadNote] = useState("");
  const [isLeadPrepared, setIsLeadPrepared] = useState(false);
  const evidenceResources = edge.evidenceResourceIds
    .map((resourceId) => getResource(resources, resourceId))
    .filter((resource): resource is Resource => Boolean(resource));
  const versionResourceIds = Array.from(
    new Set([edge.source, edge.target, ...edge.evidenceResourceIds]),
  );
  const versionResources = versionResourceIds
    .map((resourceId) => getResource(resources, resourceId))
    .filter((resource): resource is Resource => Boolean(resource));
  const datedVersions: ResourceVersion[] = [];
  let undatedVersionCount = 0;

  versionResources.forEach((resource) => {
    resourceVersions
      .filter((version) => version.resourceId === resource.id)
      .forEach((version) => {
        const versionDate = getVersionDate(version);

        if (versionDate && version.versionStatus !== "unknown") {
          datedVersions.push(version);
        } else if (version.versionStatus === "unknown" || !versionDate) {
          undatedVersionCount += 1;
        }
      });
  });

  const mailtoHref = `mailto:liangjiayu1223@ruc.edu.cn?subject=${encodeURIComponent(
    `Atlas lead: ${edge.id}`,
  )}&body=${encodeURIComponent(
    `关系 ID：${edge.id}\n\n意见：\n${leadNote}`,
  )}`;

  return (
    <aside
      className="atlas-evidence-drawer"
      role="dialog"
      aria-modal="false"
      aria-label="证据链面板"
    >
      <header>
        <div>
          <span>EVIDENCE / 证据链</span>
          <b>{edge.id}</b>
        </div>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </header>

      <section className="atlas-evidence-drawer__statement">
        <p>
          【{getEntityLabel(edge.source, resources, institutions)}】—
          {relationLabels[edge.type]}→【
          {getEntityLabel(edge.target, resources, institutions)}】
        </p>
      </section>

      <section className="atlas-evidence-drawer__status">
        <span
          className={`atlas-evidence-stamp ${
            edge.status === "verified" ? "is-verified" : "is-pending"
          }`}
        >
          {edge.status === "verified" ? "VERIFIED" : "PENDING REVIEW 待审校"}
        </span>
        {edge.status === "inferred" ? (
          <small>
            此为系统基于专题与时间推断的研究线索，不构成制度因果断言。
          </small>
        ) : null}
      </section>

      <section className="atlas-evidence-drawer__body">
        <h3>依据资料</h3>
        {evidenceResources.length > 0 ? (
          <ul>
            {evidenceResources.map((resource) => {
              const snapshotFile = getSnapshotFile(resourceFiles, resource.id);
              const linkStatus = getLinkStatus(resource);

              return (
                <li key={resource.id}>
                  <Link href={`/resources/${resource.slug}`} className="is-card">
                    <div className="atlas-evidence-snapshot">
                      {snapshotFile ? (
                        <Image
                          src={snapshotFile.fileUrl}
                          alt={`${resource.titleZh || resource.titleEn}网页快照`}
                          fill
                          sizes="180px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <span>网页快照缩略图未保存</span>
                      )}
                    </div>
                    <div>
                      <b>AS / {resource.id}</b>
                      <h4>{resource.titleZh || resource.titleEn}</h4>
                      <p>{truncateSummary(resource)}</p>
                      <dl>
                        <div>
                          <dt>官方链接状态</dt>
                          <dd className={linkStatus.className}>
                            {linkStatus.label}
                          </dd>
                        </div>
                        <div>
                          <dt>网页快照</dt>
                          <dd>
                            {resource.archivedUrl || snapshotFile
                              ? "已保存"
                              : "未保存"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>该关系尚未关联可展示的依据资料。</p>
        )}

        {edge.type === "AMEND" || edge.type === "SUPERSEDE" ? (
          <div className="atlas-evidence-versions">
            <h3>版本链</h3>
            {datedVersions.length > 0 ? (
              <ol>
                {datedVersions.map((version) => (
                  <li key={version.id}>
                    <b>{getVersionDate(version)}</b>
                    <span>{version.versionStatus}</span>
                    <h4>{version.versionTitle}</h4>
                    {version.keyChanges.length > 0 ? (
                      <p>{version.keyChanges[0]}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p>该关系暂无可列入的明确时间版本节点。</p>
            )}
            {undatedVersionCount > 0 ? (
              <small>
                另有 {undatedVersionCount} 个版本因时间不明或状态未知未列入。
              </small>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer>
        <button
          type="button"
          onClick={() => setIsLeadFormOpen((current) => !current)}
        >
          提交线索 SUBMIT A LEAD
        </button>

        {isLeadFormOpen ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setIsLeadPrepared(true);
            }}
          >
            <label>
              关系 ID
              <input value={edge.id} readOnly />
            </label>
            <label>
              意见
              <textarea
                value={leadNote}
                onChange={(event) => setLeadNote(event.target.value)}
                placeholder="请说明这条关系的证据、误判或补充线索。"
                required
              />
            </label>
            <button type="submit">生成邮件草稿</button>
            {isLeadPrepared ? (
              <a href={mailtoHref}>发送意见邮件</a>
            ) : null}
          </form>
        ) : null}
      </footer>
    </aside>
  );
}
