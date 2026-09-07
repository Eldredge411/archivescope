import { curatedAuthorizationDrafts } from "@/lib/atlas/curatedRelations";
import type {
  EntityRelation,
  Institution,
  Resource,
  ResourceVersion,
} from "@/types";

export type AtlasGraphEdgeType =
  | "AUTHORIZE"
  | "AMEND"
  | "SUPERSEDE"
  | "ISSUED_BY"
  | "OPERATED_BY"
  | "INFERRED";

export type AtlasGraphEdgeStatus = "verified" | "inferred";

export type AtlasGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: AtlasGraphEdgeType;
  status: AtlasGraphEdgeStatus;
  evidenceResourceIds: string[];
  labelZh: string;
  labelEn: string;
};

export type AtlasGraphNode = {
  id: string;
  kind: "resource" | "institution";
  label: string;
};

export type AtlasGraph = {
  nodes: AtlasGraphNode[];
  edges: AtlasGraphEdge[];
};

const edgeLabels: Record<AtlasGraphEdgeType, { labelZh: string; labelEn: string }> = {
  AUTHORIZE: { labelZh: "授权", labelEn: "AUTHORIZES" },
  AMEND: { labelZh: "修订", labelEn: "AMENDS" },
  SUPERSEDE: { labelZh: "取代", labelEn: "SUPERSEDES" },
  ISSUED_BY: { labelZh: "发布", labelEn: "ISSUES" },
  OPERATED_BY: { labelZh: "运营", labelEn: "OPERATES" },
  INFERRED: { labelZh: "研究线索", labelEn: "LEAD" },
};

function createEdge(options: {
  id: string;
  source: string;
  target: string;
  type: AtlasGraphEdgeType;
  status: AtlasGraphEdgeStatus;
  evidenceResourceIds?: string[];
}): AtlasGraphEdge {
  return {
    ...options,
    evidenceResourceIds: options.evidenceResourceIds ?? [],
    ...edgeLabels[options.type],
  };
}

function normalizeInstitutionRelation(
  relation: EntityRelation,
): AtlasGraphEdge | null {
  if (relation.sourceType !== "institution" || relation.targetType !== "resource") {
    return null;
  }

  if (relation.relationType === "issued_by") {
    return createEdge({
      id: `graph-${relation.id}`,
      source: relation.sourceId,
      target: relation.targetId,
      type: "ISSUED_BY",
      status: "verified",
      evidenceResourceIds: [relation.targetId],
    });
  }

  if (relation.relationType === "operated_by") {
    return createEdge({
      id: `graph-${relation.id}`,
      source: relation.sourceId,
      target: relation.targetId,
      type: "OPERATED_BY",
      status: "verified",
      evidenceResourceIds: [relation.targetId],
    });
  }

  return null;
}

function normalizeReplacedRelation(
  relation: EntityRelation,
): AtlasGraphEdge | null {
  if (
    relation.sourceType !== "resource" ||
    relation.targetType !== "resource"
  ) {
    return null;
  }

  if (relation.relationType === "replaces") {
    return createEdge({
      id: `graph-${relation.id}`,
      source: relation.sourceId,
      target: relation.targetId,
      type: "SUPERSEDE",
      status: "verified",
      evidenceResourceIds: [relation.evidenceResourceId ?? relation.sourceId],
    });
  }

  if (relation.relationType === "replaced_by") {
    return createEdge({
      id: `graph-${relation.id}`,
      source: relation.targetId,
      target: relation.sourceId,
      type: "SUPERSEDE",
      status: "verified",
      evidenceResourceIds: [relation.evidenceResourceId ?? relation.targetId],
    });
  }

  return null;
}

function normalizeDocumentEvolutionRelation(
  relation: EntityRelation,
): AtlasGraphEdge | null {
  if (
    relation.sourceType !== "resource" ||
    relation.targetType !== "resource" ||
    relation.relationType !== "related_to"
  ) {
    return null;
  }

  const label = relation.relationLabelZh;
  const hasAmendTerm = label.includes("修订") || label.includes("延伸");
  const hasSupersedeTerm =
    label.includes("更正") || label.includes("后续传送通知");

  if (!hasAmendTerm && !hasSupersedeTerm) {
    return null;
  }

  return createEdge({
    id: `graph-${relation.id}`,
    source: relation.sourceId,
    target: relation.targetId,
    type: hasSupersedeTerm ? "SUPERSEDE" : "AMEND",
    status: "verified",
    evidenceResourceIds: [relation.evidenceResourceId ?? relation.sourceId],
  });
}

function getVersionDate(version: ResourceVersion) {
  return version.effectiveDate || version.publishDate;
}

