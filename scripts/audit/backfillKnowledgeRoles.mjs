import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const resourceEnrichmentsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichments.ts",
);
const outputPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceKnowledgeRoles.json",
);
const reportPath = path.join(
  projectRoot,
  "src/data/admin/knowledgeRoleGapReport.json",
);

const reviewedRoles = {
  "fr-2026-14921": "public_participation",
  "fr-2026-12241": "public_participation",
  "fr-2026-11899": "public_participation",
  "fr-2026-10901": "public_participation",
  "fr-2023-21867": "public_participation",
  "fr-2022-07580": "method_standard",
  "fr-2016-31010": "institutional_norm",
  "fr-2015-02454": "project_practice",
  "fr-2014-29854": "public_participation",
  "fr-2014-28697": "institutional_norm",
  "fr-2014-07854": "public_participation",
  "fr-2013-15564": "public_participation",
  "fr-99-26611": "public_participation",
  "fr-2026-14068": "public_participation",
  "fr-2025-21698": "public_participation",
  "fr-2024-23877": "public_participation",
  "fr-2024-05673": "public_participation",
  "fr-2023-21049": "public_participation",
  "fr-2022-23030": "public_participation",
  "fr-2022-01086": "public_participation",
  "fr-2021-24395": "public_participation",
  "fr-2021-07713": "public_participation",
  "fr-2020-21373": "public_participation",
  "fr-2020-14178": "public_participation",
  "fr-2019-14508": "public_participation",
  "fr-2019-13085": "public_participation",
  "fr-2019-11521": "public_participation",
  "fr-2018-20746": "public_participation",
  "fr-2015-30033": "public_participation",
  "fr-2015-03364": "public_participation",
  "fr-2014-18565": "public_participation",
  "fr-2014-12146": "public_participation",
  "fr-2012-16655": "institutional_norm",
  "fr-2011-492": "institutional_norm",
  "fr-00-5674": "institutional_norm",
  "fr-2020-04157": "platform_system",
  "fr-2018-08315": "public_participation",
  "fr-2017-03502": "institutional_norm",
  "fr-2017-06650": "public_participation",
  "fr-2018-20007": "public_participation",
  "fr-2018-20000": "public_participation",
  "fr-2016-30948": "public_participation",
  "fr-2016-26952": "project_practice",
  "fr-2015-19844": "public_participation",
  "fr-2012-4213": "public_participation",
  "fr-2011-4612": "institutional_norm",
  "fr-2010-17997": "public_participation",
  "fr-2010-8787": "public_participation",
  "fr-E8-30885": "institutional_norm",
  "fr-E8-17316": "public_participation",
  "fr-E8-13465": "institutional_norm",
  "fr-E6-11763": "institutional_norm",
  "fr-05-8765": "project_practice",
  "fr-99-30973": "institutional_norm",
  "fr-94-13517": "institutional_norm",
  "fr-95-25548": "institutional_norm",
  "ecfr-36-cfr-1231": "institutional_norm",
  "ecfr-36-cfr-1233": "institutional_norm",
  "nara-federal-agency-reporting": "platform_system",
  "nara-federal-records-centers": "platform_system",
  "loc-digital-preservation": "platform_system",
  "loc-recommended-formats-statement": "method_standard",
  "loc-sustainability-of-digital-formats": "method_standard",
  "loc-labs-machine-learning": "project_practice",
  "loc-digital-scholarship": "platform_system",
  "loc-by-the-people": "public_participation",
  "dpla-digital-public-library": "platform_system",
  "saa-standards-portal": "method_standard",
  "cosa-resource-center": "platform_system",
};

const baseResourceRoles = {
  "res-federal-records-act": "institutional_norm",
  "res-presidential-records-act": "institutional_norm",
  "res-freedom-of-information-act": "institutional_norm",
  "res-nara-catalog": "platform_system",
  "res-nara-digital-preservation-strategy": "policy_strategy",
  "res-nara-records-management-guidance": "method_standard",
  "res-citizen-archivist": "public_participation",
  "res-electronic-records-archives": "platform_system",
};

const roleLabels = {
  institutional_norm: "制度规范",
  policy_strategy: "政策战略",
  platform_system: "平台系统",
  method_standard: "方法标准",
  project_practice: "项目实践",
  public_participation: "公众参与",
};

