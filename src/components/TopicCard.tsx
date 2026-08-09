import Link from "next/link";
import type { Topic } from "@/types";

type TopicCardProps = {
  topic: Topic;
  resourceCount?: number;
  showExamples?: boolean;
};

export function TopicCard({
  topic,
  resourceCount,
  showExamples = false,
}: TopicCardProps) {
  const previewExamples = topic.examples.slice(0, 4);

  return (
    <Link
      href={`/topics/${topic.slug}`}
      className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-semibold text-white">
          {topic.sortIndex + 1}
        </span>
        <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-700 dark:text-zinc-50 dark:group-hover:text-indigo-300">
          {topic.titleZh}
        </h3>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {topic.titleEn}
      </p>

      <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium leading-relaxed text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
        {topic.plainQuestion}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {topic.shortDescription}
      </p>

      {showExamples ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {previewExamples.map((example) => (
            <span
              key={example}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {example}
            </span>
          ))}
        </div>
      ) : null}

      {typeof resourceCount === "number" ? (
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            已关联 {resourceCount} 条资料
          </p>
          <span className="text-xs font-medium text-indigo-700 group-hover:text-indigo-900 dark:text-indigo-300 dark:group-hover:text-indigo-200">
            查看专题
          </span>
        </div>
      ) : null}
    </Link>
  );
}
