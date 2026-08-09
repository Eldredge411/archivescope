import Link from "next/link";
import type { Country } from "@/types";
import { countryStatusBadge, countryStatusZh } from "@/lib/display";

type CountryCardProps = {
  country: Country;
};

export function CountryCard({ country }: CountryCardProps) {
  const content = (
    <>
      <div className="country-file-card__top">
        <span>
          {country.nameZh}
        </span>
        <b className={countryStatusBadge[country.status]}>
          {countryStatusZh[country.status]}
        </b>
      </div>
      <small>{country.code}</small>
      <p>
        {country.descriptionZh}
      </p>
      {country.status === "active" ? (
        <em>
          查看已上线板块
        </em>
      ) : (
        <em>
          正在整理资料
        </em>
      )}
    </>
  );

  if (country.id === "usa") {
    return (
      <Link
        href={`/countries/${country.slug}`}
        className="country-file-card is-active"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="country-file-card">
      {content}
    </article>
  );
}
