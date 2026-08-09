"use client";

export default function ResourcesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-xl border border-rose-200 bg-white p-6 dark:border-rose-900/60 dark:bg-zinc-900">
          <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            页面加载异常
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            资料库暂时无法加载
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            当前资料数据可能正在更新，或浏览器加载过程中遇到了临时错误。请先尝试重新加载页面。
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            重新加载
          </button>
        </div>
      </div>
    </section>
  );
}
