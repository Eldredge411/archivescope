import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const outputPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const institutionsOutputPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedInstitutions.json",
);
const draftSources = [
  {
    sourceKey: "federal-register",
    label: "Federal Register",
    filePath: path.join(
      projectRoot,
      "src/data/drafts/us/federalRegisterDrafts.json",
    ),
  },
  {
    sourceKey: "nara-web",
    label: "NARA 官网",
    filePath: path.join(projectRoot, "src/data/drafts/us/naraWebDrafts.json"),
  },
  {
    sourceKey: "nara-catalog",
    label: "NARA Catalog",
    filePath: path.join(projectRoot, "src/data/drafts/us/naraCatalogDrafts.json"),
  },
  {
    sourceKey: "manual-url",
    label: "手动网址",
    filePath: path.join(projectRoot, "src/data/drafts/us/manualUrlDrafts.json"),
  },
];

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "accepted-resource-draft";
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureTopicIds(primaryTopicId, topicIds) {
  const normalizedPrimaryTopicId =
    String(primaryTopicId || "").trim() || "laws-policies-governance";
  const normalizedTopicIds = readArray(topicIds)
    .map((topicId) => String(topicId || "").trim())
    .filter(Boolean);
  const mergedTopicIds = [
    normalizedPrimaryTopicId,
    ...normalizedTopicIds,
  ].filter((topicId, index, allTopicIds) => allTopicIds.indexOf(topicId) === index);

  return {
    primaryTopicId: normalizedPrimaryTopicId,
    topicIds: mergedTopicIds.length ? mergedTopicIds : [normalizedPrimaryTopicId],
  };
}

function deriveDomain(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getInstitutionId(draft) {
  const rawId = String(draft.id || "").trim();
  const title = `${draft.titleEn || ""} ${draft.titleZh || ""}`.toLowerCase();

  if (rawId.includes("alic") || title.includes("alic")) {
    return "nara-alic";
  }

  if (rawId.includes("presidential-libraries")) {
    return "presidential-libraries";
  }

  if (rawId.includes("about-nara")) {
    return "nara";
  }

  return rawId ? `institution-${rawId}` : `institution-${slugify(draft.titleEn)}`;
}

function getInstitutionCategory(draft) {
  const text = `${draft.titleEn || ""} ${draft.titleZh || ""} ${readArray(
    draft.tags,
  ).join(" ")}`.toLowerCase();

  if (text.includes("presidential libraries")) {
    return {
      categoryId: "archives",
      subcategoryId: "presidential_libraries",
      institutionType: "档案馆系统",
      institutionSubType: "总统档案与博物馆体系",
      institutionGroup: "federal",
      institutionTypeCode: "archives",
    };
  }

  if (
    text.includes("library") ||
    text.includes("information center") ||
    text.includes("图书馆")
  ) {
    return {
      categoryId: "libraries",
      subcategoryId: text.includes("alic")
        ? "research_libraries"
        : "special_libraries",
      institutionType: "图书馆与研究支持机构",
      institutionSubType: text.includes("alic") ? "研究图书馆 / 信息中心" : "图书馆系统",
      institutionGroup: "federal",
      institutionTypeCode: text.includes("alic") ? "research" : "library",
    };
  }

  if (text.includes("museum") || text.includes("博物馆")) {
    return {
      categoryId: "museums",
      subcategoryId: "museums",
      institutionType: "博物馆与文化机构",
      institutionSubType: "博物馆",
      institutionGroup: "federal",
      institutionTypeCode: "museum",
    };
  }

  if (text.includes("association") || text.includes("协会")) {
    return {
      categoryId: "associations",
      subcategoryId: "professional_associations",
      institutionType: "专业协会",
      institutionSubType: "行业组织",
      institutionGroup: "social",
      institutionTypeCode: "association",
    };
  }

  if (text.includes("archives") || text.includes("nara") || text.includes("档案")) {
    return {
      categoryId: "archives",
      subcategoryId: text.includes("about") ? "national_archives" : "archives",
      institutionType: "档案机构",
      institutionSubType: "档案馆 / 档案服务机构",
      institutionGroup: "federal",
      institutionTypeCode: "archives",
    };
  }

  return {
    categoryId: "institutions",
    subcategoryId: "institutions",
    institutionType: "机构",
    institutionSubType: "综合机构",
    institutionGroup: "federal",
    institutionTypeCode: "archives",
  };
}

function toInstitution(draft, now) {
  const collectedAt = formatDate(now);
  const sourceUrl = String(draft.sourceUrl || "").trim();
  const titleEn = String(draft.titleEn || "").trim();
  const titleZh = String(draft.titleZh || "").trim();
  const id = getInstitutionId(draft);
  const category = getInstitutionCategory(draft);
  const slug = String(draft.slug || "").trim() || slugify(titleEn || titleZh || id);
  const tags = readArray(draft.tags)
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);
  const topicIds = readArray(draft.topicIds)
    .map((topicId) => String(topicId || "").trim())
    .filter(Boolean);

  return {
    id,
    slug,
    nameZh: titleZh || titleEn,
    nameEn: titleEn || titleZh,
    abbreviation: /alic/i.test(`${titleEn} ${titleZh}`) ? "ALIC" : "",
    shortName: /alic/i.test(`${titleEn} ${titleZh}`) ? "ALIC" : "",
    countryId: String(draft.countryId || "usa"),
    categoryId: category.categoryId,
    subcategoryId: category.subcategoryId,
    jurisdictionLevel: "national",
    institutionGroup: category.institutionGroup,
    institutionTypeCode: category.institutionTypeCode,
    institutionType: category.institutionType,
    institutionSubType: category.institutionSubType,
    institutionLevel: "联邦",
    location: "United States",
    website: sourceUrl,
    officialUrl: sourceUrl,
    descriptionZh:
      String(draft.summaryZh || "").trim() ||
      "该机构条目由采集流程导入，中文简介待补充。",
    tags,
    relatedTopicIds: topicIds,
    linkStatus: String(draft.linkStatus || "unknown"),
    lastCheckedAt: String(draft.lastCheckedAt || draft.accessDate || collectedAt),
    status: String(draft.status || "active_draft"),
    sourceDraftId: String(draft.id || ""),
    sourceUrl,
    collectedAt,
  };
}

