import type { LinkStatus, ResourceType, Visibility } from "@/types";

export type DraftReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_review"
  | "published";

export type SourceType =
  | "api"
  | "sitemap"
  | "rss"
  | "webpage"
  | "search"
  | "manual";

export type TargetEntityType = "resource" | "institution" | "unknown";

export type EntityTypeConfidence = "high" | "medium" | "low";

export interface SourceConfig {
  id: string;
  nameZh: string;
  nameEn: string;
  countryId: string;
  institutionId?: string;
  sourceType: SourceType;
  baseUrl: string;
  descriptionZh: string;
  relatedResourceTypes: ResourceType[];
  relatedTopicIds: string[];
  keywords: string[];
  enabled: boolean;
  notes?: string;
}

export interface ResourceDraft {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  titleEn: string;
  titleZh?: string;
  slug?: string;
  countryId: string;
  institutionId?: string;
  resourceType?: ResourceType;
  primaryTopicId?: string;
  topicIds: string[];
  tags: string[];
  language: string;
  summaryZh?: string;
  keyPoints?: string[];
  researchValue?: string;
  sourceUrl: string;
  sourceDomain?: string;
  publishDate?: string;
  updatedDate?: string;
  accessDate: string;
  linkStatus: LinkStatus;
  hasBackup: boolean;
  backupVisibility?: Visibility;
  archivedUrl?: string;
  versioningApplicable?: boolean;
  targetEntityType?: TargetEntityType;
  entityTypeConfidence?: EntityTypeConfidence;
  classificationReason?: string;
  reviewStatus: DraftReviewStatus;
  duplicateOf?: string;
  rawData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionRun {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt?: string;
  status: "success" | "failed" | "partial";
  totalFound: number;
  totalCreated: number;
  totalDuplicates: number;
  errorMessage?: string;
}
