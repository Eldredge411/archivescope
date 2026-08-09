import { CountryCard } from "@/components/CountryCard";
import { CountryResourceMap } from "@/components/CountryResourceMap";
import { countries, institutions, resources } from "@/data/mockData";

export default function CountriesPage() {
  return (
    <main className="country-geo-page">
      <CountryResourceMap
        countries={countries}
        institutions={institutions}
        resources={resources}
      />

      <section className="country-index-section">
        <div className="country-index-shell">
          <div className="country-index-heading">
            <div>
              <span>Country Files</span>
              <h2>
                国家地区档案索引
              </h2>
              <p>
                美国板块已上线，其他国家地区资料正在逐步整理。
              </p>
            </div>
          </div>
          <div className="country-index-grid">
            {countries.map((country) => (
              <CountryCard key={country.id} country={country} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
