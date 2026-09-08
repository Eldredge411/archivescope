"use client";

import { useState } from "react";
import Link from "next/link";
import type { StackTopic } from "@/lib/stacks/topicsData";

interface ArchiveStacksSceneProps {
  stackTopics: StackTopic[];
  resourceCount: number;
}

const shelfAmbientCounts = [24, 26, 23];
const highlightPositions = [[5, 17], [8, 20], [4, 15]];

export function ArchiveStacksScene({
  stackTopics,
  resourceCount,
}: ArchiveStacksSceneProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeTopic = stackTopics.find((topic) => topic.slug === activeSlug) ?? null;
  const openTopic = (topic: StackTopic) => {
    setActiveSlug(topic.slug);
  };

  return (
    <main
      className={`stacks-page archive-wall-page${
        activeTopic ? " is-retrieving" : ""
      }`}
    >
      <section className="archive-wall" aria-label="美国档案卷宗">
        <div className="archive-wall__lintel">
          <div className="archive-wall__plaque" aria-label="档案架铭牌">
            <span>STACK ROOM · UNITED STATES</span>
            <i aria-hidden="true" />
            <strong>{resourceCount} RECORDS FILED</strong>
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

        {shelfAmbientCounts.map((ambientCount, shelfIndex) => {
          const highlightIndexes = highlightPositions[shelfIndex] ?? [];
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
                          activeSlug === topic.slug ? " is-active" : ""
                        }`}
                        data-topic-slug={topic.slug}
                        key={topic.slug}
                        onClick={() => openTopic(topic)}
                        type="button"
                      >
                        <span className="archive-wall__spine-lines" aria-hidden="true" />
                        <span className="archive-wall__spine-ornament" aria-hidden="true" />
                        <span className="archive-wall__volume">VOL.{volumeNo}</span>
                        <span className="archive-wall__name-tag">
                          <i aria-hidden="true" />
                          {topic.titleZh}
                        </span>
                        <span
                          className={`archive-wall__tooltip${
                            isRight ? " archive-wall__tooltip--left" : ""
                          }`}
                          role="tooltip"
                        >
                          {topic.plainQuestion}
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
                      <span className="archive-wall__spine-lines" aria-hidden="true" />
                      <span
                        className="archive-wall__spine-ornament offset-${
                          (boxIndex + shelfIndex) % 3
                        }"
                        aria-hidden="true"
                      />
                      <span className="archive-wall__spine-title">
                        ARCHIVE {String((boxIndex % 10) + 1).padStart(2, "0")}
                      </span>
                      <span className="archive-wall__spine-number">
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
