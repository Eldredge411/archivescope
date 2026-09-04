import Link from "next/link";
import {
  countries,
  institutions,
  resources,
  resourceVersions,
  topics,
} from "@/data/mockData";

const overviewStats = [
  {
    label: "资料条目",
    value: resources.length,
    note: "法规、指南、系统、项目、报告与资源入口",
  },
  {
    label: "机构条目",
    value: institutions.length,
    note: "档案馆、图书馆、学会、大学馆藏与相关组织",
  },
  {
    label: "研究专题",
    value: topics.length,
    note: "按学习问题组织资料入口",
  },
  {
    label: "版本线索",
    value: resourceVersions.length,
    note: "文件法规、规则和重要文件的沿革节点",
  },
];

const useCases = [
  {
    title: "查找具体资料",
    text: "在资料库中检索法规、政策、指南、项目、系统和数据库，查看中文简介、关键词、来源链接和快照状态。",
    href: "/resources",
    action: "进入资料库",
  },
  {
    title: "按问题进入专题",
    text: "如果不知道从哪一类资料开始，可以先进入研究专题，根据“我想了解……”的提示选择方向。",
    href: "/topics",
    action: "查看专题",
  },
  {
    title: "了解机构背景",
    text: "通过机构索引查看档案馆、图书馆、专业协会和高校馆藏机构，理解资料背后的发布主体。",
    href: "/institutions",
    action: "查看机构",
  },
  {
    title: "查看资料关系",
    text: "知识图谱用于辅助观察资料、机构、专题和版本之间的联系，适合在阅读具体资料后回看结构。",
    href: "/atlas",
    action: "打开图谱",
  },
];

const workflow = [
  ["01", "发现来源", "优先从官方机构、法规平台、图书馆和专业组织中筛选资料。"],
  ["02", "整理中文信息", "为资料补充中文标题、简介、摘要、要点、关键词和研究价值。"],
  ["03", "归入结构", "按国家、机构、专题、资料类型和版本沿革放入统一目录。"],
  ["04", "持续修正", "保留编辑、隐藏、补充快照和重新发布入口，方便后续维护。"],
];

const sourceNotes = [
  "当前内容以美国板块为主，其他国家会在同一结构下逐步补充。",
  "资料说明用于帮助阅读和定位，正式引用仍建议回到官方来源核对。",
  "中文导读由 AI 辅助整理，并经过网站管理员人工审核后发布；管理员仍会继续人工修改、删除或重新发布。",
  "网页快照用于保存访问线索，部分来源可能因访问限制无法完整保存。",
];

const responsibilityNotes = [
  "本站资料说明用于学习、检索和研究导读，不替代官方原文、现行法规文本或发布机构解释。",
  "如发现事实、翻译、链接、地图边界或资料归类问题，请联系作者：liangjiayu1223@ruc.edu.cn。",
  "本站视觉设计采用档案袋、纸张、索引标签、表格和文件夹等通用档案元素重新组织，不使用第三方页面的素材、截图、文案或可识别的成套版式。",
  "世界地图为资料分布可视化示意，地图边界和名称不作为政治边界、行政区划或主权判断依据；中国相关区域按中国整体显示和统计。",
];

export default function ExhibitPage() {
  return (
    <main className="site-note-page">
      <div className="site-note-shell">
        <section className="site-note-cover" aria-label="网站说明">
          <span className="site-note-cover__tab">NOTE</span>
          <div className="site-note-cover__topline">
            <span>ARCHIVESCOPE</span>
            <span>SITE NOTE</span>
          </div>

          <div className="site-note-cover__plate">
            <div>
              <small>网站说明</small>
              <strong>ArchiveScope</strong>
            </div>
            <div>
              <small>当前范围</small>
              <strong>美国档案资源</strong>
            </div>
            <div>
              <small>Countries</small>
              <strong>{countries.length}</strong>
            </div>
          </div>

          <p className="site-note-cover__intro">
            ArchiveScope 是一个面向中文用户整理海外档案资源的网站。当前版本以美国为主要样板，集中呈现档案法规、机构、数字资源、项目计划和相关说明资料。
          </p>

          <div className="site-note-actions">
            <Link href="/resources">开始检索资料</Link>
            <Link href="/topics">按专题浏览</Link>
          </div>
        </section>

        <section className="site-note-stats" aria-label="网站数据概况">
          {overviewStats.map((stat) => (
            <article key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              <p>{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="site-note-section">
          <div className="site-note-section__head">
            <span>HOW TO USE</span>
            <h1>这个网站可以怎么用</h1>
          </div>

          <div className="site-note-use-grid">
            {useCases.map((item) => (
              <Link key={item.href} href={item.href}>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
                <span>{item.action}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="site-note-section">
          <div className="site-note-section__head">
            <span>WORKFLOW</span>
            <h1>资料是如何整理的</h1>
          </div>

          <div className="site-note-workflow">
            {workflow.map(([step, title, text]) => (
              <article key={step}>
                <b>{step}</b>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="site-note-section site-note-section--split">
          <div>
            <div className="site-note-section__head">
              <span>CURRENT SCOPE</span>
              <h1>当前说明</h1>
            </div>
            <ul className="site-note-list">
              {sourceNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <aside className="site-note-mini-card">
            <span>QUICK START</span>
            <h2>第一次访问建议</h2>
            <p>
              可以先用首页搜索框输入关键词，也可以从研究专题进入。如果你已经知道具体机构或文件名称，资料库会更直接。
            </p>
            <Link href="/">返回首页搜索</Link>
          </aside>
        </section>

        <section className="site-note-section">
          <div className="site-note-section__head">
            <span>REVIEW & CONTACT</span>
            <h1>审核、版权与联系</h1>
          </div>

          <ul className="site-note-list site-note-list--cards">
            {responsibilityNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
