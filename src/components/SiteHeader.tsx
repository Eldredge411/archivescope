"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/countries", label: "国家地区" },
  { href: "/resources", label: "资料库" },
  { href: "/atlas", label: "知识图谱" },
  { href: "/topics", label: "研究专题" },
  { href: "/institutions", label: "机构" },
  { href: "/exhibit", label: "网站说明" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors ${
              active
                ? "bg-[#4b3d31] text-[#fffaf0] dark:bg-zinc-50 dark:text-zinc-950"
                : "text-[#6f5f50] hover:bg-[#fffaf0]/70 hover:text-[#3b3027] dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            } ${compact ? "text-sm" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#c8b99d]/55 bg-[#efeadf]/92 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="ArchiveScope 标识"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-sm object-cover"
          />
          <span>
            <span className="block font-semibold text-[#3b3027] dark:text-zinc-50">
              ArchiveScope
            </span>
            <span className="block text-xs text-[#7a6a59] dark:text-zinc-400">
              全球档案知识库
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden gap-1 text-sm lg:flex" aria-label="主导航">
            <NavLinks />
          </nav>
          <ThemeToggle />
        </div>

        <nav
          className="flex w-full gap-1 overflow-x-auto text-sm lg:hidden"
          aria-label="主导航"
        >
          <NavLinks compact />
        </nav>
      </div>
    </header>
  );
}
