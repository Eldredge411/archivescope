"use client";

import Link from "next/link";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useState } from "react";
import { HomeMinimalSearch } from "@/components/HomeMinimalSearch";

const foldCards = [
  {
    label: "资料库",
    kicker: "SEARCH",
    href: "/resources",
    className: "archive-fold-card--paper",
    number: "01",
    fileNo: "AS-RS-001",
    date: "2026-08-06",
    stamp: "OPEN FILE",
    note: "从问题进入资料",
    imageSrc: "/snapshots/us/nara-web-research/nara-web-research-2026-07-28.png",
    imagePosition: "50% 18%",
    rows: [
      ["01", "全库检索", "关键词 / 机构 / 类型"],
      ["02", "资料详情", "摘要 / 要点 / 研究价值"],
      ["03", "来源证据", "官方链接 / 网页快照"],
      ["04", "关联资料", "版本 / 延伸 / 相近主题"],
    ],
  },
  {
    label: "关系图谱",
    kicker: "ATLAS",
    href: "/atlas",
    className: "archive-fold-card--mist",
    number: "02",
    fileNo: "AS-AT-002",
    date: "RELATION MAP",
    stamp: "CROSS-REF",
    note: "看资料之间的线索",
    imageSrc: "/snapshots/us/nara-web-records-mgmt/nara-web-records-mgmt-2026-07-28.png",
    imagePosition: "50% 12%",
    rows: [
      ["05", "制度脉络", "法律 / 规则 / 指南"],
      ["06", "机构网络", "部门 / 项目 / 平台"],
      ["07", "主题路径", "保存 / 开放 / 治理"],
      ["08", "研究线索", "从资料进入问题"],
    ],
  },
  {
    label: "机构索引",
    kicker: "INDEX",
    href: "/institutions",
    className: "archive-fold-card--sand",
    number: "03",
    fileNo: "AS-IN-003",
    date: "ENTITY INDEX",
    stamp: "INDEXED",
    note: "追踪机构与项目",
    imageSrc: "/snapshots/us/nara-web-about-nara/nara-web-about-nara-2026-07-28.png",
    imagePosition: "50% 13%",
    rows: [
      ["09", "档案机构", "NARA / 州档案馆"],
      ["10", "学会大学", "协会 / 图书馆 / 课程"],
      ["11", "项目平台", "系统 / 计划 / 工具"],
      ["12", "主体分工", "谁在建设什么"],
    ],
  },
  {
    label: "网站说明",
    kicker: "NOTE",
    href: "/exhibit",
    className: "archive-fold-card--tea",
    number: "04",
    fileNo: "AS-EX-004",
    date: "METHOD NOTE",
    stamp: "ARCHIVED",
    note: "了解网站内容",
    imageSrc: "/snapshots/us/nara-web-exhibits/nara-web-exhibits-2026-07-28.png",
    imagePosition: "50% 8%",
    rows: [
      ["13", "资料范围", "美国 / 机构 / 专题"],
      ["14", "整理方式", "导读 / 审核 / 快照"],
      ["15", "使用入口", "搜索 / 专题 / 图谱"],
      ["16", "后续扩展", "国家 / 机构 / 主题"],
    ],
  },
];

const dustParticles = [
  [8, 18, 16],
  [15, 72, 23],
  [21, 38, 19],
  [28, 58, 27],
  [34, 14, 21],
  [42, 82, 25],
  [49, 27, 18],
  [56, 64, 30],
  [63, 46, 22],
  [70, 18, 26],
  [76, 76, 20],
  [83, 35, 29],
  [89, 58, 17],
  [94, 24, 24],
];

