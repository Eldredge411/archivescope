import { UsaCountryDossier } from "@/components/UsaCountryDossier";
import { countries, institutions, resources, topics } from "@/data/mockData";

const country = countries.find((item) => item.id === "usa");
const usaInstitutions = institutions.filter(
  (institution) => institution.countryId === "usa",
);
const usaResources = resources.filter((resource) => resource.countryId === "usa");
const usaTopics = [...topics].sort((a, b) => a.sortIndex - b.sortIndex);

export default function UsaCountryPage() {
  if (!country) {
    return null;
  }

  return (
    <UsaCountryDossier
      country={country}
      institutions={usaInstitutions}
      resources={usaResources}
      topics={usaTopics}
    />
  );
}
