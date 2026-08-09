import type { Metadata } from "next";
import { UsInstitutionNavigator } from "@/components/UsInstitutionNavigator";
import { countries, institutions, resources } from "@/data/mockData";

export const metadata: Metadata = {
  title: "ArchiveScope USA 机构导航 | ArchiveScope",
  description:
    "整理美国档案相关机构，包括联邦机构、各州机构、社会机构、高校与研究机构、商业与服务机构等。",
};

export default function UsaInstitutionsPage() {
  const usa = countries.find((country) => country.id === "usa");
  const usaInstitutions = institutions.filter(
    (institution) => institution.countryId === "usa",
  );

  return (
    <>
      <UsInstitutionNavigator
        institutions={usaInstitutions}
        resources={resources.filter((resource) => resource.countryId === "usa")}
        countryName={usa?.nameZh ?? "美国"}
      />
    </>
  );
}