export function HomeArchiveDrawer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % foldCards.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    event.currentTarget.style.setProperty("--card-x", `${x * 18}px`);
    event.currentTarget.style.setProperty("--card-y", `${y * 12}px`);
    event.currentTarget.style.setProperty("--card-tilt-x", `${y * -5}deg`);
    event.currentTarget.style.setProperty("--card-tilt-y", `${x * 7}deg`);
    event.currentTarget.style.setProperty("--folder-x", `${x * 8}px`);
    event.currentTarget.style.setProperty("--folder-y", `${y * 5}px`);
    event.currentTarget.style.setProperty("--paper-x", `${x * -5}px`);
    event.currentTarget.style.setProperty("--paper-y", `${y * -3}px`);
    event.currentTarget.style.setProperty("--shadow-x", `${x * 10}px`);
  }

  function resetPointerMotion(event: ReactPointerEvent<HTMLDivElement>) {
    setIsPaused(false);
    event.currentTarget.style.setProperty("--card-x", "0px");
    event.currentTarget.style.setProperty("--card-y", "0px");
    event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
    event.currentTarget.style.setProperty("--folder-x", "0px");
    event.currentTarget.style.setProperty("--folder-y", "0px");
    event.currentTarget.style.setProperty("--paper-x", "0px");
    event.currentTarget.style.setProperty("--paper-y", "0px");
    event.currentTarget.style.setProperty("--shadow-x", "0px");
  }

  return (
    <section className="archive-folder-home" aria-label="ArchiveScope 首页">
      <div className="archive-folder-dust" aria-hidden="true">
        {dustParticles.map(([x, y, duration], index) => (
          <span
            key={`${x}-${y}-${duration}`}
            style={
              {
                "--dust-x": `${x}%`,
                "--dust-y": `${y}%`,
                "--dust-duration": `${duration}s`,
                "--dust-delay": `${index * -1.7}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="archive-folder-shell">
        <div
          className="archive-folder-stage"
          aria-label="摊开的档案文件夹"
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={resetPointerMotion}
          onPointerMove={handlePointerMove}
          style={
            {
              "--card-x": "0px",
              "--card-y": "0px",
              "--card-tilt-x": "0deg",
              "--card-tilt-y": "0deg",
              "--folder-x": "0px",
              "--folder-y": "0px",
              "--paper-x": "0px",
              "--paper-y": "0px",
              "--shadow-x": "0px",
            } as CSSProperties
          }
        >
          <div className="archive-folder-board" aria-hidden="true" />
          <div className="archive-folder-back-pages" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="archive-folder-lid" aria-hidden="true" />
          <div className="archive-folder-left" aria-hidden="true">
            <span className="archive-folder-clip" />
            <span className="archive-folder-note">
              <small>ArchiveScope</small>
              档案数据资源
            </span>
            <span className="archive-folder-ticket">ARCHIVE SCOPE</span>
          </div>
          <div className="archive-folder-pocket" aria-hidden="true" />

          {foldCards.map((card, index) => (
            <div
              key={card.label}
              className={`archive-fold-card ${card.className} ${
                activeIndex === index
                  ? "is-active"
                  : index < activeIndex
                    ? "is-before"
                    : "is-after"
              }`}
              style={
                {
                  "--drawer-index": index,
                  "--page-offset": `${index * 1.05}rem`,
                  "--page-angle": `${(index - 1.5) * 1.55}deg`,
                  "--label-offset": `${index * 3.05}rem`,
                  "--photo-position": card.imagePosition,
                  zIndex: activeIndex === index ? 36 : 12 + index,
                } as CSSProperties
              }
            >
              <span className="archive-fold-meta">
                <span>{card.fileNo}</span>
                <span>{card.date}</span>
              </span>
              <span className="archive-fold-cover">
                <img src={card.imageSrc} alt="" loading="eager" aria-hidden="true" />
                <span>{card.number}</span>
              </span>
              <span className="archive-fold-kicker">{card.kicker}</span>
              <strong>{card.label}</strong>
              <span className="archive-fold-note">{card.note}</span>
              <span className="archive-fold-stamp">{card.stamp}</span>
              <span className="archive-fold-list">
                {card.rows.map(([number, title, meta]) => (
                  <span className="archive-fold-row" key={`${card.label}-${number}`}>
                    <span>{number}</span>
                    <b>{title}</b>
                    <small>{meta}</small>
                  </span>
                ))}
              </span>
              <Link className="archive-fold-action" href={card.href}>
                打开
              </Link>
            </div>
          ))}

          <div className="archive-folder-tab-controls" aria-label="首页卡片切换">
            {foldCards.map((card, index) => (
              <button
                key={`control-${card.label}`}
                type="button"
                className={`archive-folder-control-tab ${card.className} ${
                  activeIndex === index ? "is-active" : ""
                }`}
                aria-label={`抽出${card.label}卡片`}
                aria-pressed={activeIndex === index}
                onClick={() => {
                  setIsPaused(true);
                  setActiveIndex(index);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onPointerEnter={() => setActiveIndex(index)}
                onFocus={() => {
                  setIsPaused(true);
                  setActiveIndex(index);
                }}
                onBlur={() => setIsPaused(false)}
                style={
                  {
                    "--label-offset": `${index * 3.05}rem`,
                  } as CSSProperties
                }
              >
                <span>{card.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="archive-folder-search">
          <HomeMinimalSearch />
          <nav className="archive-fold-links" aria-label="首页快捷入口">
            <Link href="/resources">进入资料库</Link>
            <Link href="/atlas">查看图谱</Link>
            <Link href="/exhibit">网站说明</Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
