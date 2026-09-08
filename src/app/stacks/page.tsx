import { ArchiveStacksScene } from "@/components/Stacks/ArchiveStacksScene";
import {
  getStackResourceCount,
  getStackTopics,
} from "@/lib/stacks/topicsData";

export default function StacksPage() {
  const stackTopics = getStackTopics();
  const resourceCount = getStackResourceCount();

  return <ArchiveStacksScene stackTopics={stackTopics} resourceCount={resourceCount} />;
}
