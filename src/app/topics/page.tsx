import { topics } from "@/data/mockData";
import { getResourcesByTopic } from "@/lib/data";
import Link from "next/link";

export default function TopicsPage() {
  const sortedTopics = [...topics]
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((topic, index) => ({
      topic,
      index,
      resourceCount: getResourcesByTopic(topic.id).length,
    }));
  const totalResourceCount = sortedTopics.reduce(
    (sum, item) => sum + item.resourceCount,
    0,
  );

  return (
    <main className="topic-dossier-page topic-index-page">
      <div className="topic-dossier-shell topic-index-shell">
        <section className="topic-reader-stage topic-index-stage" aria-label="研究专题总档案袋">
          <div className="topic-reader-shadow" aria-hidden="true" />
          <article className="topic-reader-cover topic-index-cover">
            <span className="topic-reader-cover__tab">INDEX</span>
            <div className="topic-reader-cover__topline">
              <span>ARCHIVESCOPE</span>
              <span>RESEARCH TOPIC INDEX</span>
            </div>

            <div className="topic-reader-cover__plate">
              <div>
                <small>档案袋</small>
                <strong>研究专题</strong>
              </div>
              <div>
                <small>Topic Index</small>
                <strong>Archive Research Files</strong>
              </div>
              <div>
                <small>Records</small>
                <strong>{totalResourceCount}</strong>
              </div>
            </div>

            <p className="topic-reader-cover__question">
              选择一个专题名称，进入对应专题页查看资料、关键词和关联索引。
            </p>

            <div className="topic-reader-cover__directory topic-index-directory">
              <span>专题目录</span>
              {sortedTopics.map(({ topic, index, resourceCount }) => (
                <Link key={topic.id} href={`/topics/${topic.slug}`}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span className="topic-index-entry">
                    <strong>{topic.titleZh}</strong>
                    <em>{topic.plainQuestion}</em>
                  </span>
                  <small>{resourceCount}</small>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