function toResource(draft, now, source) {
  const collectedAt = formatDate(now);
  const sourceUrl = String(draft.sourceUrl || "").trim();
  const { primaryTopicId, topicIds } = ensureTopicIds(
    draft.primaryTopicId,
    draft.topicIds,
  );
  const slug = String(draft.slug || "").trim() || slugify(draft.titleEn);
  const id = String(draft.id || "").trim() || `res-${slug}`;

  return {
    id,
    slug,
    titleZh: String(draft.titleZh || ""),
    titleEn: String(draft.titleEn || ""),
    countryId: String(draft.countryId || "usa"),
    institutionId: String(draft.institutionId || "nara"),
    resourceType: String(draft.resourceType || "strategy"),
    primaryTopicId,
    topicIds,
    tags: readArray(draft.tags)
      .map((tag) => String(tag || "").trim())
      .filter(Boolean),
    language: String(draft.language || "English"),
    summaryZh: String(draft.summaryZh || ""),
    keyPoints: readArray(draft.keyPoints)
      .map((point) => String(point || "").trim())
      .filter(Boolean),
    researchValue: String(draft.researchValue || ""),
    publishDate: String(draft.publishDate || ""),
    updatedDate: String(draft.updatedDate || ""),
    collectedAt,
    sourceUrl,
    sourceDomain:
      source.sourceKey === "nara-web"
        ? "archives.gov"
        : String(draft.sourceDomain || "") || deriveDomain(sourceUrl),
    accessDate: String(draft.accessDate || collectedAt),
    lastCheckedAt: collectedAt,
    linkStatus: String(draft.linkStatus || "ok"),
    archivedUrl: String(draft.archivedUrl || ""),
    hasBackup: Boolean(draft.hasBackup),
    backupVisibility: String(draft.backupVisibility || "private"),
    versioningApplicable:
      typeof draft.versioningApplicable === "boolean"
        ? draft.versioningApplicable
        : true,
    hasVersions: false,
    currentVersionId: "",
    versionNote: "",
    status: String(draft.status || "imported_draft"),
  };
}

function dedupeInstitutions(institutions) {
  const seenIds = new Set();
  const seenWebsites = new Map();
  const seenNamesEn = new Map();
  const uniqueInstitutions = [];

  function hasMeaningfulValue(value) {
    return Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && value !== "";
  }

  function mergeMissingFields(existingInstitution, incomingInstitution) {
    for (const [key, value] of Object.entries(incomingInstitution)) {
      if (
        !hasMeaningfulValue(existingInstitution[key]) &&
        hasMeaningfulValue(value)
      ) {
        existingInstitution[key] = value;
      }
    }
  }

  for (const institution of institutions) {
    const id = String(institution.id || "").trim();
    const website = String(
      institution.officialUrl || institution.website || institution.sourceUrl || "",
    ).trim();
    const nameEn = String(institution.nameEn || "").trim().toLowerCase();

    if (id && seenIds.has(id)) {
      const existingInstitution = uniqueInstitutions.find(
        (item) => String(item.id || "").trim() === id,
      );

      if (existingInstitution) {
        mergeMissingFields(existingInstitution, institution);
      }

      continue;
    }

    if (website && seenWebsites.has(website)) {
      mergeMissingFields(uniqueInstitutions[seenWebsites.get(website)], institution);
      continue;
    }

    if (nameEn && seenNamesEn.has(nameEn)) {
      mergeMissingFields(uniqueInstitutions[seenNamesEn.get(nameEn)], institution);
      continue;
    }

    if (id) {
      seenIds.add(id);
    }

    if (website) {
      seenWebsites.set(website, uniqueInstitutions.length);
    }

    if (nameEn) {
      seenNamesEn.set(nameEn, uniqueInstitutions.length);
    }

    uniqueInstitutions.push(institution);
  }

  return uniqueInstitutions;
}

