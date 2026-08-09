"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SearchField = "all" | "title" | "institution" | "country" | "topic" | "tag";

const searchFields: Array<{ value: SearchField; label: string }> = [
  { value: "all", label: "全部字段" },
  { value: "title", label: "标题" },
  { value: "institution", label: "机构" },
  { value: "country", label: "国家地区" },
  { value: "topic", label: "研究专题" },
  { value: "tag", label: "关键词标签" },
];

const quickKeywords = ["联邦记录法", "NARA Catalog", "FOIA", "数字保存"];

function buildResourcesUrl({
  keyword,
  field,
  mode,
}: {
  keyword?: string;
  field?: SearchField;
  mode?: "fuzzy";
}) {
  const params = new URLSearchParams();
  const trimmedKeyword = keyword?.trim();

  if (trimmedKeyword) {
    params.set("q", trimmedKeyword);
    params.set("field", field ?? "all");
  }

  if (mode) {
    params.set("mode", mode);
  }

  const queryString = params.toString();

  return queryString ? `/resources?${queryString}` : "/resources";
}

export function HomeSearch() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [field, setField] = useState<SearchField>("all");

  function goToResources(options?: { mode?: "fuzzy"; field?: SearchField }) {
    router.push(
      buildResourcesUrl({
        keyword,
        field: options?.field ?? field,
        mode: options?.mode,
      }),
    );
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToResources();
  }

  function handleQuickKeyword(value: string) {
    router.push(buildResourcesUrl({ keyword: value, field: "all" }));
  }

  return (
    <div className="mx-auto mt-9 w-full max-w-4xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label className="sr-only" htmlFor="home-search-field">
          选择检索字段
        </label>
        <select
          id="home-search-field"
          value={field}
          onChange={(event) => setField(event.target.value as SearchField)}
          className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {searchFields.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => goToResources()}
          className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        >
          扩展检索
        </button>
        <button
          type="button"
          onClick={() => goToResources({ field: "all", mode: "fuzzy" })}
          className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          模糊查询
        </button>
      </div>

      <form onSubmit={submitSearch} className="mt-6">
        <div className="archive-search-card flex flex-col gap-3 rounded-[1.75rem] border border-zinc-200 bg-white/95 p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl md:flex-row md:items-center dark:border-zinc-800 dark:bg-zinc-900/95">
          <div className="min-w-0 flex-1 rounded-2xl bg-zinc-50 px-5 py-4 dark:bg-zinc-950">
            <label
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              htmlFor="home-search-keyword"
            >
              知识库综合检索
            </label>
            <input
              id="home-search-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索资料名称、机构、专题、国家或关键词"
              className="mt-1 h-8 w-full bg-transparent text-base font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="h-14 rounded-2xl bg-zinc-950 px-7 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              检索资料
            </button>
            <button
              type="submit"
              aria-label="执行检索"
              className="h-14 w-14 rounded-2xl bg-indigo-500 text-xl font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-md"
            >
              ⌕
            </button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>常用检索：</span>
        {quickKeywords.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleQuickKeyword(item)}
            className="rounded-full border border-zinc-200 bg-white/85 px-3 py-1.5 text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-900/85 dark:text-zinc-300 dark:hover:border-indigo-900 dark:hover:text-indigo-300"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
