import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { resourceOfficialFiles } from "@/data/imports/us/resourceOfficialFiles";
import { institutions, resources, topics } from "@/data/mockData";
import { getResourceFiles, getResourceSnapshotStatus } from "@/lib/data";
import {
  getResourceStatusMeta,
  linkStatusZh,
  resourceTypeZh,
  visibilityZh,
} from "@/lib/display";
import type { LinkStatus, Resource, ResourceFileType, ResourceStatus } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "资料后台编辑 | ArchiveScope",
  description: "查看单条资料的后台维护状态，并进入 AI 草稿审核、质量审计和前台核验流程。",
};

type AdminResourcesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type EnrichmentDraftStatus = {
  resourceId: string;
  titleZh: string;
  reviewStatus: string;
  updatedAt: string;
};

type AgentLogSummary = {
  resourceId: string;
  finalStatus: string;
  issueTags: string[];
  recommendedActions: string[];
  checkedAt: string;
};

type CurationDecisionSummary = {
  resourceId: string;
  decision: string;
  hiddenFromLibrary: boolean;
  reason: string;
  reviewedAt: string;
};

const enrichmentDraftsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const agentLogsPath = join(
  process.cwd(),
  "src/data/admin/resourceQualityAgentLogs.json",
);
const curationDecisionsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceCurationDecisions.json",
);

const draftStatusLabels: Record<string, string> = {
  pending: "待审核",
  accepted: "已接受",
  applied: "已应用",
  rejected: "已拒绝",
  needs_revision: "需修改",
};

const agentStatusLabels: Record<string, string> = {
  passed: "已通过",
  needs_enrichment: "需补全内容",
  needs_classification_review: "需分类复核",
  needs_snapshot: "缺少快照",
  needs_official_file: "缺少官方文件",
  needs_version_review: "需版本复核",
  suspect_low_relevance: "疑似低价值",
  needs_human_review: "需人工复核",
};

const curationDecisionLabels: Record<string, string> = {
  keep: "保留",
  needs_enrichment: "需完善",
  needs_review: "需复核",
  exclude: "排除",
  hidden: "隐藏出资料库",
  move_to_institution: "应转入机构",
};

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? stringValue(value[0]) : stringValue(value);
}

async function readJsonArray(filePath: string) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readEnrichmentDrafts() {
  const rows = await readJsonArray(enrichmentDraftsPath);

  return rows
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      titleZh: stringValue(item.titleZh),
      reviewStatus: stringValue(item.reviewStatus),
      updatedAt: stringValue(item.updatedAt),
    }))
    .filter((item) => item.resourceId);
}

async function readAgentLogs() {
  const rows = await readJsonArray(agentLogsPath);

  return rows
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      finalStatus: stringValue(item.finalStatus),
      issueTags: stringArrayValue(item.issueTags),
      recommendedActions: stringArrayValue(item.recommendedActions),
      checkedAt: stringValue(item.checkedAt),
    }))
    .filter((item) => item.resourceId);
}

async function readCurationDecisions() {
  const rows = await readJsonArray(curationDecisionsPath);

  return rows
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      resourceId: stringValue(item.resourceId),
      decision: stringValue(item.decision),
      hiddenFromLibrary: item.hiddenFromLibrary === true,
      reason: stringValue(item.reason),
      reviewedAt: stringValue(item.reviewedAt),
    }))
    .filter((item) => item.resourceId);
}

function formatDateTime(value: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getResourceTitle(resource: Resource) {
  return resource.titleZh || resource.titleEn || resource.id;
}

function getBadgeClassName(status: string) {
  if (status === "passed" || status === "accepted" || status === "applied") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (status === "rejected" || status === "failed" || status === "hidden") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  }

  if (
    status === "needs_revision" ||
    status === "needs_review" ||
    status === "needs_human_review"
  ) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300";
}