function dedupeResources(resources) {
  const seenIds = new Set();
  const seenSourceUrls = new Set();
  const seenTitles = new Set();
  const uniqueResources = [];

  for (const resource of resources) {
    const id = String(resource.id || "").trim();
    const sourceUrl = String(resource.sourceUrl || "").trim();
    const titleEn = String(resource.titleEn || "").trim().toLowerCase();

    if (id && seenIds.has(id)) {
      continue;
    }

    if (sourceUrl && seenSourceUrls.has(sourceUrl)) {
      continue;
    }

    if (titleEn && seenTitles.has(titleEn)) {
      continue;
    }

    if (id) {
      seenIds.add(id);
    }

    if (sourceUrl) {
      seenSourceUrls.add(sourceUrl);
    }

    if (titleEn) {
      seenTitles.add(titleEn);
    }

    uniqueResources.push(resource);
  }

  return uniqueResources;
}

async function readJsonArray(filePath) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw new Error(
      `${path.relative(projectRoot, filePath)} 读取或解析失败：${error.message}`,
    );
  }
}

async function readDraftSource(source) {
  try {
    const drafts = await readJsonArray(source.filePath);
    const acceptedDrafts = drafts.filter(
      (draft) => draft.reviewStatus === "accepted",
    );

    console.log(
      `${source.label}：读取 ${drafts.length} 条，accepted ${acceptedDrafts.length} 条`,
    );

    return {
      source,
      drafts,
      acceptedDrafts,
    };
  } catch (error) {
    console.error(`${source.label}：${error.message}，已跳过该草稿源。`);

    return {
      source,
      drafts: [],
      acceptedDrafts: [],
    };
  }
}

async function readExistingAcceptedResources() {
  try {
    return await readJsonArray(outputPath);
  } catch (error) {
    console.error(`现有 acceptedResources 读取失败：${error.message}`);
    console.error("将以空数组继续导出。");

    return [];
  }
}

async function readExistingAcceptedInstitutions() {
  try {
    return await readJsonArray(institutionsOutputPath);
  } catch (error) {
    console.error(`现有 acceptedInstitutions 读取失败：${error.message}`);
    console.error("将以空数组继续导出。");

    return [];
  }
}

async function exportAcceptedDrafts() {
  const now = new Date();

  console.log("正在读取草稿源……");

  const draftSourceResults = await Promise.all(
    draftSources.map((source) => readDraftSource(source)),
  );
  const existingAcceptedResources = await readExistingAcceptedResources();
  const existingAcceptedInstitutions = await readExistingAcceptedInstitutions();
  const acceptedDrafts = draftSourceResults.flatMap((result) =>
    result.acceptedDrafts.map((draft) => ({
      draft,
      source: result.source,
    })),
  );
  const institutionDrafts = acceptedDrafts.filter(
    ({ draft }) => draft.targetEntityType === "institution",
  );
  const resourceDrafts = acceptedDrafts.filter(
    ({ draft }) => draft.targetEntityType !== "institution",
  );
  const convertedResources = resourceDrafts.map(({ draft, source }) =>
    toResource(draft, now, source),
  );
  const convertedInstitutions = institutionDrafts.map(({ draft }) =>
    toInstitution(draft, now),
  );

  console.log(`现有 acceptedResources 数量：${existingAcceptedResources.length}`);
  console.log(
    `现有 acceptedInstitutions 数量：${existingAcceptedInstitutions.length}`,
  );
  console.log(`新转换 Resource 数量：${convertedResources.length}`);
  console.log(`新转换 Institution 数量：${convertedInstitutions.length}`);

  if (convertedResources.length === 0 && convertedInstitutions.length === 0) {
    console.log("当前没有 accepted 草稿。");
  }

  const uniqueResources = dedupeResources([
    ...existingAcceptedResources,
    ...convertedResources,
  ]);
  const uniqueInstitutions = dedupeInstitutions([
    ...existingAcceptedInstitutions,
    ...convertedInstitutions,
  ]);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(uniqueResources, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    institutionsOutputPath,
    `${JSON.stringify(uniqueInstitutions, null, 2)}\n`,
    "utf8",
  );

  console.log(`去重后 Resource 最终数量：${uniqueResources.length}`);
  console.log(`去重后 Institution 最终数量：${uniqueInstitutions.length}`);
  console.log("已写入 acceptedResources.json");
  console.log("已写入 acceptedInstitutions.json");
  console.log(`输出路径：${path.relative(projectRoot, outputPath)}`);
  console.log(`输出路径：${path.relative(projectRoot, institutionsOutputPath)}`);
}

exportAcceptedDrafts().catch((error) => {
  console.error(`accepted 草稿导出失败：${error.message}`);
  process.exitCode = 1;
});
