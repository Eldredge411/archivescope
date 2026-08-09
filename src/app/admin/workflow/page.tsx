import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "资料维护流程 | ArchiveScope",
  description: "ArchiveScope 本地开发阶段的数据采集、审核、完善和快照维护流程说明。",
};

type WorkflowStep = {
  title: string;
  description: string;
  commands?: string[];
  links?: Array<{
    href: string;
    label: string;
  }>;
  notes?: string[];
};

const workflowSteps: WorkflowStep[] = [
  {
    title: "采集资料",
    description: "从外部来源采集候选资料，生成草稿文件。",
    commands: [
      "npm run ingest:fr",
      "npm run ingest:nara-web",
      "npm run ingest:nara-catalog",
    ],
    links: [{ href: "/admin/dashboard", label: "查看维护工作台" }],
  },
  {
    title: "审核采集草稿",
    description: "进入草稿审核页，筛选来源和关键词，接受有价值的资料。",
    links: [{ href: "/admin/drafts", label: "进入草稿审核页" }],
  },
  {
    title: "导出已接受资料",
    description: "将 reviewStatus 为 accepted 的草稿导出为 acceptedResources。",
    commands: ["npm run drafts:export"],
    links: [{ href: "/resources", label: "查看资料库" }],
  },
  {
    title: "生成 AI 资料完善草稿",
    description:
      "基于官方来源、Firecrawl 抓取内容和 AI 模型，生成中文标题、摘要、内容要点、研究价值等草稿。",
    commands: [
      "npm run enrich:generate -- --limit 5",
      "npm run enrich:generate -- --force-id RESOURCE_ID",
    ],
    notes: ["可使用 --force-id RESOURCE_ID 对单条资料重新生成。"],
    links: [{ href: "/admin/enrichments", label: "进入 AI 草稿审核页" }],
  },
  {
    title: "审核 AI 资料完善草稿",
    description:
      "进入 AI 草稿审核页，对 AI 生成内容进行接受、拒绝、需修改或应用。",
    links: [{ href: "/admin/enrichments", label: "进入 AI 草稿审核页" }],
  },
  {
    title: "生成来源快照",
    description: "使用 Playwright 对资料来源页面生成 PDF 和网页截图。",
    commands: [
      "npm run snapshot:generate -- --limit 5",
      "npm run snapshot:generate -- --sourceDomain archives.gov --limit 5",
      "npm run snapshot:generate -- --resourceId RESOURCE_ID --force",
    ],
    links: [{ href: "/admin/dashboard", label: "查看快照状态" }],
  },
  {
    title: "校验来源快照",
    description: "检查哪些资料有完整快照、部分快照或无快照。",
    commands: ["npm run snapshot:validate"],
    links: [{ href: "/admin/dashboard", label: "查看快照问题清单" }],
  },
  {
    title: "前台检查",
    description:
      "检查资料是否已在前台正常显示，状态、摘要、内容要点、来源、版本和快照是否正确。",
    links: [
      { href: "/resources", label: "查看资料库" },
      { href: "/admin/dashboard", label: "查看维护工作台" },
    ],
  },
];

const cautions = [
  "/admin 页面目前仅用于本地开发阶段，不建议公开部署。",
  "不要直接修改 acceptedResources.json，优先通过审核和导出流程更新。",
  "人工完善内容应写入 resourceEnrichments.ts，或通过 /admin/enrichments 应用。",
  "快照仅用于来源核验和防止链接失效，不替代官方文本。",
  "正式引用应以官方来源最新版本为准。",
  ".env.local 不应提交到 GitHub。",
];

function CommandBlock({ commands }: { commands: string[] }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-50">
      <code>{commands.join("\n")}</code>
    </pre>
  );
}

function WorkflowStepCard({
  step,
  index,
}: {
  step: WorkflowStep;
  index: number;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            步骤 {index + 1}
          </span>
          <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {step.description}
          </p>
        </div>

        {step.links?.length ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {step.links.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {step.commands?.length ? <CommandBlock commands={step.commands} /> : null}

      {step.notes?.length ? (
        <div className="mt-3 space-y-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {step.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function AdminWorkflowPage() {
  return (
    <>
      <PageHeader
        eyebrow="本地维护工具"
        title="资料维护流程"
        description="该页面用于记录 ArchiveScope 当前本地开发阶段的数据维护步骤，帮助维护者按固定流程更新资料库。"
      />

      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            该页面为本地开发阶段的维护说明页，列出的命令仅作为操作提示，页面不会执行 shell 命令。
          </div>

          <div className="mt-6 space-y-4">
            {workflowSteps.map((step, index) => (
              <WorkflowStepCard key={step.title} step={step} index={index} />
            ))}
          </div>

          <article className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              注意事项
            </span>
            <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              维护约束
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {cautions.map((caution) => (
                <li key={caution} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{caution}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
