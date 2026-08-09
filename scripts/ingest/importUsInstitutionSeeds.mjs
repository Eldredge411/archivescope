import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const seedPath = path.join(
  projectRoot,
  "src/data/ingestion/usInstitutionSeeds.ts",
);
const outputPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedInstitutions.json",
);

const institutionGroups = new Set([
  "federal",
  "state",
  "social",
  "academic",
  "commercial",
  "other",
]);

const institutionTypes = new Set([
  "archives",
  "library",
  "museum",
  "association",
  "government",
  "research",
  "company",
  "nonprofit",
  "other",
]);

const linkStatuses = new Set(["ok", "redirect", "broken", "unknown"]);
const statuses = new Set(["active", "active_draft", "planned", "draft"]);

const institutionTypeDisplay = {
  archives: "档案机构",
  library: "图书馆与信息服务机构",
  museum: "博物馆与文化机构",
  association: "专业协会",
  government: "政府机构",
  research: "研究机构",
  company: "商业与服务机构",
  nonprofit: "非营利组织",
  other: "其他机构",
};

const subcategoryDisplay = {
  national_archives: "国家档案馆",
  presidential_libraries: "总统档案与博物馆体系",
  state_archives: "州级档案馆",
  national_libraries: "国家图书馆",
  research_libraries: "研究图书馆 / 信息中心",
  archival_associations: "档案专业协会",
};

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

  return slug || "us-institution";
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];
}

function normalizeGroup(value) {
  const normalizedValue = normalizeString(value);

  return institutionGroups.has(normalizedValue) ? normalizedValue : "other";
}

function normalizeType(value) {
  const normalizedValue = normalizeString(value);

  return institutionTypes.has(normalizedValue) ? normalizedValue : "other";
}

function normalizeLinkStatus(value) {
  const normalizedValue = normalizeString(value);

  return linkStatuses.has(normalizedValue) ? normalizedValue : "ok";
}

function normalizeStatus(value) {
  const normalizedValue = normalizeString(value);

  return statuses.has(normalizedValue) ? normalizedValue : "active_draft";
}

function getInstitutionLevel(group, jurisdictionLevel) {
  if (jurisdictionLevel === "state" || group === "state") {
    return "州级";
  }

  if (group === "federal") {
    return "联邦";
  }

  if (group === "social") {
    return "全国性专业组织";
  }

  if (group === "academic") {
    return "高校 / 研究机构";
  }

  if (group === "commercial") {
    return "商业服务机构";
  }

  return jurisdictionLevel || "national";
}

function extractSeedArraySource(source) {
  const marker = "export const usInstitutionSeeds";
  const markerIndex = source.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error("未找到 usInstitutionSeeds 导出。");
  }

  const assignmentIndex = source.indexOf("=", markerIndex);
  const arrayStart = source.indexOf("[", assignmentIndex);

  if (assignmentIndex < 0 || arrayStart < 0) {
    throw new Error("usInstitutionSeeds 格式不正确。");
  }

  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(arrayStart, index + 1);
      }
    }
  }

  throw new Error("未能解析 usInstitutionSeeds 数组。");
}