function normalizeVersionRelations(
  resourceVersions: ResourceVersion[],
): AtlasGraphEdge[] {
  const eligibleVersions = resourceVersions.filter((version) => {
    const date = getVersionDate(version);
    return Boolean(date) && version.versionStatus !== "unknown";
  });
  const versionsByResourceId = new Map<string, ResourceVersion[]>();

  eligibleVersions.forEach((version) => {
    versionsByResourceId.set(version.resourceId, [
      ...(versionsByResourceId.get(version.resourceId) ?? []),
      version,
    ]);
  });

  const edges: AtlasGraphEdge[] = [];

  versionsByResourceId.forEach((versions, resourceId) => {
    const sortedVersions = [...versions].sort((left, right) =>
      String(getVersionDate(left)).localeCompare(String(getVersionDate(right))),
    );
    const currentVersion = sortedVersions.find(
      (version) => version.versionStatus === "current",
    );

    if (!currentVersion) {
      return;
    }

    sortedVersions
      .filter((version) => version.id !== currentVersion.id)
      .forEach((version) => {
        const type = version.versionStatus === "superseded" ? "SUPERSEDE" : "AMEND";
        edges.push(
          createEdge({
            id: `graph-version-${version.id}-${currentVersion.id}`,
            source: version.resourceId,
            target: resourceId,
            type,
            status: "verified",
            evidenceResourceIds: [version.resourceId],
          }),
        );
      });
  });

  return edges;
}

function normalizeCuratedAuthorizations(
  entityRelations: EntityRelation[],
): AtlasGraphEdge[] {
  return curatedAuthorizationDrafts
    .map((draft) => {
      const sourceRelation = entityRelations.find(
        (relation) => relation.id === draft.sourceRelationId,
      );

      if (!sourceRelation) {
        return null;
      }

      return createEdge({
        id: `graph-${draft.id}`,
        source: draft.source,
        target: draft.target,
        type: draft.type,
        status: draft.status,
        evidenceResourceIds: [
          sourceRelation.evidenceResourceId ?? draft.source,
        ],
      });
    })
    .filter((edge): edge is AtlasGraphEdge => Boolean(edge));
}

function createInferredEdges(resources: Resource[]): AtlasGraphEdge[] {
  const roleOrder = new Map([
    ["institutional_norm", 0],
    ["policy_strategy", 1],
    ["platform_system", 2],
    ["method_standard", 2],
    ["project_practice", 3],
    ["public_participation", 3],
  ]);
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const edges: AtlasGraphEdge[] = [];

  resources.forEach((sourceResource) => {
    const sourceOrder = roleOrder.get(sourceResource.knowledgeRole ?? "");

    if (sourceOrder === undefined || !sourceResource.publishDate) {
      return;
    }

    resources.forEach((targetResource) => {
      const targetOrder = roleOrder.get(targetResource.knowledgeRole ?? "");

      if (
        sourceResource.id === targetResource.id ||
        targetOrder === undefined ||
        targetOrder <= sourceOrder ||
        !targetResource.publishDate ||
        sourceResource.publishDate >= targetResource.publishDate ||
        !sourceResource.topicIds.some((topicId) =>
          targetResource.topicIds.includes(topicId),
        )
      ) {
        return;
      }

      edges.push(
        createEdge({
          id: `graph-inferred-${sourceResource.id}-${targetResource.id}`,
          source: sourceResource.id,
          target: targetResource.id,
          type: "INFERRED",
          status: "inferred",
          evidenceResourceIds: [sourceResource.id, targetResource.id],
        }),
      );
    });
  });

  return edges.filter((edge) => resourceById.has(edge.source));
}

export function buildAtlasGraph(options: {
  resources: Resource[];
  institutions: Institution[];
  resourceVersions: ResourceVersion[];
  entityRelations: EntityRelation[];
}): AtlasGraph {
  const nodes: AtlasGraphNode[] = [
    ...options.resources.map((resource) => ({
      id: resource.id,
      kind: "resource" as const,
      label: resource.titleZh || resource.titleEn,
    })),
    ...options.institutions.map((institution) => ({
      id: institution.id,
      kind: "institution" as const,
      label: institution.shortName || institution.nameZh,
    })),
  ];
  const edges = [
    ...options.entityRelations
      .map(normalizeInstitutionRelation)
      .filter((edge): edge is AtlasGraphEdge => Boolean(edge)),
    ...options.entityRelations
      .map(normalizeReplacedRelation)
      .filter((edge): edge is AtlasGraphEdge => Boolean(edge)),
    ...options.entityRelations
      .map(normalizeDocumentEvolutionRelation)
      .filter((edge): edge is AtlasGraphEdge => Boolean(edge)),
    ...normalizeVersionRelations(options.resourceVersions),
    ...normalizeCuratedAuthorizations(options.entityRelations),
    ...createInferredEdges(options.resources),
  ];
  const knownIds = new Set(nodes.map((node) => node.id));
  const uniqueEdges = new Map<string, AtlasGraphEdge>();

  edges
    .filter((edge) => knownIds.has(edge.source) && knownIds.has(edge.target))
    .forEach((edge) => uniqueEdges.set(edge.id, edge));

  return { nodes, edges: Array.from(uniqueEdges.values()) };
}
