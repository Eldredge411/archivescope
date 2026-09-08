import { getResourcesByTopic } from "@/lib/data";
import { topics } from "@/data/mockData";

export interface StackTopic {
  slug: string;
  titleZh: string;
  titleEn: string;
  plainQuestion: string;
  description: string;
  resourceCount: number;
}

export function getStackTopics(): StackTopic[] {
  return [...topics]
    .sort((current, next) => current.sortIndex - next.sortIndex)
    .map((topic) => ({
      slug: topic.slug,
      titleZh: topic.titleZh,
      titleEn: topic.titleEn,
      plainQuestion: topic.plainQuestion,
      description: topic.description,
      resourceCount: getResourcesByTopic(topic.id).length,
    }));
}
