import Link from "next/link";

export default function StacksPage() {
  return (
    <main className="stacks-page">
      <section className="stacks-placeholder">
        <span>Archive Stacks</span>
        <h1>档案架</h1>
        <p>
          H2 将在此展开程序化木纹档案架与档案盒交互。当前可先进入美国档案卷宗继续浏览。
        </p>
        <div>
          <Link href="/countries/usa">查看美国档案卷宗</Link>
          <Link href="/">返回档案地球</Link>
        </div>
      </section>
    </main>
  );
}
