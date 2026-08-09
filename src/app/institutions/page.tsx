import Link from "next/link";
import { countries, institutions } from "@/data/mockData";

const countryEntries = [
  {
    countryId: "uk",
    href: "",
    statusLabel: "建设中",
    description: "英国国家档案馆、地方档案馆与专业机构导航规划中。",
  },
  {
    countryId: "canada",
    href: "",
    statusLabel: "建设中",
    description: "加拿大联邦、地方与专业档案机构导航规划中。",
  },
  {
    countryId: "usa",
    href: "/institutions/usa",
    statusLabel: "已建设",
    description:
      "联邦机构、社会机构、高校与研究机构、商业与服务机构等美国档案相关机构导航。",
  },
  {
    countryId: "australia",
    href: "",
    statusLabel: "建设中",
    description: "澳大利亚国家与州级档案机构导航规划中。",
  },
  {
    countryId: "japan",
    href: "",
    statusLabel: "建设中",
    description: "日本国立公文书馆及相关机构导航规划中。",
  },
];

export default function InstitutionsPage() {
  return (
    <main className="institution-index-page">
      <section className="institution-index-hero">
        <div className="institution-index-copy">
          <span>Institution Files</span>
          <h1>机构导航</h1>
          <p>
            按国家整理档案馆、图书馆、协会、研究机构与服务组织。选择一个国家档案盒，进入对应机构目录。
          </p>
        </div>

        <div className="institution-country-box-row" aria-label="国家机构档案盒">
          {countryEntries.map((entry, index) => {
            const country = countries.find(
              (candidate) => candidate.id === entry.countryId,
            );
            const institutionCount = institutions.filter(
              (institution) => institution.countryId === entry.countryId,
            ).length;
            const isReady = Boolean(entry.href);
            const box = (
              <article
                className={`institution-country-box institution-country-box--${
                  index + 1
                } ${isReady ? "is-ready" : "is-planned"}`}
              >
                <div className="institution-country-box__spine">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{country?.nameZh ?? entry.countryId}</strong>
                  <small>{country?.nameEn ?? "Planned country entry"}</small>
                </div>
                <div className="institution-country-box__paper">
                  <div>
                    <span>{entry.statusLabel}</span>
                    <strong>{institutionCount} 个机构</strong>
                  </div>
                  <h2>{country?.nameZh ?? entry.countryId}</h2>
                  <p>{entry.description}</p>
                  <em>{isReady ? "打开机构档案" : "等待补充"}</em>
                </div>
              </article>
            );

            return isReady ? (
              <Link key={entry.countryId} href={entry.href} className="institution-country-box-link">
                {box}
              </Link>
            ) : (
              <div key={entry.countryId} aria-disabled="true">
                {box}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