function getSearchMatches(query: string) {
  const normalizedQuery = query.toLowerCase();

  if (!normalizedQuery) {
    return resources.slice(0, 20);
  }

  return resources
    .filter((resource) =>
      [
        resource.id,
        resource.titleZh,
        resource.titleEn,
        resource.sourceDomain,
        resource.sourceUrl,
        resource.resourceType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    )
    .slice(0, 40);
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {value || "未记录"}
      </p>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <span className="text-sm text-zinc-500 dark:text-zinc-400">未记录</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ResourceSelector({
  query,
  selectedResourceId,
}: {
  query: string;
  selectedResourceId: string;
}) {
  const matches = getSearchMatches(query);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            选择资料
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            可通过 resourceId、标题、来源域名或链接快速定位后台资料。
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {matches.length} 条
        </span>
      </div>

      <form action="/admin/resources" className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={query}
          placeholder="搜索 resourceId、标题或来源域名"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          搜索
        </button>
        <Link
          href="/admin/resources"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          重置
        </Link>
      </form>

      <div className="mt-4 space-y-2">
        {matches.map((resource) => (
          <Link
            key={resource.id}
            href={`/admin/resources?resourceId=${encodeURIComponent(resource.id)}`}
            className={`block rounded-lg border px-4 py-3 transition ${
              selectedResourceId === resource.id
                ? "border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40"
                : "border-zinc-100 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            }`}
          >
            <span className="block font-medium text-zinc-900 dark:text-zinc-50">
              {getResourceTitle(resource)}
            </span>
            <span className="mt-1 block break-all text-xs text-zinc-500 dark:text-zinc-400">
              {resource.id} · {resource.sourceDomain || "未知来源"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SelectedResourcePanel({
  resource,
  draft,
  agentLog,
  curationDecision,
}: {
  resource: Resource;
  draft?: EnrichmentDraftStatus;
  agentLog?: AgentLogSummary;
  curationDecision?: CurationDecisionSummary;
}) {
  const institution = institutions.find((item) => item.id === resource.institutionId);
  const primaryTopic = topics.find((item) => item.id === resource.primaryTopicId);
  const relatedTopics = resource.topicIds
    .map((topicId) => topics.find((item) => item.id === topicId))
    .filter((topic): topic is (typeof topics)[number] => Boolean(topic));
  const statusMeta = getResourceStatusMeta(resource.status);
  const snapshotStatus = getResourceSnapshotStatus(resource.id);
  const files = getResourceFiles(resource.id);
  const officialFiles = resourceOfficialFiles.filter(
    (file) => file.resourceId === resource.id,
  );
  const fileTypes = Array.from(
    new Set(files.map((file) => file.fileType).filter(Boolean)),
  ) as ResourceFileType[];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {resource.id}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {getResourceTitle(resource)}
            </h2>
            {resource.titleEn && resource.titleEn !== getResourceTitle(resource) ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {resource.titleEn}
              </p>
            ) : null}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusMeta.className}`}
            title={statusMeta.description}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/resources/${resource.slug}`}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            查看前台
          </Link>
          <Link
            href={`/admin/enrichments?resourceId=${encodeURIComponent(resource.id)}`}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            打开 AI 草稿审核
          </Link>
          <Link
            href="/admin/quality-agent"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            返回质量 Agent
          </Link>
          <Link
            href="/admin/resource-quality"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            打开质量审计
          </Link>
          {resource.sourceUrl ? (
            <a
              href={resource.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              打开官方来源
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="资料类型" value={resourceTypeZh[resource.resourceType]} />
        <InfoCard label="发布机构" value={institution?.nameZh || resource.institutionId} />
        <InfoCard label="主专题" value={primaryTopic?.titleZh || resource.primaryTopicId} />
        <InfoCard
          label="链接状态"
          value={linkStatusZh[resource.linkStatus as LinkStatus] ?? resource.linkStatus}
        />
        <InfoCard label="来源域名" value={resource.sourceDomain} />
        <InfoCard label="快照状态" value={snapshotStatus.label} />
        <InfoCard label="官方文件数" value={officialFiles.length} />
        <InfoCard label="本站备份文件数" value={files.length} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            内容字段
          </h3>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                卡片简介
              </p>
              <p>{resource.summaryShort || "未记录"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                中文摘要
              </p>
              <p>{resource.summaryZh || "未记录"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                研究价值
              </p>
              <p>{resource.researchValue || "未记录"}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                内容要点
              </p>
              {resource.keyPoints.length ? (
                <ol className="space-y-2">
                  {resource.keyPoints.map((point, index) => (
                    <li key={`${point}-${index}`} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
                      {index + 1}. {point}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>未记录</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            维护状态
          </h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                AI enrichment 草稿
              </p>
              {draft ? (
                <div className="mt-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClassName(draft.reviewStatus)}`}
                  >
                    {draftStatusLabels[draft.reviewStatus] ?? draft.reviewStatus}
                  </span>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {draft.titleZh || "未记录中文标题"} · 更新于{" "}
                    {formatDateTime(draft.updatedAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  暂无 AI 草稿。可在质量 Agent 中生成补全草稿。
                </p>
              )}
            </div>

            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Resource Quality Agent
              </p>
              {agentLog ? (
                <div className="mt-2 space-y-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClassName(agentLog.finalStatus)}`}
                  >
                    {agentStatusLabels[agentLog.finalStatus] ?? agentLog.finalStatus}
                  </span>
                  <TagList items={agentLog.issueTags} />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    最近检查：{formatDateTime(agentLog.checkedAt)}
                  </p>
                  {agentLog.recommendedActions.length ? (
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      推荐操作：{agentLog.recommendedActions.join("；")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  暂无 Agent 日志。可先运行质量检查。
                </p>
              )}
            </div>

            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                人工处置决策
              </p>
              {curationDecision ? (
                <div className="mt-2 space-y-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClassName(curationDecision.decision)}`}
                  >
                    {curationDecisionLabels[curationDecision.decision] ??
                      curationDecision.decision}
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {curationDecision.reason || "未记录原因。"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    隐藏出资料库：
                    {curationDecision.hiddenFromLibrary ? "是" : "否"} ·{" "}
                    {formatDateTime(curationDecision.reviewedAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  暂无人工处置决策。
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          分类与来源
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              相关专题
            </p>
            <TagList
              items={relatedTopics.map((topic) => `${topic.titleZh} (${topic.id})`)}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              标签
            </p>
            <TagList items={resource.tags} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              来源链接
            </p>
            <p className="break-all text-zinc-600 dark:text-zinc-300">
              {resource.sourceUrl || "未记录"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              备份文件类型
            </p>
            <TagList
              items={fileTypes.map((fileType) => `${visibilityZh.public} ${fileType}`)}
            />
          </div>
        </div>
      </section>
    </section>
  );
}

export default async function AdminResourcesPage({
  searchParams,
}: AdminResourcesPageProps) {
  const params = searchParams ? await searchParams : {};
  const resourceId = firstParam(params, "resourceId");
  const query = firstParam(params, "q");
  const [drafts, agentLogs, curationDecisions] = await Promise.all([
    readEnrichmentDrafts(),
    readAgentLogs(),
    readCurationDecisions(),
  ]);
  const selectedResource = resourceId
    ? resources.find((resource) => resource.id === resourceId)
    : null;
  const draftByResourceId = new Map(
    drafts.map((draft) => [draft.resourceId, draft]),
  );
  const agentLogByResourceId = new Map(
    agentLogs.map((log) => [log.resourceId, log]),
  );
  const curationDecisionByResourceId = new Map(
    curationDecisions.map((decision) => [decision.resourceId, decision]),
  );

  return (
    <>
      <PageHeader
        eyebrow="本地维护工具"
        title="资料后台编辑"
        description="用于从质量 Agent、AI 草稿审核和资料质量审计之间快速定位单条资料。当前页面不直接改写原始数据，内容修改请进入 AI 草稿审核后应用。"
      />
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[360px_1fr]">
          <ResourceSelector query={query} selectedResourceId={resourceId} />

          {selectedResource ? (
            <SelectedResourcePanel
              resource={selectedResource}
              draft={draftByResourceId.get(selectedResource.id)}
              agentLog={agentLogByResourceId.get(selectedResource.id)}
              curationDecision={curationDecisionByResourceId.get(selectedResource.id)}
            />
          ) : (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              {resourceId ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  未找到 resourceId 为 {resourceId} 的前台可见资料。它可能已被隐藏、排除，或质量报告需要重新生成。
                </p>
              ) : (
                <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  请从左侧选择一条资料，或从资料质量 Agent 点击“编辑资料”进入单条资料维护视图。
                </p>
              )}
            </section>
          )}
        </div>
      </section>
    </>
  );
}
