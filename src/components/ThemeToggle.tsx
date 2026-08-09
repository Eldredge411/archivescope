"use client";

import { useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";

const storageKey = "archivescope-theme";
const themeChangeEvent = "archivescope-theme-change";

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
  };
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(storageKey, mode);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(
    subscribe,
    getStoredMode,
    getServerSnapshot,
  );

  function handleChange(nextMode: ThemeMode) {
    applyTheme(nextMode);
  }

  return (
    <div
      className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800"
      aria-label="显示模式选择"
    >
      <button
        type="button"
        onClick={() => handleChange("light")}
        aria-pressed={mode === "light"}
        className={`h-8 rounded-md px-3 transition-colors ${
          mode === "light"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        日间模式
      </button>
      <button
        type="button"
        onClick={() => handleChange("dark")}
        aria-pressed={mode === "dark"}
        className={`h-8 rounded-md px-3 transition-colors ${
          mode === "dark"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        夜间模式
      </button>
    </div>
  );
}
