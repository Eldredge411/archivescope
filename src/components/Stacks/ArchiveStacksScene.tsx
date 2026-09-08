"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StackTopic } from "@/lib/stacks/topicsData";

interface ArchiveStacksSceneProps {
  stackTopics: StackTopic[];
}

const ambientBoxCounts = [14, 14, 14];
const highlightPositions = [
  [2, 9],
  [3, 10],
  [4, 11],
];

export function ArchiveStacksScene({ stackTopics }: ArchiveStacksSceneProps) {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const activeTopic = stackTopics.find((topic) => topic.slug === activeSlug) ?? null;

  const openTopic = (topic: StackTopic) => {
    if (activeSlug) {
      return;
    }

    setActiveSlug(topic.slug);
    navigationTimerRef.current = window.setTimeout(() => {
      router.push(`/topics/${topic.slug}`);
    }, 850);
  };

  return (
    <main
      className={`stacks-page archive-room-page${
        activeTopic ? " is-retrieving" : ""
      }`}
    >
      <div className="archive-room" aria-label="美国档案卷宗">
        <div className="archive-room__ceiling" aria-hidden="true" />
        <div className="archive-room__lamp" aria-hidden="true" />
        <div className="archive-room__light-beam" aria-hidden="true" />
        <div className="archive-room__dust" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        <header className="archive-room__header">
          <span>STACK ROOM</span>
          <h1>美国档案卷宗 UNITED STATES ARCHIVE</h1>
          <p>点击档案盒进入专题检索 · CLICK A BOX TO EXPLORE</p>
        </header>

        <section className="archive-room__shelves" aria-label="专题档案架">
          {ambientBoxCounts.map((ambientBoxCount, shelfIndex) => {
            const highlightIndexes = highlightPositions[shelfIndex] ?? [];
            const totalBoxes = ambientBoxCount + highlightIndexes.length;
            const highlightTopics = stackTopics.slice(
              shelfIndex * 2,
              shelfIndex * 2 + 2,
            );
            let highlightCursor = 0;

            return (
              <div className="archive-room__shelf" key={shelfIndex}>
                <div className="archive-room__shelf-rail" aria-hidden="true" />
                <div className="archive-room__shelf-boxes">
                  {Array.from({ length: totalBoxes }).map((_, boxIndex) => {
                    const topic = highlightTopics[highlightCursor];
                    const isHighlight = highlightIndexes.includes(boxIndex);

                    if (isHighlight && topic) {
                      highlightCursor += 1;

                      return (
                        <button
                          className={`archive-room__box archive-room__box--highlight${
                            activeSlug === topic.slug ? " is-active" : ""
                          }`}
                          data-topic-slug={topic.slug}
                          key={topic.slug}
                          onClick={() => openTopic(topic)}
                          type="button"
                        >
                          <span className="archive-room__box-lid" aria-hidden="true" />
                          <span className="archive-room__box-label">{topic.titleZh}</span>
                          <span className="archive-room__box-tooltip" role="tooltip">
                            {topic.plainQuestion}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <span
                        aria-hidden="true"
                        className="archive-room__box archive-room__box--ambient"
                        key={`ambient-${shelfIndex}-${boxIndex}`}
                      >
                        <span className="archive-room__box-ambient-label">FILE</span>
                      </span>
                    );
                  })}
                </div>
                <div className="archive-room__shelf-edge" aria-hidden="true" />
              </div>
            );
          })}
        </section>

        <div className="archive-room__desk" aria-hidden="true" />
        <div className="archive-room__vignette" aria-hidden="true" />
      </div>

      {activeTopic ? (
        <section className="archive-room__retrieval is-open" aria-live="polite">
          <span className="archive-room__retrieval-stamp">RETRIEVAL</span>
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
        </section>
      ) : null}
    </main>
  );
}
