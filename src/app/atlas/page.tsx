import { ArchiveKnowledgeRoom } from "@/components/ArchiveKnowledgeRoom";
import { entityRelations, institutions, resources, topics } from "@/data/mockData";

export default async function AtlasPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  await searchParams;

  return (
    <ArchiveKnowledgeRoom topics={topics} resources={resources} institutions={institutions} relations={entityRelations}/>
  );
}
