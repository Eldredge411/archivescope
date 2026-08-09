import { KnowledgeAtlas } from "@/components/KnowledgeAtlas";
import { institutions, resources, topics } from "@/data/mockData";

export default function AtlasPage() {
  return (
    <KnowledgeAtlas
      topics={topics}
      resources={resources}
      institutions={institutions}
    />
  );
}
