"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineSidebar } from "@/components/LineSidebar";
import { topics } from "@/data/mockData";

const institutionItems = [
  { id: "federal", label: "联邦机构" },
  { id: "state", label: "各州机构" },
  { id: "social", label: "社会机构" },
  { id: "academic", label: "高校与研究机构" },
  { id: "commercial", label: "商业与服务机构" },
  { id: "other", label: "其他机构" },
];

export function ArchiveCGHome() {
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeInstitutionIndex, setActiveInstitutionIndex] = useState(0);
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [displayedSide, setDisplayedSide] = useState<"left" | "right" | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wheelTimestampRef = useRef(0);

  const topicItems = useMemo(
    () =>
      [...topics]
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .slice(0, 6)
        .map((topic) => ({ id: topic.id, label: topic.titleZh })),
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDisplayedSide(activeSide),
      activeSide ? 160 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [activeSide]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;

    setActiveSide(ratio < 0.2 ? "left" : ratio > 0.8 ? "right" : null);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (!activeSide || Math.abs(event.deltaY) < 4) {
        return;
      }

      const now = performance.now();

      if (now - wheelTimestampRef.current < 120) {
        return;
      }

      wheelTimestampRef.current = now;

      if (activeSide === "left") {
        setActiveTopicIndex((currentIndex) =>
          event.deltaY > 0
            ? (currentIndex + 1) % topicItems.length
            : (currentIndex - 1 + topicItems.length) % topicItems.length,
        );
      } else {
        setActiveInstitutionIndex((currentIndex) =>
          event.deltaY > 0
            ? (currentIndex + 1) % institutionItems.length
            : (currentIndex - 1 + institutionItems.length) % institutionItems.length,
        );
      }
    };

    section.addEventListener("wheel", handleWheel, { passive: false });

    return () => section.removeEventListener("wheel", handleWheel);
  }, [activeSide, topicItems.length]);

  return (
    <section
      ref={sectionRef}
      className="archive-cg-home"
      aria-label="CG 档案库入口"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setActiveSide(null)}
    >
      <Image
        src="/image/danganjiazi.png"
        alt="档案架构成的中央通道"
        fill
        priority
        sizes="100vw"
        className="archive-cg-home__background"
      />
      <div className="archive-cg-home__mask" aria-hidden="true" />

      <div className={`archive-cg-home__hover-zone archive-cg-home__hover-zone--left ${activeSide === "left" ? "is-active" : ""}`} />
      <div className={`archive-cg-home__hover-zone archive-cg-home__hover-zone--right ${activeSide === "right" ? "is-active" : ""}`} />

      <div className="archive-cg-home__content">
        <span className="archive-cg-home__eyebrow">ARCHIVE SYSTEM · ONLINE</span>
        <h1 className="archive-cg-home__title">ArchiveScope</h1>
        <p className="archive-cg-home__subtitle">全球档案数据资源建设知识库</p>
        <p className="archive-cg-home__description">
          中央档案通道已开启。左侧调取研究专题，右侧调取组织机构；滚轮切换条目，点击锁定目标。
        </p>
        <div className="archive-cg-home__actions">
          <Link href="/resources">进入资料库</Link>
          <Link href="/topics">查看研究专题</Link>
        </div>
      </div>

      <LineSidebar
        items={topicItems}
        activeIndex={activeTopicIndex}
        isVisible={displayedSide === "left"}
        side="left"
        accentColor="#C79A63"
        textColor="#D8C8B4"
        markerColor="#7C5F43"
        showIndex
        showMarker
        proximityRadius={100}
        maxShift={30}
        falloff="smooth"
        markerLength={60}
        markerGap={0}
        tickScale={0.5}
        scaleTick
        itemGap={20}
        fontSize={1.1}
        smoothing={100}
        onItemClick={setActiveTopicIndex}
      />

      <LineSidebar
        items={institutionItems}
        activeIndex={activeInstitutionIndex}
        isVisible={displayedSide === "right"}
        side="right"
        accentColor="#C79A63"
        textColor="#D8C8B4"
        markerColor="#7C5F43"
        showIndex
        showMarker
        proximityRadius={100}
        maxShift={30}
        falloff="smooth"
        markerLength={60}
        markerGap={0}
        tickScale={0.5}
        scaleTick
        itemGap={20}
        fontSize={1.1}
        smoothing={100}
        onItemClick={setActiveInstitutionIndex}
      />
    </section>
  );
}
