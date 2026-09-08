import { ArchiveStacksScene } from "@/components/Stacks/ArchiveStacksScene";
import { getStackTopics } from "@/lib/stacks/topicsData";

export default function StacksPage() {
  const stackTopics = getStackTopics();

  return <ArchiveStacksScene stackTopics={stackTopics} />;
}
