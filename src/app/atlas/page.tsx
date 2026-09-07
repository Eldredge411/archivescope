import { KnowledgeAtlas } from "@/components/KnowledgeAtlas";
import { institutions, resources, topics } from "@/data/mockData";

export default async function AtlasPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  return (
    <KnowledgeAtlas
      focusResourceId={focus}
      topics={topics}
      resources={resources}
      institutions={institutions}
    />
  );
}
