import type { Metadata } from "next";
import Script from "next/script";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const mode = localStorage.getItem("archivescope-theme");
    document.documentElement.classList.toggle("dark", mode === "dark");
  } catch {}
})();
`;

export const metadata: Metadata = {
  title: "ArchiveScope | 全球档案知识库",
  description:
    "面向中文档案学研究者的全球档案政策、法规、项目与数字资源建设知识库。首版聚焦美国板块。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script
          id="archivescope-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <SiteHeader />
        <main className="flex-1 bg-zinc-50 dark:bg-black">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