const participationKeywords = [
  "advisory committee",
  "annual meeting",
  "annual open meeting",
  "committee meeting",
  "comment",
  "meeting notice",
  "nomination",
  "open meeting",
  "solicitation",
  "征求",
  "会议",
  "提名",
  "公众",
];

function includesParticipationKeyword(resource) {
  const text = [
    resource.titleZh,
    resource.titleEn,
    ...(resource.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return participationKeywords.some((keyword) => text.includes(keyword));
}

function deriveRole(resource) {
  if (includesParticipationKeyword(resource)) {
    return "public_participation";
  }

  switch (resource.resourceType) {
    case "law":
    case "regulation":
      return "institutional_norm";
    case "policy":
    case "strategy":
      return "policy_strategy";
    case "portal":
    case "catalog":
    case "database":
    case "system":
      return "platform_system";
    case "guidance":
      return "method_standard";
    default:
      return "project_practice";
  }
}

function loadResourceEnrichments() {
  const source = fs.readFileSync(resourceEnrichmentsPath, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleExports = {};
  new Function("exports", javascript)(moduleExports);

  return moduleExports.resourceEnrichments ?? [];
}

function createResourceRoles() {
  const acceptedResources = JSON.parse(
    fs.readFileSync(acceptedResourcesPath, "utf8"),
  );
  const resourceRoles = { ...baseResourceRoles };

  for (const resource of acceptedResources) {
    resourceRoles[resource.id] =
      reviewedRoles[resource.id] ?? deriveRole(resource);
  }

  return resourceRoles;
}

function createGapReport(resourceRoles, acceptedResources) {
  const acceptedById = new Map(
    acceptedResources.map((resource) => [resource.id, resource]),
  );
  const enrichmentById = new Map(
    loadResourceEnrichments().map((enrichment) => [enrichment.resourceId, enrichment]),
  );
  const reviewed = Object.fromEntries(
    Object.entries(reviewedRoles).map(([id, role]) => [
      id,
      {
        role,
        label: roleLabels[role],
        title: acceptedById.get(id)?.titleZh || acceptedById.get(id)?.titleEn || "",
      },
    ]),
  );
  const counts = Object.fromEntries(
    Object.keys(roleLabels).map((role) => [
      role,
      Object.values(resourceRoles).filter((value) => value === role).length,
    ]),
  );
  const missingContent = Object.entries(resourceRoles)
    .flatMap(([id, role]) => {
      const resource = acceptedById.get(id);
      const enrichment = enrichmentById.get(id);

      if (!resource) {
        return [];
      }

      const summary = resource.summaryZh || enrichment?.summaryZh || "";
      const keyPoints = [
        ...(resource.keyPoints ?? []),
        ...(enrichment?.keyPoints ?? []),
      ];

      if (!resource || (!summary && keyPoints.length !== 0)) {
        return [];
      }

      if (summary && keyPoints.length > 0) {
        return [];
      }

      return [{
      id,
      role,
      title: acceptedById.get(id)?.titleZh || acceptedById.get(id)?.titleEn || "",
      missingSummary: !summary,
      missingKeyPoints: keyPoints.length === 0,
      }];
    });
  const priority = [
    "method_standard",
    "public_participation",
    "policy_strategy",
    "platform_system",
    "project_practice",
    "institutional_norm",
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalResources: Object.keys(resourceRoles).length,
      reviewedResources: Object.keys(reviewedRoles).length,
      explicitRoleResources: Object.keys(resourceRoles).length,
      missingContentResources: missingContent.length,
    },
    counts: Object.fromEntries(
      Object.entries(counts).map(([role, count]) => [
        role,
        { label: roleLabels[role], count },
      ]),
    ),
    reviewDecisions: reviewed,
    priorityOrder: priority,
    missingContent,
  };
}

const resourceRoles = createResourceRoles();
const report = createGapReport(resourceRoles, JSON.parse(
  fs.readFileSync(acceptedResourcesPath, "utf8"),
));

fs.writeFileSync(outputPath, `${JSON.stringify(resourceRoles, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`已写入建设分类映射：${path.relative(projectRoot, outputPath)}`);
console.log(`已写入内容缺口报告：${path.relative(projectRoot, reportPath)}`);
console.log(
  `显式分类 ${Object.keys(resourceRoles).length} 条；人工复核 ${Object.keys(reviewedRoles).length} 条。`,
);
