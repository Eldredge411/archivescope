"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { AtlasGraph, AtlasGraphEdge } from "@/lib/atlas/atlasGraph";
import type { Story } from "@/lib/atlas/curatedStories";
import type { Resource, ResourceFile } from "@/types";

type CuratedStoryPlayerProps = {
  story: Story;
  activeStepIndex: number;
  graph: AtlasGraph;
  resources: Resource[];
  resourceFiles: ResourceFile[];
  onStepChange: (stepIndex: number) => void;
  onExit: () => void;
  onEvidenceClick: (resourceId: string) => void;
};

function getSnapshotFile(files: ResourceFile[], resourceId: string) {
  return files.find(
    (file) =>
      file.resourceId === resourceId &&
      file.fileType === "screenshot" &&
      file.visibility === "public",
  );
}

function getResource(resources: Resource[], resourceId: string) {
  return resources.find((resource) => resource.id === resourceId);
}

function getEvidenceEdge(
  edges: AtlasGraphEdge[],
  resourceId: string,
): AtlasGraphEdge | undefined {
  return edges.find(
    (edge) =>
      edge.evidenceResourceIds.includes(resourceId) ||
      edge.source === resourceId ||
      edge.target === resourceId,
  );
}

function TypedParagraph({ text }: { text: string }) {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    let characterCount = 0;
    const timer = window.setInterval(() => {
      characterCount += 1;
      setTypedText(text.slice(0, characterCount));

      if (characterCount >= text.length) {
        window.clearInterval(timer);
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [text]);

  return <p>{typedText}</p>;
}

export function CuratedStoryPlayer({
  story,
  activeStepIndex,
  graph,
  resources,
  resourceFiles,
  onStepChange,
  onExit,
  onEvidenceClick,
}: CuratedStoryPlayerProps) {
  const activeStep = story.steps[activeStepIndex - 1] ?? story.steps[0];

  return (
    <section className="atlas-story-player" aria-label="策展故事线播放器">
      <header>
        <div>
          <span>Curated Narrative</span>
          <h2>{story.titleZh}</h2>
          <p>{story.titleEn}</p>
        </div>
        <button type="button" onClick={onExit}>
          退出故事
        </button>
      </header>

      <div className="atlas-story-player__body">
        <article className="atlas-story-player__text" key={activeStep.chapterNo}>
          <b>第 {String(activeStep.chapterNo).padStart(2, "0")} 章</b>
          <TypedParagraph text={activeStep.textZh} />
        </article>

        <section className="atlas-story-player__evidence">
          <h3>本章证据</h3>
          <ul>
            {activeStep.evidenceIds.map((resourceId) => {
              const resource = getResource(resources, resourceId);
              const snapshotFile = getSnapshotFile(resourceFiles, resourceId);

              if (!resource) {
                return null;
              }

              return (
                <li key={resourceId}>
                  <button
                    type="button"
                    disabled={!getEvidenceEdge(graph.edges, resourceId)}
                    onClick={() => onEvidenceClick(resourceId)}
                  >
                    <span className="atlas-story-player__snapshot">
                      {snapshotFile ? (
                        <Image
                          src={snapshotFile.fileUrl}
                          alt={`${resource.titleZh || resource.titleEn}网页快照`}
                          fill
                          sizes="140px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <small>快照未保存</small>
                      )}
                    </span>
                    <span>
                      <b>AS / {resource.id}</b>
                      <strong>{resource.titleZh || resource.titleEn}</strong>
                      <em>{resource.publishDate || "年份未记录"}</em>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <footer>
        <div className="atlas-story-player__progress" role="tablist">
          {story.steps.map((step, index) => (
            <button
              key={step.chapterNo}
              type="button"
              role="tab"
              aria-selected={activeStepIndex === index + 1}
              className={activeStepIndex === index + 1 ? "is-active" : ""}
              onClick={() => onStepChange(index + 1)}
            >
              {String(step.chapterNo).padStart(2, "0")}
            </button>
          ))}
        </div>
        <span>
          {String(activeStepIndex).padStart(2, "0")} /{" "}
          {String(story.chapterCount).padStart(2, "0")}
        </span>
      </footer>
    </section>
  );
}