async function readSeeds() {
  const source = await readFile(seedPath, "utf8");
  const arraySource = extractSeedArraySource(source);
  const seeds = vm.runInNewContext(arraySource, {}, { timeout: 1000 });

  if (!Array.isArray(seeds)) {
    throw new Error("usInstitutionSeeds 必须是数组。");
  }

  return seeds;
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

function normalizeSeed(seed, now) {
  const nameEn = normalizeString(seed.nameEn);
  const nameZh = normalizeString(seed.nameZh) || nameEn;
  const slug = normalizeString(seed.slug) || slugify(nameEn || nameZh);
  const id = normalizeString(seed.id) || slug;
  const group = normalizeGroup(seed.institutionGroup);
  const type = normalizeType(seed.institutionType);
  const jurisdictionLevel = normalizeString(seed.jurisdictionLevel) || "national";
  const website = normalizeString(seed.website);
  const lastCheckedAt = normalizeString(seed.lastCheckedAt) || formatDate(now);

  return {
    id,
    slug,
    nameZh,
    nameEn: nameEn || nameZh,
    abbreviation: normalizeString(seed.abbreviation),
    shortName: normalizeString(seed.abbreviation),
    countryId: normalizeString(seed.countryId) || "usa",
    institutionGroup: group,
    institutionTypeCode: type,
    institutionType: institutionTypeDisplay[type] || "机构",
    categoryId: normalizeString(seed.categoryId) || "institutions",
    subcategoryId: normalizeString(seed.subcategoryId) || "institutions",
    jurisdictionLevel,
    institutionSubType:
      subcategoryDisplay[normalizeString(seed.subcategoryId)] ||
      normalizeString(seed.subcategoryId) ||
      "综合机构",
    institutionLevel: getInstitutionLevel(group, jurisdictionLevel),
    stateCode: normalizeString(seed.stateCode),
    stateName: normalizeString(seed.stateName),
    stateNameZh: normalizeString(seed.stateNameZh),
    location: normalizeString(seed.location) || "United States",
    website,
    officialUrl: website,
    descriptionZh:
      normalizeString(seed.descriptionZh) ||
      "该机构条目由美国机构种子导入，中文简介待补充。",
    tags: normalizeStringArray(seed.tags),
    relatedTopicIds: normalizeStringArray(seed.relatedTopicIds),
    linkStatus: normalizeLinkStatus(seed.linkStatus),
    lastCheckedAt,
    status: normalizeStatus(seed.status),
    notes: normalizeString(seed.notes),
    source: "usInstitutionSeeds",
    importedAt: formatDate(now),
  };
}

function getWebsite(value) {
  return normalizeString(value.officialUrl || value.website || value.sourceUrl);
}

function getNameEn(value) {
  return normalizeString(value.nameEn).toLowerCase();
}

function mergeInstitutions(existingInstitutions, newInstitutions) {
  const mergedInstitutions = [...existingInstitutions];
  const seenIds = new Map(
    existingInstitutions
      .map((institution, index) => [normalizeString(institution.id), index])
      .filter(([id]) => Boolean(id)),
  );
  const seenWebsites = new Map(
    existingInstitutions
      .map((institution, index) => [getWebsite(institution), index])
      .filter(([website]) => Boolean(website)),
  );
  const seenNamesEn = new Map(
    existingInstitutions
      .map((institution, index) => [getNameEn(institution), index])
      .filter(([nameEn]) => Boolean(nameEn)),
  );
  let addedCount = 0;
  let skippedDuplicateCount = 0;

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

  function getDuplicateIndex({ id, website, nameEn }) {
    if (id && seenIds.has(id)) {
      return seenIds.get(id);
    }

    if (website && seenWebsites.has(website)) {
      return seenWebsites.get(website);
    }

    if (nameEn && seenNamesEn.has(nameEn)) {
      return seenNamesEn.get(nameEn);
    }

    return undefined;
  }

  for (const institution of newInstitutions) {
    const id = normalizeString(institution.id);
    const website = getWebsite(institution);
    const nameEn = getNameEn(institution);
    const duplicateIndex = getDuplicateIndex({ id, website, nameEn });

    if (duplicateIndex !== undefined) {
      mergeMissingFields(mergedInstitutions[duplicateIndex], institution);
      skippedDuplicateCount += 1;
      continue;
    }

    mergedInstitutions.push(institution);
    addedCount += 1;

    if (id) {
      seenIds.set(id, mergedInstitutions.length - 1);
    }

    if (website) {
      seenWebsites.set(website, mergedInstitutions.length - 1);
    }

    if (nameEn) {
      seenNamesEn.set(nameEn, mergedInstitutions.length - 1);
    }
  }

  return {
    mergedInstitutions,
    addedCount,
    skippedDuplicateCount,
  };
}

async function importUsInstitutionSeeds() {
  const now = new Date();
  const seeds = await readSeeds();
  const existingInstitutions = await readJsonArray(outputPath);
  const normalizedInstitutions = seeds.map((seed) => normalizeSeed(seed, now));
  const { mergedInstitutions, addedCount, skippedDuplicateCount } =
    mergeInstitutions(existingInstitutions, normalizedInstitutions);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(mergedInstitutions, null, 2)}\n`,
    "utf8",
  );

  console.log(`读取 seed 数量：${seeds.length}`);
  console.log(`已有 acceptedInstitutions 数量：${existingInstitutions.length}`);
  console.log(`新增数量：${addedCount}`);
  console.log(`跳过重复数量：${skippedDuplicateCount}`);
  console.log(`最终 acceptedInstitutions 数量：${mergedInstitutions.length}`);
  console.log(`写入路径：${path.relative(projectRoot, outputPath)}`);
}

importUsInstitutionSeeds().catch((error) => {
  console.error(`美国机构种子导入失败：${error.message}`);
  process.exitCode = 1;
});
