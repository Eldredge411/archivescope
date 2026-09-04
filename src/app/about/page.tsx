import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { countries, institutions, resources, topics } from "@/data/mockData";

const dataSources = [
  "美国国家档案与文件署（NARA）",
  "Federal Register",
  "eCFR",
  "U.S. Code",
  "Library of Congress",
  "OMB / White House 公开备忘录",
];

const methods = [
  {
    title: "官方来源发现",
    description:
      "优先使用政府、档案机构、图书馆和专业组织的官方页面，按白名单来源分批扩充，避免无边界高频爬取。",
  },
  {
    title: "AI 辅助整理",
    description:
      "对资料生成中文标题、卡片简介、中文摘要、内容要点、研究价值、标签和专题建议，再由管理员继续复核。",
  },
  {
    title: "知识组织",
    description:
      "以国家、机构、专题和资料类型组织信息，让用户可以从问题、来源机构或关键词进入档案资源。",
  },
  {
    title: "来源核验",
    description:
      "保留官方链接、来源域名、访问日期、官方文件入口和网页快照状态，便于用户回到原始来源核对。",
  },
];

const values = [
  "降低中文用户理解海外档案制度和电子文件政策的门槛。",
  "把分散在官方网站中的法规、指南、机构和数字资源组织为可检索知识库。",
  "展示 AI 在数字人文资料加工、跨语言导读和知识组织中的辅助作用。",
  "为后续扩展英国、加拿大、澳大利亚、日本等国家提供可复制的数据模型。",
];

const roadmap = [
  {
    title: "第一期：美国样板库",
    status: "已上线",
    description:
      "聚焦 NARA、Federal Register、eCFR、U.S. Code、LOC 等来源，覆盖联邦文件管理、电子文件、数字保存、FOIA 和机构生态。",
  },
  {
    title: "第二期：英联邦与日本样板",
    status: "规划中",
    description:
      "扩展英国、加拿大、澳大利亚、日本等国家的核心档案机构、法规政策和数字保存资源。",
  },
  {
    title: "第三期：人物与学术网络",
    status: "规划中",
    description:
      "单独建立档案学者、研究团队、专业项目和代表性成果模块，避免把人物资料混入机构表。",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="作品说明"
        title="ArchiveScope：面向全球档案资源的智能知识组织平台"
        description="ArchiveScope 当前以美国档案制度为第一期样板，探索如何将分散的档案法规、机构、电子文件政策和数字记忆资源转化为可检索、可理解、可持续扩展的中文知识库。"
      />

      <section className="border-b border-zinc-200 bg-amber-50/70 dark:border-zinc-800 dark:bg-amber-950/20">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="rounded-2xl border border-amber-200 bg-white/80 p-5 text-sm leading-7 text-zinc-700 shadow-sm dark:border-amber-900/50 dark:bg-zinc-900/80 dark:text-zinc-300">
            <strong className="block text-base text-zinc-950 dark:text-zinc-50">
              试运行说明
            </strong>
            <p className="mt-2">
              ArchiveScope 目前是试运行版本，首期重点建设美国板块，资料范围、网页快照、日期信息、版本沿革和关联关系仍在持续补充。站内中文介绍由 AI 辅助整理并经人工审核后发布，适合作为资料发现、中文导读和研究线索入口；正式引用时，请以官方来源和发布机构最新文本为准。如发现问题，可联系 liangjiayu1223@ruc.edu.cn。
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              作品背景
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              档案制度、公共文件政策、电子文件管理和数字保存资源往往分散在不同官方网站中，且大量内容以英文呈现。对中文档案学学习者、研究者和从业者来说，资料发现、语义理解、来源核验和跨国比较都存在门槛。
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              ArchiveScope 的目标不是简单堆积链接，而是用统一的数据模型和 AI 辅助整理流程，把官方资料转化为有中文导读、有专题关系、有机构背景、有来源凭据的数字人文知识入口。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["资料条目", resources.length],
              ["机构条目", institutions.length],
              ["研究专题", topics.length],
              ["国家框架", countries.length],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
                  {value}
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                核心方法
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                作品将资料采集、中文整理、知识分类和人工复核组合成一条可持续扩展的工作流。
              </p>
            </div>
            <Link
              href="/resources"
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              进入资料库检索
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {methods.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              当前数据来源
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              当前版本以美国板块为主，优先收录官方或权威来源。每条资料尽量保留来源链接和官方文件入口，用户可以回到原文核对。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {dataSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              数字人文价值
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {values.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            AI 使用说明
          </h2>
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              本作品使用 AI 辅助完成资料中文标题、摘要、内容要点、研究价值、标签和专题建议的生成，并通过后台 Agent 批量检查资料完整度。AI 输出不被视为原始权威文本，公开展示内容经网站管理员人工审核后发布，所有资料均保留官方来源链接，管理员可继续人工复核、编辑、隐藏或重新发布。如发现问题，请联系 liangjiayu1223@ruc.edu.cn。
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                建设路线
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                当前不是终点，而是一个可复制的样板库。后续扩展将优先保证来源可靠、结构一致和中文导读质量。
              </p>
            </div>
            <Link
              href="/countries"
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              查看国家框架
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {roadmap.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.status === "已上线"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {item.status}
                </span>
                <h3 className="mt-4 font-semibold text-zinc-950 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
