import {
  countries,
  entityRelations,
  institutions,
  resourceFiles,
  resourceVersions,
  resources,
  topics,
} from "@/data/mockData";
import type { EntityType, Resource, ResourceFile, ResourceFileType } from "@/types";

export type ResourceSnapshotStatus = "complete" | "partial" | "none";

const requiredSnapshotFileTypes = ["pdf", "screenshot"] satisfies ResourceFileType[];
const minimumUsableSnapshotFileSize: Partial<Record<ResourceFileType, number>> = {
  pdf: 50_000,
  screenshot: 50_000,
};

const snapshotStatusMeta: Record<ResourceSnapshotStatus, { label: string }> = {
  complete: {
    label: "已完整备份",
  },
  partial: {
    label: "部分备份",
  },
  none: {
    label: "未备份",
  },
};

function isPublicSnapshotFileType(fileType: ResourceFileType) {
  return (requiredSnapshotFileTypes as readonly string[]).includes(fileType);
}

function isUsableSnapshotFile(file: ResourceFile) {
  if (!isPublicSnapshotFileType(file.fileType)) {
    return true;
  }

  const minimumFileSize = minimumUsableSnapshotFileSize[file.fileType];

  if (typeof minimumFileSize === "number" && typeof file.fileSize === "number") {
    return file.fileSize >= minimumFileSize;
  }

  return true;
}

export function getCountryById(id: string) {
  return countries.find((country) => country.id === id);
}

export function getInstitutionById(id: string) {
  return institutions.find((institution) => institution.id === id);
}

export function getInstitutionBySlug(slug: string) {
  return institutions.find((institution) => institution.slug === slug);
}

export function getTopicById(id: string) {
  return topics.find((topic) => topic.id === id);
}

export function getTopicBySlug(slug: string) {
  return topics.find((topic) => topic.slug === slug);
}

export function getResourceBySlug(slug: string) {
  return resources.find(
    (resource) =>
      resource.slug === slug || resource.slugAliases?.includes(slug),
  );
}

export function getResourcesByCountry(countryId: string) {
  return resources.filter((resource) => resource.countryId === countryId);
}

export function getResourcesByInstitution(institutionId: string) {
  return resources.filter((resource) => resource.institutionId === institutionId);
}

export function getResourcesByTopic(topicId: string) {
  return resources.filter((resource) => resource.topicIds.includes(topicId));
}

export function getPrimaryTopic(resource: Resource) {
  return getTopicById(resource.primaryTopicId);
}

export function getResourceFiles(resourceId: string) {
  const resource = resources.find((candidate) => candidate.id === resourceId);
  const resourceIds = new Set([resourceId, ...(resource?.sourceResourceIds ?? [])]);

  return resourceFiles.filter(
    (file) => resourceIds.has(file.resourceId) && isUsableSnapshotFile(file),
  );
}

export function getResourceSnapshotStatus(resourceId: string) {
  const fileTypes = Array.from(
    new Set(
      getResourceFiles(resourceId)
        .filter(
          (file) =>
            file.visibility === "public" && isPublicSnapshotFileType(file.fileType),
        )
        .map((file) => file.fileType),
    ),
  ).sort();
  const missingFileTypes = requiredSnapshotFileTypes.filter(
    (fileType) => !fileTypes.includes(fileType),
  );
  const status: ResourceSnapshotStatus =
    missingFileTypes.length === 0
      ? "complete"
      : fileTypes.length > 0
        ? "partial"
        : "none";

  return {
    status,
    label: snapshotStatusMeta[status].label,
    fileTypes,
    missingFileTypes,
  };
}

export function getResourceVersions(resourceId: string) {
  return resourceVersions.filter((version) => version.resourceId === resourceId);
}

export function getRelationsBySource(sourceType: EntityType, sourceId: string) {
  return entityRelations.filter(
    (relation) =>
      relation.sourceType === sourceType && relation.sourceId === sourceId,
  );
}

export function getInstitutionDisplayName(institutionId: string) {
  const institution = getInstitutionById(institutionId);

  return institution?.shortName ?? institution?.nameZh ?? institutionId;
}

export function getTopicTitles(topicIds: string[]) {
  return topicIds
    .map((topicId) => getTopicById(topicId)?.titleZh)
    .filter((title): title is string => Boolean(title));
}
