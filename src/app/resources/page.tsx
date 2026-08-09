import { Suspense } from "react";
import Link from "next/link";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { countries, institutions, resources, topics } from "@/data/mockData";
import { resourceTypeZh } from "@/lib/display";
import type { ResourceType } from "@/types";

const resourceTypeStats = Object.entries(resourceTypeZh)
  .map(([type, label]) => ({
    type: type as ResourceType,
    label,
    count: resources.filter((resource) => resource.resourceType === type).length,
  }))
  .filter((item) => item.count > 0);

export default function ResourcesPage() {
  const showFrontendAdminTools =
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_ACTIONS_ENABLED === "true";

  return (
    <div className="archive-library-page">
      <section className="archive-library-hero">
        <div className="archive-library-hero-label">
          <span>ArchiveScope</span>
          <strong>资料库</strong>
        </div>
        <div className="archive-library-hero-tabs" aria-label="资料类型概览">
          {resourceTypeStats.slice(0, 5).map((item, index) => (
            <Link key={item.type} href={`/resources?type=${item.type}`}>
              {String(index + 1).padStart(2, "0")} {item.label}
              <b>{item.count}</b>
            </Link>
          ))}
        </div>
        <div className="archive-library-mode-card" aria-label="资料库统计">
          <span>MODE</span>
          <strong>{resources.length}</strong>
          <small>ITEMS</small>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="archive-library-loading">
            <div>
              正在加载资料库检索条件……
            </div>
          </section>
        }
      >
        <ResourceLibrary
          countries={countries}
          institutions={institutions}
          topics={topics}
          resources={resources}
          adminSnapshotActionsEnabled={showFrontendAdminTools}
        />
      </Suspense>
    </div>
  );
}
