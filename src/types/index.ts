export type CountryStatus = "active" | "coming_soon" | "planned";

export type InstitutionGroup =
  | "federal"
  | "state"
  | "social"
  | "academic"
  | "commercial"
  | "other";

export type InstitutionTypeCode =
  | "archives"
  | "library"
  | "museum"
  | "association"
  | "government"
  | "research"
  | "company"
  | "nonprofit"
  | "other";

export type ResourceType =
  | "law"
  | "regulation"
  | "policy"
  | "strategy"
  | "guidance"
  | "portal"
  | "catalog"
  | "database"
  | "program"
  | "system"
  | "report";

export type LinkStatus = "ok" | "redirect" | "broken" | "unknown";

export type Visibility = "public" | "restricted" | "private";

export type ResourceFileType =
  | "screenshot"
  | "pdf"
  | "html"
  | "document"
  | "image"
  | "web_archive"
  | "csv"
  | "json"
  | "other";

export type CopyrightStatus =
  | "public_domain"
  | "government_work"
  | "copyrighted"
  | "unknown";

export type ResourceVersionStatus =
  | "current"
  | "superseded"
  | "repealed"
  | "historical"
  | "draft"
  | "unknown";

export type ResourceStatus =
  | "imported_draft"
  | "draft"
  | "published_draft"
  | "reviewed"
  | "published"
  | "needs_review"
  | "archived";

export type EntityType =
  | "country"
  | "institution"
  | "resource"
  | "topic"
  | "version"
  | "file";

export type RelationType =
  | "issued_by"
  | "created_by"
  | "managed_by"
  | "operated_by"
  | "participates_in"
  | "collaborates_with"
  | "funded_by"
  | "part_of"
  | "supervises"
  | "related_to"
  | "belongs_to_topic"
  | "located_in"
  | "replaces"
  | "replaced_by";

export type RelationConfidence = "high" | "medium" | "low";

export interface Country {
  id: string;
  slug: string;
  code: string;
  nameZh: string;
  nameEn: string;
  iso2: string;
  iso3: string;
  status: CountryStatus;
  descriptionZh: string;
  sortIndex: number;
}

export interface Institution {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  shortName: string;
  countryId: string;
  institutionGroup?: InstitutionGroup;
  institutionTypeCode?: InstitutionTypeCode;
  institutionType: string;
  institutionSubType: string;
  institutionLevel: string;
  stateCode?: string;
  stateName?: string;
  stateNameZh?: string;
  location: string;
  descriptionZh: string;
  officialUrl: string;
  tags: string[];
  linkStatus: LinkStatus;
  lastCheckedAt: string;
  establishedYear?: number;
}

export interface Topic {
  id: string;
  slug: string;
  titleZh: string;
  titleEn: string;
  shortDescription: string;
  plainQuestion: string;
  description: string;
  examples: string[];
  relatedKeywords: string[];
  sortIndex: number;
}

export interface Resource {
  id: string;
  slug: string;
  slugAliases?: string[];
  sourceResourceIds?: string[];
  titleZh: string;
  titleEn: string;
  countryId: string;
  institutionId: string;
  resourceType: ResourceType;
  primaryTopicId: string;
  topicIds: string[];
  tags: string[];
  summaryShort?: string;
  summaryZh: string;
  keyPoints: string[];
  researchValue: string;
  publishDate: string;
  updatedDate: string;
  collectedAt: string;
  sourceUrl: string;
  sourceDomain: string;
  accessDate: string;
  lastCheckedAt: string;
  linkStatus: LinkStatus;
  archivedUrl: string | null;
  hasBackup: boolean;
  backupVisibility: Visibility;
  hasVersions: boolean;
  currentVersionId?: string;
  versioningApplicable?: boolean;
  versionNote?: string;
  status?: ResourceStatus;
}

export interface ResourceFile {
  id: string;
  resourceId: string;
  versionId?: string;
  fileType: ResourceFileType;
  fileName: string;
  fileUrl: string;
  originalUrl?: string;
  capturedAt: string;
  uploadedAt?: string;
  visibility: Visibility;
  description: string;
  fileSize?: number;
  mimeType?: string;
  checksum: string;
  copyrightStatus: CopyrightStatus;
  notes?: string;
}

export interface ResourceVersion {
  id: string;
  resourceId: string;
  versionTitle: string;
  versionNumber?: string;
  versionStatus: ResourceVersionStatus;
  publishDate?: string;
  effectiveDate?: string;
  replacedDate?: string;
  sourceUrl?: string;
  archivedUrl?: string | null;
  summaryZh?: string;
  keyChanges: string[];
  aiSummary?: string;
  humanNote?: string;
  relatedFileIds?: string[];
}

export interface EntityRelation {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationType: RelationType;
  relationLabelZh: string;
  descriptionZh?: string;
  evidenceResourceId?: string;
  sourceUrl?: string;
  confidence?: RelationConfidence;
}
