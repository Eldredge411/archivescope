"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { stacksConfig } from "@/config/stacks.config";
import type { StackTopic } from "@/lib/stacks/topicsData";

interface ArchiveStacksSceneProps {
  stackTopics: StackTopic[];
  resourceCount: number;
}

const highlightRatios = [
  [0.17, 0.73],
  [0.3, 0.79],
  [0.11, 0.66],
];

export function ArchiveStacksScene({
  stackTopics,
  resourceCount,
}: ArchiveStacksSceneProps) {
  const [faceOutSlug, setFaceOutSlug] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [shelfCounts, setShelfCounts] = useState<number[]>([42, 46, 40]);
  const activeTopic = stackTopics.find((topic) => topic.slug === activeSlug) ?? null;
  const faceOutTopic = stackTopics.find((topic) => topic.slug === faceOutSlug) ?? null;

  useEffect(() => {
    const updateShelfCounts = () => {
      const capacity = Math.max(
        12,
        Math.floor(
          (window.innerWidth - 24) /
            (window.innerWidth < 780
              ? stacksConfig.boxes.mobileAmbientWidth + stacksConfig.boxes.mobileGap
              : stacksConfig.boxes.ambientWidth + stacksConfig.boxes.gap),
        ),
      );
      const factors = [0.96, 1.02, 0.94];

      setShelfCounts(
        factors.map((factor) => Math.max(12, Math.floor(capacity * factor))),
      );
    };

    updateShelfCounts();
    window.addEventListener("resize", updateShelfCounts);

    return () => window.removeEventListener("resize", updateShelfCounts);
  }, []);

  const selectTopic = (topic: StackTopic) => {
    if (activeSlug === topic.slug) {
      return;
    }

    setActiveSlug(null);
    setFaceOutSlug(topic.slug);
  };

  const openTopic = (topic: StackTopic) => {
    if (faceOutSlug !== topic.slug) {
      selectTopic(topic);
      return;
    }

    setActiveSlug(topic.slug);
  };

  const resetTopic = () => {
    setFaceOutSlug(null);
    setActiveSlug(null);
  };

  return (
    <main
      className={`stacks-page archive-wall-page${
        faceOutTopic ? " is-facing" : ""
      }${
        activeTopic ? " is-retrieving" : ""
      }`}
    >
      <section
        className="archive-wall"
        aria-label="美国档案卷宗"
        onClick={resetTopic}
      >
        <div className="archive-wall__lintel">
          <div className="archive-wall__plaque" aria-label="档案架铭牌">
            <span>美国档案数据资源建设专题</span>
            <small>UNITED STATES ARCHIVE · STACK ROOM</small>
            <i aria-hidden="true" />
            <strong>
              {resourceCount} RECORDS · {stackTopics.length} TOPICS FILED
            </strong>
            <span className="archive-wall__rivet archive-wall__rivet--tl" aria-hidden="true" />
            <span className="archive-wall__rivet archive-wall__rivet--tr" aria-hidden="true" />
            <span className="archive-wall__rivet archive-wall__rivet--bl" aria-hidden="true" />
            <span className="archive-wall__rivet archive-wall__rivet--br" aria-hidden="true" />
          </div>
        </div>
        <span
          className="archive-wall__column archive-wall__column--left"
          aria-hidden="true"
        />
        <span
          className="archive-wall__column archive-wall__column--middle"
          aria-hidden="true"
        />
        <span
          className="archive-wall__column archive-wall__column--right"
          aria-hidden="true"
        />

        {shelfCounts.map((ambientCount, shelfIndex) => {
          const highlightIndexes = (highlightRatios[shelfIndex] ?? [])
            .map((ratio) => Math.floor(ambientCount * ratio))
            .sort((current, next) => current - next);
          const totalBoxes = ambientCount + highlightIndexes.length;
          const highlightTopics = stackTopics.slice(
            shelfIndex * 2,
            shelfIndex * 2 + 2,
          );
          let highlightCursor = 0;

          return (
            <div className="archive-wall__shelf" key={shelfIndex}>
              <div className="archive-wall__boxes">
                {Array.from({ length: totalBoxes }).map((_, boxIndex) => {
                  const topic = highlightTopics[highlightCursor];
                  const isHighlight = highlightIndexes.includes(boxIndex);

                  if (isHighlight && topic) {
                    highlightCursor += 1;
                    const volumeNo = String(
                      shelfIndex * 2 + highlightCursor,
                    ).padStart(2, "0");
                    const isRight = boxIndex > totalBoxes / 2;

                    return (
                      <button
                        className={`archive-wall__spine archive-wall__spine--highlight${
                          isRight ? " archive-wall__spine--right" : ""
                        }${
                          faceOutSlug === topic.slug ? " is-face-out" : ""
                        }${
                          activeSlug === topic.slug ? " is-retrieval" : ""
                        }`}
                        data-topic-slug={topic.slug}
                        key={topic.slug}
                        onClick={(event) => {
                          event.stopPropagation();
                          openTopic(topic);
                        }}
                        type="button"
                      >
                        <span className="archive-wall__box-label">
                          VOL.{volumeNo}
                        </span>
                        <span className="archive-wall__box-front">
                          <strong>{topic.titleZh}</strong>
                          <em>{topic.plainQuestion}</em>
                          <i aria-hidden="true" />
                          <span>{topic.resourceCount} RECORDS</span>
                          <small>ARCHIVED</small>
                        </span>
                      </button>
                    );
                  }

                  return (
                    <span
                      aria-hidden="true"
                      className={`archive-wall__spine archive-wall__spine--ambient tone-${
                        (shelfIndex + boxIndex) % 4
                      } variation-${(shelfIndex * 7 + boxIndex * 3) % 4}`}
                      key={`ambient-${shelfIndex}-${boxIndex}`}
                    >
                      <span className="archive-wall__box-label archive-wall__box-label--ambient">
                        {String((boxIndex % 10) + 1).padStart(2, "0")}
                      </span>
                    </span>
                  );
                })}
              </div>
              <span className="archive-wall__board" aria-hidden="true" />
            </div>
          );
        })}

        <span className="archive-wall__lighting" aria-hidden="true" />
      </section>

      <Link className="archive-wall__back" href="/">
        ← 返回大厅 BACK TO LOBBY
      </Link>

      {activeTopic ? (
        <section className="archive-wall__retrieval is-open" aria-live="polite">
          <span className="archive-wall__retrieval-stamp">RETRIEVAL</span>
          <small>TOPIC FILE</small>
          <h2>{activeTopic.titleZh}</h2>
          <strong>{activeTopic.titleEn}</strong>
          <p>{activeTopic.description}</p>
          <dl>
            <div>
              <dt>资源数量</dt>
              <dd>{activeTopic.resourceCount}</dd>
            </div>
            <div>
              <dt>检索入口</dt>
              <dd>/topics/{activeTopic.slug}</dd>
            </div>
          </dl>
          <Link className="archive-wall__retrieval-link" href={`/topics/${activeTopic.slug}`}>
            进入专题 →
          </Link>
        </section>
      ) : null}
    </main>
  );
}
