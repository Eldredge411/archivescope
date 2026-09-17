"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineSidebar } from "@/components/LineSidebar";
import { topics } from "@/data/mockData";

const institutionItems = [
  { id: "federal", label: "联邦机构", href: "/institutions/usa?group=federal" },
  { id: "state", label: "各州机构", href: "/institutions/usa?group=state" },
  { id: "social", label: "社会机构", href: "/institutions/usa?group=social" },
  { id: "academic", label: "高校与研究机构", href: "/institutions/usa?group=academic" },
  { id: "commercial", label: "商业与服务机构", href: "/institutions/usa?group=commercial" },
  { id: "other", label: "其他机构", href: "/institutions/usa?group=other" },
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
        .map((topic) => ({
          id: topic.id,
          label: topic.titleZh,
          description: topic.plainQuestion,
          href: `/topics/${topic.slug}`,
        })),
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

      <div
        className={`archive-cg-home__prompt ${
          activeSide === "left" ? "is-visible" : ""
        }`}
        aria-live="polite"
      >
        {activeSide === "left" && topicItems[activeTopicIndex] ? (
          <>
            <span>RESEARCH TOPIC</span>
            <p key={topicItems[activeTopicIndex].id}>
              {topicItems[activeTopicIndex].description}
            </p>
          </>
        ) : null}
      </div>

      <LineSidebar
        items={topicItems}
        activeIndex={activeTopicIndex}
        isVisible={displayedSide === "left"}
        side="left"
        title="研究专题"
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
        onItemHover={setActiveTopicIndex}
      />

      <LineSidebar
        items={institutionItems}
        activeIndex={activeInstitutionIndex}
        isVisible={displayedSide === "right"}
        side="right"
        title="组织机构"
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
        onItemHover={setActiveInstitutionIndex}
      />
    </section>
  );
}
