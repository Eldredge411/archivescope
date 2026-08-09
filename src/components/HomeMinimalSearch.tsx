"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const searchExamples = [
  "搜索：Presidential Records Act",
  "搜索：electronic records preservation",
  "搜索：NARA Catalog",
  "搜索：FOIA records management",
  "搜索：digital archives strategy",
];

export function HomeMinimalSearch() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % searchExamples.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      router.push("/resources");
      return;
    }

    const params = new URLSearchParams({
      q: trimmedKeyword,
      field: "all",
    });

    router.push(`/resources?${params.toString()}`);
  }

  return (
    <form onSubmit={submitSearch} className="archive-minimal-search">
      <label className="sr-only" htmlFor="home-minimal-search">
        搜索 ArchiveScope
      </label>
      <input
        id="home-minimal-search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder={searchExamples[placeholderIndex]}
      />
      <button type="submit">搜索</button>
    </form>
  );
}
