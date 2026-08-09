import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const acceptedInstitutionsPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedInstitutions.json",
);
const messagesPath = path.join(
  projectRoot,
  "src/data/admin/institutionDiscoveryMessages.json",
);

const today = new Date().toISOString().slice(0, 10);
const maxStoredMessages = 500;
const validSources = new Set([
  "all",
  "federal",
  "association",
  "academic",
  "library",
]);

function cleanString(value) {
  return String(value ?? "").trim();
}

function readArgValue(argv, names) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const matchedName = names.find(
      (name) => arg === name || arg.startsWith(`${name}=`),
    );

    if (!matchedName) {
      continue;
    }

    if (arg.includes("=")) {
      return arg.slice(arg.indexOf("=") + 1);
    }

    return argv[index + 1] ?? "";
  }

  return "";
}

function hasArg(argv, names) {
  return argv.some((arg) => names.includes(arg));
}

function positiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(cleanString(value), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function parseArgs(argv) {
  const rawSource = cleanString(readArgValue(argv, ["--source"])).toLowerCase();

  return {
    limit: positiveInteger(readArgValue(argv, ["--limit"]), 12, 50),
    source: validSources.has(rawSource) ? rawSource : "all",
    dryRun: hasArg(argv, ["--dry-run", "--dryRun"]),
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function slugify(value) {
  const slug = cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "us-institution";
}

function normalizeUrl(value) {
  return cleanString(value).replace(/\/+$/, "").toLowerCase();
}

function uniqueStrings(values) {
  return [
    ...new Set((Array.isArray(values) ? values : []).map(cleanString).filter(Boolean)),
  ];
}

function institutionSeed({
  source,
  id,
  nameEn,
  nameZh,
  shortName = "",
  group,
  typeCode,
  subType,
  level,
  location,
  officialUrl,
  descriptionZh,
  tags,
  relatedTopicIds,
  categoryId,
  subcategoryId,
  jurisdictionLevel = "national",
}) {
  return {
    source,
    id,
    slug: slugify(nameEn),
    nameEn,
    nameZh,
    shortName,
    abbreviation: shortName,
    institutionGroup: group,
    institutionTypeCode: typeCode,
    institutionType:
      typeCode === "association"
        ? "专业协会"
        : typeCode === "library"
          ? "图书馆与信息服务机构"
          : typeCode === "research"
            ? "研究机构"
            : typeCode === "government"
              ? "政府机构"
              : typeCode === "archives"
                ? "档案机构"
                : "相关机构",
    institutionSubType: subType,
    institutionLevel: level,
    categoryId,
    subcategoryId,
    jurisdictionLevel,
    location,
    officialUrl,
    website: officialUrl,
    descriptionZh,
    tags: uniqueStrings(tags),
    relatedTopicIds: uniqueStrings(relatedTopicIds),
  };
}

const institutionSeeds = [
  institutionSeed({
    source: "federal",
    id: "nhprc",
    nameEn: "National Historical Publications and Records Commission",
    nameZh: "国家历史出版物与记录委员会",
    shortName: "NHPRC",
    group: "federal",
    typeCode: "government",
    subType: "NARA 下属资助与记录项目机构",
    level: "联邦",
    location: "Washington, D.C., United States",
    officialUrl: "https://www.archives.gov/nhprc",
    descriptionZh:
      "国家历史出版物与记录委员会（NHPRC）隶属于 NARA，重点支持美国历史记录的保存、出版、数字化和开放利用项目。它对理解美国档案资助体系、地方历史记录保护和数字人文型档案项目很有价值。",
    tags: ["NHPRC", "NARA", "资助项目", "历史记录", "数字化"],
    relatedTopicIds: [
      "digital-resources-preservation",
      "access-outreach-public-participation",
    ],
    categoryId: "government",
    subcategoryId: "federal_records_programs",
  }),
  institutionSeed({
    source: "federal",
    id: "ogis",
    nameEn: "Office of Government Information Services",
    nameZh: "政府信息服务办公室",
    shortName: "OGIS",
    group: "federal",
    typeCode: "government",
    subType: "FOIA 调解与政府信息服务机构",
    level: "联邦",
    location: "Washington, D.C., United States",
    officialUrl: "https://www.archives.gov/ogis",
    descriptionZh:
      "政府信息服务办公室（OGIS）设在 NARA，负责信息自由法（FOIA）争议调解、政策观察和政府信息公开服务支持。它适合用于研究美国政府透明度、公众获取政府记录和档案机构参与信息公开治理的机制。",
    tags: ["OGIS", "FOIA", "信息公开", "调解", "NARA"],
    relatedTopicIds: [
      "access-outreach-public-participation",
      "laws-policies-governance",
    ],
    categoryId: "government",
    subcategoryId: "federal_information_services",
  }),
  institutionSeed({
    source: "federal",
    id: "isoo",
    nameEn: "Information Security Oversight Office",
    nameZh: "信息安全监督办公室",
    shortName: "ISOO",
    group: "federal",
    typeCode: "government",
    subType: "机密信息管理与解密监督机构",
    level: "联邦",
    location: "Washington, D.C., United States",
    officialUrl: "https://www.archives.gov/isoo",
    descriptionZh:
      "信息安全监督办公室（ISOO）设在 NARA，负责监督美国联邦政府机密国家安全信息、受控非密信息和解密相关制度。它是研究档案开放限制、解密政策和政府信息安全治理的重要机构。",
    tags: ["ISOO", "解密", "机密信息", "信息安全", "NARA"],
    relatedTopicIds: [
      "laws-policies-governance",
      "access-outreach-public-participation",
    ],
    categoryId: "government",
    subcategoryId: "federal_information_security",
  }),
  institutionSeed({
    source: "association",
    id: "council-of-state-archivists",
    nameEn: "Council of State Archivists",
    nameZh: "美国州档案馆馆长委员会",
    shortName: "CoSA",
    group: "social",
    typeCode: "association",
    subType: "州档案馆协作组织",
    level: "全国性专业组织",
    location: "United States",
    officialUrl: "https://www.statearchivists.org",
    descriptionZh:
      "美国州档案馆馆长委员会（CoSA）连接各州档案馆，关注电子记录、紧急准备、州级档案政策和跨州协作。它有助于补足 ArchiveScope 中联邦之外的州级档案治理视角。",
    tags: ["CoSA", "州档案馆", "电子记录", "专业协作", "美国州级档案"],
    relatedTopicIds: [
      "social-actors-service-ecosystem",
      "electronic-records-management",
    ],
    categoryId: "associations",
    subcategoryId: "archival_associations",
  }),
  institutionSeed({
    source: "association",
    id: "arma-international",
    nameEn: "ARMA International",
    nameZh: "ARMA 国际记录与信息管理协会",
    shortName: "ARMA",
    group: "social",
    typeCode: "association",
    subType: "记录与信息管理专业协会",
    level: "专业组织",
    location: "United States",
    officialUrl: "https://www.arma.org",
    descriptionZh:
      "ARMA International 是记录与信息管理领域的重要专业组织，关注信息治理、记录合规、保留期限、隐私和企业信息管理。它能帮助资料库覆盖政府档案之外的组织记录管理和信息治理实践。",
    tags: ["ARMA", "records management", "信息治理", "合规", "记录管理"],
    relatedTopicIds: [
      "electronic-records-management",
      "social-actors-service-ecosystem",
    ],
    categoryId: "associations",
    subcategoryId: "records_management_associations",
  }),
  institutionSeed({
    source: "association",
    id: "academy-of-certified-archivists",
    nameEn: "Academy of Certified Archivists",
    nameZh: "认证档案工作者学院",
    shortName: "ACA",
    group: "social",
    typeCode: "association",
    subType: "档案职业认证组织",
    level: "专业组织",
    location: "United States",
    officialUrl: "https://www.certifiedarchivists.org",
    descriptionZh:
      "认证档案工作者学院（ACA）维护美国档案职业认证体系，组织认证考试和继续教育要求。它适合用于研究美国档案职业化、能力标准和专业身份建设。",
    tags: ["ACA", "档案职业", "认证", "继续教育", "专业能力"],
    relatedTopicIds: [
      "social-actors-service-ecosystem",
      "access-outreach-public-participation",
    ],
    categoryId: "associations",
    subcategoryId: "archival_associations",
  }),
  institutionSeed({
    source: "association",
    id: "association-of-research-libraries",
    nameEn: "Association of Research Libraries",
    nameZh: "研究图书馆协会",
    shortName: "ARL",
    group: "social",
    typeCode: "association",
    subType: "研究图书馆联盟",
    level: "专业组织",
    location: "Washington, D.C., United States",
    officialUrl: "https://www.arl.org",
    descriptionZh:
      "研究图书馆协会（ARL）由北美主要研究图书馆组成，关注开放知识、数字馆藏、特殊馆藏、研究数据和图书馆评估。它有助于把大学图书馆和数字知识基础设施纳入 ArchiveScope 的机构生态。",
    tags: ["ARL", "研究图书馆", "特殊馆藏", "开放知识", "数字馆藏"],
    relatedTopicIds: [
      "digital-resources-preservation",
      "social-actors-service-ecosystem",
    ],
    categoryId: "associations",
    subcategoryId: "library_associations",
  }),
  institutionSeed({
    source: "association",
    id: "digital-public-library-of-america",
    nameEn: "Digital Public Library of America",
    nameZh: "美国数字公共图书馆",
    shortName: "DPLA",
    group: "social",
    typeCode: "nonprofit",
    subType: "数字文化遗产与聚合平台",
    level: "非营利组织 / 平台",
    location: "United States",
    officialUrl: "https://dp.la",
    descriptionZh:
      "美国数字公共图书馆（DPLA）聚合美国图书馆、档案馆、博物馆等机构的数字文化遗产资源，提供跨机构检索、开放数据和公共访问服务。它体现了档案、图书馆、博物馆协作建设数字记忆基础设施的模式。",
    tags: ["DPLA", "数字公共图书馆", "数字文化遗产", "聚合平台", "开放数据"],
    relatedTopicIds: [
      "social-actors-service-ecosystem",
      "digital-resources-preservation",
    ],
    categoryId: "nonprofits",
    subcategoryId: "digital_cultural_heritage_networks",
  }),
  institutionSeed({
    source: "association",
    id: "documenting-the-now",
    nameEn: "Documenting the Now",
    nameZh: "Documenting the Now",
    shortName: "DocNow",
    group: "social",
    typeCode: "nonprofit",
    subType: "社会媒体档案与伦理实践项目",
    level: "研究与社区项目",
    location: "United States",
    officialUrl: "https://www.docnow.io",
    descriptionZh:
      "Documenting the Now 关注社会媒体记录、社会运动资料和社区参与式档案实践，强调伦理采集、共同管理和研究者责任。它有助于展示新型社会主体如何参与数字时代的档案保存。",
    tags: ["DocNow", "社会媒体档案", "社区档案", "伦理采集", "数字人文"],
    relatedTopicIds: [
      "social-actors-service-ecosystem",
      "ai-emerging-technologies",
    ],
    categoryId: "nonprofits",
    subcategoryId: "community_archives_projects",
  }),
  institutionSeed({
    source: "academic",
    id: "harvard-university-archives",
    nameEn: "Harvard University Archives",
    nameZh: "哈佛大学档案馆",
    shortName: "HUA",
    group: "academic",
    typeCode: "archives",
    subType: "大学档案馆",
    level: "高校 / 研究机构",
    location: "Cambridge, Massachusetts, United States",
    officialUrl: "https://library.harvard.edu/libraries/harvard-university-archives",
    descriptionZh:
      "哈佛大学档案馆保存哈佛大学行政记录、教师与校友相关资料以及大学历史档案，是观察美国高校档案制度、大学治理记录和校园记忆建设的重要案例。",
    tags: ["Harvard", "大学档案", "高校档案", "校史档案", "特殊馆藏"],
    relatedTopicIds: [
      "social-actors-service-ecosystem",
      "access-outreach-public-participation",
    ],
    categoryId: "archives",
    subcategoryId: "university_archives",
    jurisdictionLevel: "academic",
  }),
  institutionSeed({
    source: "academic",
    id: "yale-manuscripts-and-archives",
    nameEn: "Yale University Library Manuscripts and Archives",
    nameZh: "耶鲁大学图书馆手稿与档案部",
    shortName: "Yale M&A",
    group: "academic",
    typeCode: "archives",
    subType: "大学档案与手稿馆藏机构",
    level: "高校 / 研究机构",
    location: "New Haven, Connecticut, United States",
    officialUrl: "https://web.library.yale.edu/mssa",
    descriptionZh:
      "耶鲁大学图书馆手稿与档案部负责大学档案、手稿、个人文献和专题馆藏服务。它体现了美国研究型大学在档案开放、特殊馆藏描述和教学研究支持方面的做法。",
    tags: ["Yale", "手稿档案", "大学档案", "特殊馆藏", "研究图书馆"],
    relatedTopicIds: [
      "access-outreach-public-participation",
      "digital-resources-preservation",
    ],
    categoryId: "archives",
    subcategoryId: "university_archives",
    jurisdictionLevel: "academic",
  }),
  institutionSeed({
    source: "academic",
    id: "stanford-university-archives",
    nameEn: "Stanford University Archives",
    nameZh: "斯坦福大学档案馆",
    shortName: "Stanford Archives",
    group: "academic",
    typeCode: "archives",
    subType: "大学档案馆",
    level: "高校 / 研究机构",
    location: "Stanford, California, United States",
    officialUrl: "https://library.stanford.edu/spc/university-archives",
    descriptionZh:
      "斯坦福大学档案馆保存大学行政记录、校园历史资料和相关个人文献，并与特殊馆藏服务结合。它适合作为美国西海岸研究型大学档案管理和数字展示实践的样本。",
    tags: ["Stanford", "大学档案", "特殊馆藏", "校史档案", "数字展示"],
    relatedTopicIds: [
      "social-actors-service-ecosystem",
      "digital-resources-preservation",
    ],
    categoryId: "archives",
    subcategoryId: "university_archives",
    jurisdictionLevel: "academic",
  }),
  institutionSeed({
    source: "academic",
    id: "bentley-historical-library",
    nameEn: "Bentley Historical Library",
    nameZh: "密歇根大学本特利历史图书馆",
    shortName: "Bentley Library",
    group: "academic",
    typeCode: "library",
    subType: "大学档案与历史研究图书馆",
    level: "高校 / 研究机构",
    location: "Ann Arbor, Michigan, United States",
    officialUrl: "https://bentley.umich.edu",
    descriptionZh:
      "本特利历史图书馆保存密歇根大学档案和密歇根地区历史记录，兼具大学档案馆和地方历史研究馆藏功能。它是研究高校档案、区域历史档案和公共利用服务的典型机构。",
    tags: ["University of Michigan", "大学档案", "地方历史", "研究图书馆"],
    relatedTopicIds: [
      "access-outreach-public-participation",
      "social-actors-service-ecosystem",
    ],
    categoryId: "libraries",
    subcategoryId: "university_special_collections",
    jurisdictionLevel: "academic",
  }),
  institutionSeed({
    source: "academic",
    id: "cornell-rare-and-manuscript-collections",
    nameEn: "Cornell University Library Rare and Manuscript Collections",
    nameZh: "康奈尔大学图书馆珍本与手稿馆藏",
    shortName: "Cornell RMC",
    group: "academic",
    typeCode: "library",
    subType: "特殊馆藏与手稿机构",
    level: "高校 / 研究机构",
    location: "Ithaca, New York, United States",
    officialUrl: "https://rare.library.cornell.edu",
    descriptionZh:
      "康奈尔大学珍本与手稿馆藏收藏大学档案、手稿、珍本和专题资料，重视教学研究支持与数字馆藏展示。它可用于观察研究型大学特殊馆藏的描述、开放和数字化服务。",
    tags: ["Cornell", "特殊馆藏", "手稿", "大学档案", "数字馆藏"],
    relatedTopicIds: [
      "digital-resources-preservation",
      "access-outreach-public-participation",
    ],
    categoryId: "libraries",
    subcategoryId: "university_special_collections",
    jurisdictionLevel: "academic",
  }),
  institutionSeed({
    source: "academic",
    id: "bancroft-library",
    nameEn: "The Bancroft Library",
    nameZh: "加州大学伯克利分校班克罗夫特图书馆",
    shortName: "Bancroft Library",
    group: "academic",
    typeCode: "library",
    subType: "研究图书馆与特殊馆藏机构",
    level: "高校 / 研究机构",
    location: "Berkeley, California, United States",
    officialUrl: "https://www.lib.berkeley.edu/visit/bancroft",
    descriptionZh:
      "班克罗夫特图书馆是加州大学伯克利分校的重要特殊馆藏和档案机构，收藏美国西部、拉丁美洲、大学历史和手稿资料。它适合补充美国高校特殊馆藏与区域档案资源的代表案例。",
    tags: ["UC Berkeley", "Bancroft", "特殊馆藏", "区域档案", "大学档案"],
    relatedTopicIds: [
      "digital-resources-preservation",
      "social-actors-service-ecosystem",
    ],
    categoryId: "libraries",
    subcategoryId: "university_special_collections",
    jurisdictionLevel: "academic",
  }),
  institutionSeed({
    source: "academic",
    id: "ucla-library-special-collections",
    nameEn: "UCLA Library Special Collections",
    nameZh: "加州大学洛杉矶分校图书馆特殊馆藏",
    shortName: "UCLA LSC",
    group: "academic",
    typeCode: "library",
    subType: "特殊馆藏与档案服务机构",
    level: "高校 / 研究机构",
    location: "Los Angeles, California, United States",
    officialUrl: "https://www.library.ucla.edu/visit/locations/library-special-collections/",
    descriptionZh:
      "UCLA 图书馆特殊馆藏提供手稿、档案、珍本和大学相关资料服务，覆盖加州、表演艺术、社会运动等专题。它有助于展示美国大学图书馆如何把特殊馆藏、档案描述和研究教学支持结合起来。",
    tags: ["UCLA", "特殊馆藏", "手稿", "大学图书馆", "档案服务"],
    relatedTopicIds: [
      "access-outreach-public-participation",
      "digital-resources-preservation",
    ],
    categoryId: "libraries",
    subcategoryId: "university_special_collections",
    jurisdictionLevel: "academic",
  }),
];

function buildInstitution(seed) {
  return {
    id: seed.id,
    slug: seed.slug,
    nameZh: seed.nameZh,
    nameEn: seed.nameEn,
    abbreviation: seed.abbreviation,
    shortName: seed.shortName || seed.abbreviation,
    countryId: "usa",
    institutionGroup: seed.institutionGroup,
    institutionTypeCode: seed.institutionTypeCode,
    institutionType: seed.institutionType,
    categoryId: seed.categoryId,
    subcategoryId: seed.subcategoryId,
    jurisdictionLevel: seed.jurisdictionLevel,
    institutionSubType: seed.institutionSubType,
    institutionLevel: seed.institutionLevel,
    stateCode: "",
    stateName: "",
    location: seed.location,
    website: seed.website,
    officialUrl: seed.officialUrl,
    descriptionZh: seed.descriptionZh,
    tags: seed.tags,
    relatedTopicIds: seed.relatedTopicIds,
    linkStatus: "ok",
    lastCheckedAt: today,
    status: "active_draft",
    notes: "由安全机构发现 Agent 按白名单来源补入，可在前台检查后继续编辑。",
    source: "institutionDiscoveryAgent",
    importedAt: today,
    sourceUrl: seed.officialUrl,
    collectedAt: today,
  };
}

function buildMessage(institution, runId) {
  const title = institution.nameZh || institution.nameEn || institution.id;

  return {
    id: `${runId}-${institution.id}`,
    runId,
    institutionId: institution.id,
    title,
    status: "applied",
    message: `《${title}》已补入机构库，可在前台查看并继续编辑。`,
    detailUrl: `/institutions/${institution.slug}`,
    editUrl: `/admin/dashboard`,
    sourceDomain: new URL(institution.officialUrl).hostname.replace(/^www\./, ""),
    actionSummary:
      "来自安全机构扩充清单，已补充中文简介、机构分组、标签和官方链接。",
    createdAt: new Date().toISOString(),
  };
}

async function appendMessages(messages) {
  if (messages.length === 0) {
    return;
  }

  const existingMessages = await readJson(messagesPath, []);
  const safeMessages = Array.isArray(existingMessages) ? existingMessages : [];

  await writeJson(messagesPath, [...safeMessages, ...messages].slice(-maxStoredMessages));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = `institution-discovery-${Date.now()}`;
  const acceptedInstitutions = await readJson(acceptedInstitutionsPath, []);
  const safeAcceptedInstitutions = Array.isArray(acceptedInstitutions)
    ? acceptedInstitutions
    : [];
  const existingIds = new Set(
    safeAcceptedInstitutions
      .map((institution) => cleanString(institution?.id))
      .filter(Boolean),
  );
  const existingUrls = new Set(
    safeAcceptedInstitutions
      .map((institution) =>
        normalizeUrl(institution?.officialUrl || institution?.website),
      )
      .filter(Boolean),
  );
  const sourceFilteredSeeds = institutionSeeds.filter(
    (seed) => options.source === "all" || seed.source === options.source,
  );
  const candidates = sourceFilteredSeeds.filter(
    (seed) =>
      !existingIds.has(seed.id) && !existingUrls.has(normalizeUrl(seed.officialUrl)),
  );
  const selectedSeeds = candidates.slice(0, options.limit);
  const institutionsToAppend = selectedSeeds.map(buildInstitution);
  const messages = institutionsToAppend.map((institution) =>
    buildMessage(institution, runId),
  );

  console.log("安全机构扩充 Agent");
  console.log(`机构种子总数：${institutionSeeds.length}`);
  console.log(`来源筛选：${options.source}`);
  console.log(`筛选后种子数量：${sourceFilteredSeeds.length}`);
  console.log(`已存在机构数量：${safeAcceptedInstitutions.length}`);
  console.log(`可新增候选数量：${candidates.length}`);
  console.log(`本次 limit：${options.limit}`);
  console.log(`本次新增机构数量：${institutionsToAppend.length}`);

  if (institutionsToAppend.length > 0) {
    console.log("本次补入机构：");
    for (const institution of institutionsToAppend) {
      console.log(`- ${institution.id}：${institution.nameZh}`);
    }
  }

  if (options.dryRun) {
    console.log("dry-run 模式：未写入文件。");
    return;
  }

  if (institutionsToAppend.length === 0) {
    console.log("没有新的机构需要补入。");
    return;
  }

  await writeJson(acceptedInstitutionsPath, [
    ...safeAcceptedInstitutions,
    ...institutionsToAppend,
  ]);
  await appendMessages(messages);

  console.log(`已写入机构：${acceptedInstitutionsPath}`);
  console.log(`已写入机构消息：${messagesPath}`);
  console.log("新增机构已发布到前台。");
}

main().catch((error) => {
  console.error(`机构扩充失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
