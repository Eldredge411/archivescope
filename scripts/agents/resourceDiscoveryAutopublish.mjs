import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const resourceEnrichmentsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichments.ts",
);
const resourceOfficialFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceOfficialFiles.ts",
);
const autopilotMessagesPath = path.join(
  projectRoot,
  "src/data/admin/resourceEnrichmentAutopilotMessages.json",
);

const today = new Date().toISOString().slice(0, 10);
const maxStoredMessages = 500;
const validSources = new Set([
  "all",
  "ecfr",
  "uscode",
  "omb",
  "nara",
  "loc",
  "dpla",
  "saa",
  "arma",
  "docnow",
  "cosa",
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
  const source = validSources.has(rawSource) ? rawSource : "all";

  return {
    limit: positiveInteger(readArgValue(argv, ["--limit"]), 25, 100),
    source,
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

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
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

  return slug || "resource";
}

function normalizeUrl(value) {
  return cleanString(value).replace(/\/+$/, "").toLowerCase();
}

function uniqueStrings(values) {
  return [
    ...new Set((Array.isArray(values) ? values : []).map(cleanString).filter(Boolean)),
  ];
}

function eCfrPartSeed({
  part,
  titleEn,
  titleZh,
  focus,
  topicIds = ["electronic-records-management", "laws-policies-governance"],
  tags = [],
}) {
  const sourceUrl = `https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-${part}`;
  const primaryTopicId = topicIds[0] ?? "electronic-records-management";
  const titleZhFull = `36 CFR 第 ${part} 部分：${titleZh}`;

  return {
    source: "ecfr",
    id: `ecfr-36-cfr-${part}`,
    titleEn: `36 CFR Part ${part} - ${titleEn}`,
    titleZh: titleZhFull,
    sourceUrl,
    sourceDomain: "ecfr.gov",
    sourceName: "eCFR",
    institutionId: "nara",
    resourceType: "regulation",
    primaryTopicId,
    topicIds,
    tags: uniqueStrings([
      "eCFR",
      "36 CFR",
      `36 CFR ${part}`,
      "NARA",
      "联邦记录",
      "记录管理",
      ...tags,
    ]),
    summaryShort: `${titleZhFull} 是 NARA 现行联邦记录管理法规的一部分，集中规定${focus}。它适合用作理解美国联邦记录管理制度的基础法规范本。`,
    summaryZh: `${titleZhFull} 收录在 eCFR 的 36 CFR Chapter XII 中，属于美国国家档案与文件署（NARA）管理联邦记录工作的现行法规文本。该部分围绕${focus}展开，说明联邦机构在记录形成、维护、处置、移交或保存中的合规要求。对中文用户来说，它比单条 Federal Register 修订公告更适合用于查看当前有效规则和制度框架。`,
    keyPoints: [
      `该资料来自 eCFR，是查看当前有效联邦法规文本的官方入口。`,
      `它对应 36 CFR 第 ${part} 部分，主题集中在${focus}。`,
      "可与 Federal Register 修订公告结合使用，用于区分“现行规则文本”和“历史修订过程”。",
      "适合档案法规、电子记录管理和联邦机构记录管理制度研究。", 
    ],
    researchValue: `该资料可用于研究美国联邦记录管理法规体系，尤其适合分析 NARA 如何通过 36 CFR 将联邦机构的记录创建、保存、处置、移交和长期保存要求制度化。中文档案学学习者可用它对照国内机关档案管理、电子文件管理和档案移交规范，理解法规层面对记录生命周期的具体控制方式。`,
    versioningApplicable: true,
    versionNote:
      "eCFR 展示当前有效法规文本，后续版本沿革可结合 Federal Register 修订公告和 eCFR 历史版本继续补充。",
    officialFileType: "html",
  };
}

function usCodeSeed({
  id,
  titleEn,
  titleZh,
  sourceUrl,
  focus,
  resourceType = "law",
  primaryTopicId = "laws-policies-governance",
  topicIds = ["laws-policies-governance"],
  tags = [],
}) {
  return {
    source: "uscode",
    id,
    titleEn,
    titleZh,
    sourceUrl,
    sourceDomain: "uscode.house.gov",
    sourceName: "U.S. Code",
    institutionId: "loc",
    resourceType,
    primaryTopicId,
    topicIds,
    tags: uniqueStrings(["U.S. Code", "美国法典", "法律", ...tags]),
    summaryShort: `${titleZh} 是美国档案、记录管理、信息公开或隐私制度的重要法律依据。它适合放在资料库中作为理解相关政策和法规的基础文本。`,
    summaryZh: `${titleZh} 是美国联邦法律体系中的基础资料，官方文本由 uscode.house.gov 提供。该资料重点涉及${focus}，为 NARA、联邦机构或公众获取政府信息的制度安排提供法律依据。将它作为独立条目收录，可以帮助用户从“法律基础”层面理解档案馆职责、联邦记录管理、总统记录、信息公开和隐私保护之间的关系。`,
    keyPoints: [
      "该资料来自美国法典官网，适合作为当前法律文本入口。",
      `核心内容涉及${focus}。`,
      "可与 eCFR 现行规章、NARA 指南和 Federal Register 修订公告配合阅读。",
      "适合用于美国档案法律制度、政府信息治理和公共记录制度研究。",
    ],
    researchValue: `该资料可用于搭建美国档案制度研究的法律框架，帮助中文用户理解联邦法律如何规定档案机构职责、记录管理义务、信息公开权利或个人信息保护边界。它也适合用于比较研究美国法典、行政规章和档案机构执行指南之间的层级关系。`,
    versioningApplicable: true,
    versionNote:
      "美国法典条文会随国会立法修订而变化，正式引用时应核对官网当前版本和修订说明。",
    officialFileType: "html",
  };
}

function policySeed({
  id,
  titleEn,
  titleZh,
  sourceUrl,
  source = "nara",
  sourceDomain = "archives.gov",
  sourceName = "National Archives",
  institutionId = "nara",
  resourceType = "guidance",
  primaryTopicId = "electronic-records-management",
  topicIds = ["electronic-records-management", "laws-policies-governance"],
  tags = [],
  focus,
  officialFileType = "html",
  versioningApplicable = true,
}) {
  return {
    source,
    id,
    titleEn,
    titleZh,
    sourceUrl,
    sourceDomain,
    sourceName,
    institutionId,
    resourceType,
    primaryTopicId,
    topicIds,
    tags: uniqueStrings(["NARA", "记录管理", ...tags]),
    summaryShort: `${titleZh} 是美国档案与记录管理领域的重要官方资料，聚焦${focus}。它可帮助用户快速理解相关政策要求、工具入口和实践背景。`,
    summaryZh: `${titleZh} 是面向联邦机构记录管理、电子记录转型或档案服务实践的官方资料。该资料围绕${focus}提供政策说明、执行路径或工具入口，适合作为学习美国档案治理和数字记录管理实践的基础材料。与单次公告相比，这类资料更接近日常业务指南或政策入口，便于用户从前台直接查阅和比较。`,
    keyPoints: [
      "该资料来自官方来源，适合优先作为学习和研究入口。",
      `内容重点围绕${focus}。`,
      "可与法律法规、eCFR 现行规则和 NARA 其他记录管理指南配合使用。",
      "适合用于理解美国联邦机构记录管理现代化和数字转型实践。",
    ],
    researchValue: `该资料可用于研究美国档案机构如何把法律法规转化为机构操作指南、数字化转型要求和具体业务工具。中文档案学学习者可据此观察 NARA 在电子记录、电子邮件、通用记录表、机构评估和长期保存方面的管理重点，并与国内相关制度和项目实践进行比较。`,
    versioningApplicable,
    versionNote:
      "该资料为官方政策或指南入口，内容可能随机构实践更新；后续可结合页面发布日期、PDF 版本或公告继续补充版本沿革。",
    officialFileType,
  };
}

const eCfrSeeds = [
  eCfrPartSeed({
    part: "1202",
    titleEn: "Regulations Implementing the Privacy Act of 1974",
    titleZh: "《1974年隐私法》实施规则",
    focus: "NARA 处理个人隐私记录请求、信息披露、记录修正和特定记录系统豁免的程序规则",
    topicIds: ["laws-policies-governance", "electronic-records-management"],
    tags: ["Privacy Act", "36 CFR 1202", "隐私法", "个人信息保护"],
  }),
  eCfrPartSeed({
    part: "1220",
    titleEn: "Federal Records; General",
    titleZh: "联邦记录管理总则",
    focus: "联邦记录的定义、机构职责和记录管理项目的总体要求",
    tags: ["联邦记录法", "总则"],
  }),
  eCfrPartSeed({
    part: "1222",
    titleEn: "Creation and Maintenance of Federal Records",
    titleZh: "联邦记录的形成与维护",
    focus: "联邦记录形成、捕获、维护和可用性的基本要求",
    tags: ["记录形成", "记录维护"],
  }),
  eCfrPartSeed({
    part: "1223",
    titleEn: "Managing Vital Records",
    titleZh: "重要记录管理",
    focus: "重要记录识别、保护、灾害恢复和业务连续性支撑",
    tags: ["重要记录", "灾害恢复"],
  }),
  eCfrPartSeed({
    part: "1224",
    titleEn: "Records Disposition Programs",
    titleZh: "记录处置项目",
    focus: "机构记录处置项目的组织、职责和内部控制",
    tags: ["记录处置", "处置项目"],
  }),
  eCfrPartSeed({
    part: "1225",
    titleEn: "Scheduling Records",
    titleZh: "记录保管期限表编制",
    focus: "记录保管期限表编制、审批和处置授权机制",
    tags: ["保管期限表", "records schedules"],
  }),
  eCfrPartSeed({
    part: "1226",
    titleEn: "Implementing Disposition",
    titleZh: "记录处置执行",
    focus: "记录处置授权执行、暂停处置和处置合规控制",
    tags: ["处置执行", "legal hold"],
  }),
  eCfrPartSeed({
    part: "1227",
    titleEn: "General Records Schedules",
    titleZh: "通用记录表",
    focus: "通用记录表的适用范围、使用方式和机构执行责任",
    tags: ["GRS", "通用记录表"],
  }),
  eCfrPartSeed({
    part: "1228",
    titleEn: "Loan of Permanent and Unscheduled Records",
    titleZh: "永久与未排定记录借出",
    focus: "永久记录和未排定记录借出、控制和回收要求",
    tags: ["永久记录", "未排定记录"],
  }),
  eCfrPartSeed({
    part: "1229",
    titleEn: "Emergency Authorization to Destroy Records",
    titleZh: "紧急销毁记录授权",
    focus: "特殊紧急情况下记录销毁授权和程序限制",
    tags: ["紧急销毁", "记录销毁"],
  }),
  eCfrPartSeed({
    part: "1230",
    titleEn:
      "Unlawful or Accidental Removal, Defacing, Alteration, or Destruction of Records",
    titleZh: "记录非法或意外移除、污损、篡改与销毁",
    focus: "记录遭非法移除、篡改、损毁或意外丢失时的报告和补救责任",
    tags: ["记录安全", "记录丢失", "问责"],
  }),
  eCfrPartSeed({
    part: "1231",
    titleEn:
      "Transfer of Records from the Custody of One Executive Agency to Another",
    titleZh: "行政机构之间的记录移交",
    focus: "联邦行政机构之间记录控制权转移的程序和责任",
    tags: ["机构移交", "记录移交"],
  }),
  eCfrPartSeed({
    part: "1232",
    titleEn: "Transfer of Records to Records Storage Facilities",
    titleZh: "记录向存储设施转移",
    focus: "记录转入记录中心或存储设施时的条件、文件和管理要求",
    tags: ["记录中心", "存储设施"],
  }),
  eCfrPartSeed({
    part: "1233",
    titleEn:
      "Transfer, Use, and Disposition of Records in a Presidential Library",
    titleZh: "总统图书馆记录的移交、利用与处置",
    focus: "总统图书馆体系中记录移交、利用和处置的制度安排",
    topicIds: ["laws-policies-governance", "access-outreach-public-participation"],
    tags: ["总统记录", "总统图书馆"],
  }),
  eCfrPartSeed({
    part: "1234",
    titleEn: "Facility Standards for Records Storage Facilities",
    titleZh: "记录存储设施标准",
    focus: "联邦记录存储设施的环境、建筑、安全和运行标准",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["设施标准", "长期保存"],
  }),
  eCfrPartSeed({
    part: "1235",
    titleEn: "Transfer of Permanent Records to the National Archives",
    titleZh: "永久记录向国家档案馆移交",
    focus: "永久保存记录向国家档案馆移交的标准、时间和程序",
    tags: ["永久记录", "档案移交"],
  }),
  eCfrPartSeed({
    part: "1236",
    titleEn: "Electronic Records Management",
    titleZh: "电子记录管理",
    focus: "电子记录、电子邮件、数字化副本和电子系统中的记录管理要求",
    tags: ["电子记录", "电子邮件", "数字化"],
  }),
  eCfrPartSeed({
    part: "1237",
    titleEn: "Audiovisual, Cartographic, and Related Records Management",
    titleZh: "视听、地图与相关记录管理",
    focus: "视听资料、地图资料、数字照片及相关特殊载体记录的管理",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["视听档案", "地图档案", "数字照片"],
  }),
  eCfrPartSeed({
    part: "1238",
    titleEn: "Microform Records Management",
    titleZh: "缩微记录管理",
    focus: "缩微记录制作、维护、质量控制和作为记录副本的管理要求",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["缩微记录", "介质管理"],
  }),
  eCfrPartSeed({
    part: "1239",
    titleEn: "Program Assistance and Inspections",
    titleZh: "记录管理项目协助与检查",
    focus: "NARA 对联邦机构记录管理项目的协助、评估和检查机制",
    tags: ["项目检查", "合规评估"],
  }),
];

const usCodeSeeds = [
  usCodeSeed({
    id: "res-federal-records-act",
    titleEn: "Federal Records Act Core U.S. Code Chapters",
    titleZh: "美国《联邦记录法》核心章节",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter31&edition=prelim",
    focus:
      "NARA 职责、联邦机构记录管理义务、记录处置授权和永久记录移交制度",
    tags: ["Federal Records Act", "44 U.S.C.", "NARA", "联邦记录法"],
  }),
  usCodeSeed({
    id: "uscode-44-chapter-22-presidential-records",
    titleEn: "44 U.S.C. Chapter 22 - Presidential Records",
    titleZh: "美国法典第 44 编第 22 章：总统记录",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter22&edition=prelim",
    focus: "总统记录的法律属性、保管责任、开放利用和限制访问规则",
    tags: ["Presidential Records Act", "总统记录", "总统图书馆"],
  }),
  usCodeSeed({
    id: "uscode-44-chapter-35-information-policy",
    titleEn:
      "44 U.S.C. Chapter 35 - Coordination of Federal Information Policy",
    titleZh: "美国法典第 44 编第 35 章：联邦信息政策协调",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter35&edition=prelim",
    focus: "联邦信息政策、信息资源管理、信息收集负担和数字政府治理",
    primaryTopicId: "laws-policies-governance",
    topicIds: ["laws-policies-governance", "electronic-records-management"],
    tags: ["Paperwork Reduction Act", "信息政策", "信息资源管理"],
  }),
  usCodeSeed({
    id: "uscode-5-section-552-foia",
    titleEn: "5 U.S.C. 552 - Freedom of Information Act",
    titleZh: "美国信息自由法（FOIA）",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552&edition=prelim",
    focus: "公众获取政府记录的权利、政府公开义务、豁免条款和行政救济机制",
    primaryTopicId: "access-outreach-public-participation",
    topicIds: ["access-outreach-public-participation", "laws-policies-governance"],
    tags: ["FOIA", "信息公开", "公众利用", "政府透明"],
  }),
  usCodeSeed({
    id: "uscode-5-section-552a-privacy-act",
    titleEn: "5 U.S.C. 552a - Privacy Act",
    titleZh: "美国隐私法（Privacy Act）",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552a&edition=prelim",
    focus: "联邦机构个人信息记录系统、个人访问和更正权、记录披露限制",
    primaryTopicId: "laws-policies-governance",
    topicIds: ["laws-policies-governance", "access-outreach-public-participation"],
    tags: ["Privacy Act", "隐私保护", "个人信息", "记录系统"],
  }),
];

const ombSeeds = [
  policySeed({
    source: "omb",
    id: "omb-m-12-18-managing-government-records",
    titleEn: "M-12-18 Managing Government Records Directive",
    titleZh: "OMB/NARA M-12-18：政府记录管理指令",
    sourceUrl:
      "https://obamawhitehouse.archives.gov/sites/default/files/omb/memoranda/2012/m-12-18.pdf",
    sourceDomain: "obamawhitehouse.archives.gov",
    sourceName: "Office of Management and Budget",
    resourceType: "policy",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["OMB", "M-12-18", "电子记录", "政府记录管理"],
    focus: "联邦政府记录管理改革、电子邮件记录管理和数字化转型目标",
    officialFileType: "pdf",
  }),
  policySeed({
    source: "omb",
    id: "omb-m-14-16-email-management",
    titleEn:
      "M-14-16 Guidance on Managing Email",
    titleZh: "OMB/NARA M-14-16：电子邮件管理指南",
    sourceUrl:
      "https://obamawhitehouse.archives.gov/sites/default/files/omb/memoranda/2014/m-14-16.pdf",
    sourceDomain: "obamawhitehouse.archives.gov",
    sourceName: "Office of Management and Budget",
    resourceType: "policy",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["OMB", "M-14-16", "email records", "电子邮件记录"],
    focus: "联邦机构电子邮件记录的捕获、管理和 Capstone 管理方法",
    officialFileType: "pdf",
  }),
  policySeed({
    source: "omb",
    id: "omb-m-19-21-transition-to-electronic-records",
    titleEn:
      "M-19-21 Transition to Electronic Records",
    titleZh: "OMB/NARA M-19-21：向电子记录过渡",
    sourceUrl:
      "https://www.whitehouse.gov/wp-content/uploads/2019/08/M-19-21-new-2.pdf",
    sourceDomain: "whitehouse.gov",
    sourceName: "Office of Management and Budget",
    resourceType: "policy",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["OMB", "M-19-21", "电子记录", "数字转型", "NARA"],
    focus: "联邦政府停止纸质记录移交、推进电子记录移交和电子档案管理现代化",
    officialFileType: "pdf",
  }),
  policySeed({
    source: "omb",
    id: "omb-m-23-07-transition-update",
    titleEn:
      "M-23-07 Update to Transition to Electronic Records",
    titleZh: "OMB/NARA M-23-07：电子记录过渡更新",
    sourceUrl:
      "https://www.archives.gov/files/records-mgmt/m-23-07.pdf",
    sourceDomain: "archives.gov",
    sourceName: "National Archives",
    resourceType: "policy",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["OMB", "M-23-07", "电子记录", "数字转型", "NARA"],
    focus: "更新联邦机构电子记录移交时限和数字化转型执行安排",
    officialFileType: "pdf",
  }),
];

const naraSeeds = [
  policySeed({
    id: "nara-fermi",
    titleEn: "Federal Electronic Records Modernization Initiative",
    titleZh: "NARA 联邦电子记录现代化倡议（FERMI）",
    sourceUrl: "https://www.archives.gov/records-mgmt/policy/fermi",
    resourceType: "program",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["FERMI", "电子记录", "现代化", "系统需求"],
    focus: "电子记录管理现代化、系统能力需求和联邦机构采购/实施参考",
  }),
  policySeed({
    id: "nara-universal-erm-requirements",
    titleEn: "Universal Electronic Records Management Requirements",
    titleZh: "NARA 通用电子记录管理需求",
    sourceUrl:
      "https://www.archives.gov/records-mgmt/policy/universalermrequirements",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["Universal ERM Requirements", "电子记录系统", "功能需求"],
    focus: "电子记录管理系统功能、元数据、处置、检索和合规能力需求",
  }),
  policySeed({
    id: "nara-email-management",
    titleEn: "Email Management",
    titleZh: "NARA 电子邮件记录管理",
    sourceUrl: "https://www.archives.gov/records-mgmt/email-management",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["email records", "Capstone", "电子邮件", "电子消息"],
    focus: "电子邮件和电子消息记录的识别、保管、处置与 Capstone 方法",
  }),
  policySeed({
    id: "nara-general-records-schedules",
    titleEn: "General Records Schedules",
    titleZh: "NARA 通用记录表（GRS）",
    sourceUrl: "https://www.archives.gov/records-mgmt/grs",
    resourceType: "portal",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["GRS", "General Records Schedules", "记录处置", "保管期限表"],
    focus: "联邦机构通用记录保管期限表、处置授权和跨机构记录类别",
  }),
  policySeed({
    id: "nara-records-management-self-assessment",
    titleEn: "Records Management Self-Assessment",
    titleZh: "NARA 记录管理自评估",
    sourceUrl: "https://www.archives.gov/records-mgmt/resources/rm-assessments",
    resourceType: "program",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["RMSA", "自评估", "合规评估", "记录管理成熟度"],
    focus: "联邦机构记录管理项目自我评估、绩效报告和风险识别",
  }),
  policySeed({
    id: "nara-federal-agency-reporting",
    titleEn: "Federal Agency Records Management Reporting",
    titleZh: "NARA 联邦机构记录管理报告",
    sourceUrl: "https://www.archives.gov/records-mgmt/resources/reporting",
    resourceType: "portal",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["报告", "合规", "机构记录管理", "RMSA"],
    focus: "联邦机构记录管理报告、自评估结果和 NARA 监督数据入口",
  }),
  policySeed({
    id: "nara-transfer-electronic-records",
    titleEn: "Transfer Guidance for Electronic Records",
    titleZh: "NARA 电子记录移交指南",
    sourceUrl:
      "https://www.archives.gov/records-mgmt/policy/transfer-guidance-tables.html",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["电子记录移交", "数字保存", "文件格式", "NARA"],
    focus: "永久电子记录向 NARA 移交时的格式、文件包和技术要求",
  }),
  policySeed({
    id: "nara-bulletin-2014-04-format-guidance",
    titleEn:
      "NARA Bulletin 2014-04: Revised Format Guidance for the Transfer of Permanent Electronic Records",
    titleZh: "NARA Bulletin 2014-04：永久电子记录移交格式指南",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2014/2014-04.html",
    resourceType: "guidance",
    primaryTopicId: "digital-resources-preservation",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["NARA Bulletin", "电子记录移交", "文件格式", "永久记录", "数字保存"],
    focus: "永久电子记录移交到 NARA 时允许或推荐的文件格式、格式风险和长期保存要求",
    officialFileType: "html",
  }),
  policySeed({
    id: "nara-bulletin-2015-04-metadata-guidance",
    titleEn:
      "NARA Bulletin 2015-04: Metadata Guidance for the Transfer of Permanent Electronic Records",
    titleZh: "NARA Bulletin 2015-04：永久电子记录移交元数据指南",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2015/2015-04.html",
    resourceType: "guidance",
    primaryTopicId: "digital-resources-preservation",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["NARA Bulletin", "元数据", "电子记录移交", "永久记录", "数字保存"],
    focus: "永久电子记录移交过程中的元数据字段、上下文信息和后续可发现性要求",
    officialFileType: "html",
  }),
  policySeed({
    id: "nara-bulletin-2020-01-electronic-records-transition",
    titleEn:
      "NARA Bulletin 2020-01: Guidance on OMB/NARA Memorandum M-19-21 Transition to Electronic Records",
    titleZh: "NARA Bulletin 2020-01：向电子记录转型执行指南",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2020/2020-01",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["NARA Bulletin", "M-19-21", "电子记录转型", "无纸化移交", "数字政府"],
    focus: "联邦机构执行 M-19-21、停止纸质记录移交并转向电子记录管理的具体要求",
    officialFileType: "html",
  }),
  policySeed({
    id: "nara-bulletin-2023-02-capstone-electronic-messages",
    titleEn:
      "NARA Bulletin 2023-02: Expanding the Use of the Capstone Approach for Electronic Messages",
    titleZh: "NARA Bulletin 2023-02：电子消息 Capstone 管理方法扩展",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2023/2023-02",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["NARA Bulletin", "Capstone", "电子消息", "电子邮件记录", "记录处置"],
    focus: "将 Capstone 方法从电子邮件扩展到聊天、即时通信和其他电子消息记录的管理",
    officialFileType: "html",
  }),
  policySeed({
    id: "nara-bulletin-2023-04-collaboration-platforms",
    titleEn:
      "NARA Bulletin 2023-04: Managing Records in Collaboration Platforms",
    titleZh: "NARA Bulletin 2023-04：协作平台中的记录管理",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2023/2023-04",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: [
      "electronic-records-management",
      "digital-resources-preservation",
      "ai-emerging-technologies",
    ],
    tags: ["NARA Bulletin", "协作平台", "电子记录", "Teams", "Slack", "数字办公"],
    focus: "联邦机构在协作平台、聊天工具和数字办公系统中识别、捕获、保存和处置记录",
    officialFileType: "html",
  }),
  policySeed({
    id: "nara-bulletin-2025-01-classified-electronic-records-metadata",
    titleEn:
      "NARA Bulletin 2025-01: Metadata Guidance for Transfer of Classified Electronic Records",
    titleZh: "NARA Bulletin 2025-01：涉密电子记录移交元数据指南",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2025/2025-01",
    resourceType: "guidance",
    primaryTopicId: "digital-resources-preservation",
    topicIds: [
      "digital-resources-preservation",
      "electronic-records-management",
      "laws-policies-governance",
    ],
    tags: ["NARA Bulletin", "涉密记录", "元数据", "电子记录移交", "长期保存"],
    focus: "涉密电子记录向 NARA 移交时的元数据、访问控制和长期保存上下文要求",
    officialFileType: "html",
  }),
  policySeed({
    id: "nara-records-control-schedules",
    titleEn: "Records Control Schedules",
    titleZh: "NARA 记录控制表",
    sourceUrl: "https://www.archives.gov/records-mgmt/rcs",
    resourceType: "portal",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["records schedules", "记录控制表", "保管期限", "记录处置"],
    focus: "联邦机构记录控制表、处置授权和机构记录保管期限管理",
  }),
  policySeed({
    id: "nara-capstone-email-management",
    titleEn: "Capstone Approach for Email Management",
    titleZh: "NARA 电子邮件管理 Capstone 方法",
    sourceUrl: "https://www.archives.gov/records-mgmt/email-management/capstone",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["Capstone", "email records", "电子邮件记录", "记录管理"],
    focus: "以职位和账户角色为核心的电子邮件记录捕获、保管和处置方法",
  }),
  policySeed({
    id: "nara-electronic-records-archives-era",
    titleEn: "Electronic Records Archives",
    titleZh: "NARA 电子记录档案系统（ERA）",
    sourceUrl: "https://www.archives.gov/records-mgmt/era",
    resourceType: "system",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["ERA", "电子记录档案", "记录移交", "系统"],
    focus: "联邦机构电子记录移交、处置请求和 NARA 电子记录档案系统使用",
  }),
  policySeed({
    id: "nara-federal-records-centers",
    titleEn: "Federal Records Centers",
    titleZh: "NARA 联邦记录中心",
    sourceUrl: "https://www.archives.gov/frc",
    resourceType: "portal",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "digital-resources-preservation"],
    tags: ["FRC", "联邦记录中心", "记录存储", "记录服务"],
    focus: "联邦记录中心网络、临时记录存储、检索服务和机构记录管理支持",
  }),
];

const locSeeds = [
  policySeed({
    source: "loc",
    id: "loc-digital-preservation",
    titleEn: "Digital Preservation",
    titleZh: "美国国会图书馆数字保存资源",
    sourceUrl: "https://www.loc.gov/preservation/digital/",
    sourceDomain: "loc.gov",
    sourceName: "Library of Congress",
    institutionId: "loc",
    resourceType: "portal",
    primaryTopicId: "digital-resources-preservation",
    topicIds: ["digital-resources-preservation", "access-outreach-public-participation"],
    tags: ["Library of Congress", "数字保存", "数字馆藏", "长期保存"],
    focus: "数字保存政策、工具、格式资源和长期保存实践入口",
    versioningApplicable: false,
  }),
  policySeed({
    source: "loc",
    id: "loc-recommended-formats-statement",
    titleEn: "Recommended Formats Statement",
    titleZh: "美国国会图书馆推荐格式声明",
    sourceUrl: "https://www.loc.gov/preservation/resources/rfs/",
    sourceDomain: "loc.gov",
    sourceName: "Library of Congress",
    institutionId: "loc",
    resourceType: "guidance",
    primaryTopicId: "digital-resources-preservation",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["Recommended Formats Statement", "数字格式", "长期保存", "馆藏建设"],
    focus: "不同类型数字和实体资料的推荐保存格式、可持续性和采集参考标准",
  }),
  policySeed({
    source: "loc",
    id: "loc-sustainability-of-digital-formats",
    titleEn: "Sustainability of Digital Formats",
    titleZh: "美国国会图书馆数字格式可持续性资源",
    sourceUrl: "https://www.loc.gov/preservation/digital/formats/",
    sourceDomain: "loc.gov",
    sourceName: "Library of Congress",
    institutionId: "loc",
    resourceType: "database",
    primaryTopicId: "digital-resources-preservation",
    topicIds: ["digital-resources-preservation", "electronic-records-management"],
    tags: ["digital formats", "格式可持续性", "数字保存", "元数据"],
    focus: "数字文件格式特征、风险、可持续性因素和长期保存决策参考",
  }),
];

const aiEmergingSeeds = [
  policySeed({
    source: "nara",
    id: "nara-artificial-intelligence",
    titleEn: "Artificial Intelligence at the National Archives",
    titleZh: "NARA 人工智能实践入口",
    sourceUrl: "https://www.archives.gov/ai",
    sourceDomain: "archives.gov",
    sourceName: "National Archives",
    institutionId: "nara",
    resourceType: "portal",
    primaryTopicId: "ai-emerging-technologies",
    topicIds: [
      "ai-emerging-technologies",
      "electronic-records-management",
      "digital-resources-preservation",
    ],
    tags: ["AI", "人工智能", "NARA", "数字档案", "新兴技术"],
    focus: "NARA 对人工智能使用、治理、透明度和档案业务场景的说明",
    versioningApplicable: false,
  }),
  policySeed({
    source: "loc",
    id: "loc-labs-machine-learning",
    titleEn: "Library of Congress Labs Machine Learning Experiments",
    titleZh: "美国国会图书馆实验室机器学习实验",
    sourceUrl: "https://labs.loc.gov/work/experiments/machine-learning/",
    sourceDomain: "labs.loc.gov",
    sourceName: "Library of Congress Labs",
    institutionId: "loc",
    resourceType: "program",
    primaryTopicId: "ai-emerging-technologies",
    topicIds: ["ai-emerging-technologies", "digital-resources-preservation"],
    tags: ["machine learning", "机器学习", "LOC Labs", "数字馆藏", "实验项目"],
    focus: "机器学习在数字馆藏探索、图像文本处理和文化遗产资料实验中的应用",
    versioningApplicable: false,
  }),
  policySeed({
    source: "nara",
    id: "nara-catalog-api",
    titleEn: "National Archives Catalog API",
    titleZh: "NARA Catalog API",
    sourceUrl: "https://www.archives.gov/developer",
    sourceDomain: "archives.gov",
    sourceName: "National Archives",
    institutionId: "nara",
    resourceType: "system",
    primaryTopicId: "ai-emerging-technologies",
    topicIds: [
      "ai-emerging-technologies",
      "digital-resources-preservation",
      "access-outreach-public-participation",
    ],
    tags: ["API", "开放接口", "NARA Catalog", "数据获取", "数字人文"],
    focus: "通过开放接口访问 NARA Catalog 元数据和数字对象，为数据驱动研究提供入口",
    versioningApplicable: false,
  }),
  policySeed({
    source: "loc",
    id: "loc-digital-scholarship",
    titleEn: "Digital Scholarship at the Library of Congress",
    titleZh: "美国国会图书馆数字学术资源",
    sourceUrl: "https://labs.loc.gov/work/",
    sourceDomain: "labs.loc.gov",
    sourceName: "Library of Congress Labs",
    institutionId: "loc",
    resourceType: "portal",
    primaryTopicId: "ai-emerging-technologies",
    topicIds: ["ai-emerging-technologies", "digital-resources-preservation"],
    tags: ["digital scholarship", "数字学术", "数字人文", "LOC Labs", "开放数据"],
    focus: "数字学术、计算利用、实验项目和文化遗产数据再利用入口",
    versioningApplicable: false,
  }),
  policySeed({
    source: "loc",
    id: "loc-collections-as-data",
    titleEn: "Collections as Data",
    titleZh: "馆藏即数据：文化遗产数据再利用",
    sourceUrl: "https://labs.loc.gov/work/experiments/collections-as-data/",
    sourceDomain: "labs.loc.gov",
    sourceName: "Library of Congress Labs",
    institutionId: "loc",
    resourceType: "program",
    primaryTopicId: "ai-emerging-technologies",
    topicIds: ["ai-emerging-technologies", "digital-resources-preservation"],
    tags: ["Collections as Data", "馆藏即数据", "数字人文", "开放数据", "计算研究"],
    focus: "将图书馆和档案馆藏作为可计算数据进行研究、实验和再利用的方法",
    versioningApplicable: false,
  }),
];

const socialEcosystemSeeds = [
  policySeed({
    source: "nara",
    id: "nara-citizen-archivist-missions",
    titleEn: "Citizen Archivist Missions",
    titleZh: "NARA 公民档案员任务",
    sourceUrl: "https://www.archives.gov/citizen-archivist/missions",
    sourceDomain: "archives.gov",
    sourceName: "National Archives",
    institutionId: "nara",
    resourceType: "program",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "access-outreach-public-participation",
      "digital-resources-preservation",
    ],
    tags: ["Citizen Archivist", "公众参与", "众包", "标签", "转录"],
    focus: "公众通过标签、转录和专题任务参与国家档案馆藏描述与开放利用",
    versioningApplicable: false,
  }),
  policySeed({
    source: "loc",
    id: "loc-by-the-people",
    titleEn: "By the People",
    titleZh: "美国国会图书馆 By the People 众包转录项目",
    sourceUrl: "https://crowd.loc.gov/",
    sourceDomain: "crowd.loc.gov",
    sourceName: "Library of Congress",
    institutionId: "loc",
    resourceType: "program",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "access-outreach-public-participation",
      "digital-resources-preservation",
    ],
    tags: ["众包", "转录", "公众参与", "LOC", "数字馆藏"],
    focus: "公众参与手稿和数字馆藏转录，提升可检索性和开放利用能力",
    versioningApplicable: false,
  }),
  policySeed({
    source: "dpla",
    id: "dpla-digital-public-library",
    titleEn: "Digital Public Library of America",
    titleZh: "美国数字公共图书馆",
    sourceUrl: "https://dp.la/about",
    sourceDomain: "dp.la",
    sourceName: "Digital Public Library of America",
    institutionId: "digital-public-library-of-america",
    resourceType: "database",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "digital-resources-preservation",
      "access-outreach-public-participation",
    ],
    tags: ["DPLA", "数字公共图书馆", "聚合平台", "文化遗产", "开放数据"],
    focus: "跨图书馆、档案馆、博物馆的数字文化遗产聚合与公众访问服务",
    versioningApplicable: false,
  }),
  policySeed({
    source: "saa",
    id: "saa-standards-portal",
    titleEn: "SAA Standards Portal",
    titleZh: "美国档案工作者协会标准门户",
    sourceUrl: "https://www2.archivists.org/standards",
    sourceDomain: "www2.archivists.org",
    sourceName: "Society of American Archivists",
    institutionId: "saa",
    resourceType: "portal",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "laws-policies-governance",
      "electronic-records-management",
    ],
    tags: ["SAA", "专业协会", "标准", "档案描述", "职业生态"],
    focus: "专业协会在档案标准、职业实践和行业共识建设中的作用",
    versioningApplicable: false,
  }),
  policySeed({
    source: "arma",
    id: "arma-generally-accepted-recordkeeping-principles",
    titleEn: "Generally Accepted Recordkeeping Principles",
    titleZh: "ARMA 通用记录管理原则",
    sourceUrl: "https://arma.org/page/GenerallyAcceptedRecordkeepingPrinciples",
    sourceDomain: "arma.org",
    sourceName: "ARMA International",
    institutionId: "arma-international",
    resourceType: "guidance",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "electronic-records-management",
      "laws-policies-governance",
    ],
    tags: ["ARMA", "记录管理", "信息治理", "专业协会", "合规"],
    focus: "专业协会面向组织记录管理和信息治理提出的原则框架",
    versioningApplicable: false,
  }),
  policySeed({
    source: "docnow",
    id: "documenting-the-now",
    titleEn: "Documenting the Now",
    titleZh: "Documenting the Now 社会媒体档案项目",
    sourceUrl: "https://www.docnow.io",
    sourceDomain: "docnow.io",
    sourceName: "Documenting the Now",
    institutionId: "documenting-the-now",
    resourceType: "program",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "ai-emerging-technologies",
      "access-outreach-public-participation",
    ],
    tags: ["DocNow", "社会媒体档案", "社区档案", "数字人文", "伦理采集"],
    focus: "社会媒体记录、社区参与式档案和数字时代资料采集伦理",
    versioningApplicable: false,
  }),
  policySeed({
    source: "cosa",
    id: "cosa-resource-center",
    titleEn: "Council of State Archivists Resource Center",
    titleZh: "美国州档案馆馆长委员会资源中心",
    sourceUrl: "https://statearchivists.org/resource-center/",
    sourceDomain: "statearchivists.org",
    sourceName: "Council of State Archivists",
    institutionId: "council-of-state-archivists",
    resourceType: "portal",
    primaryTopicId: "social-actors-service-ecosystem",
    topicIds: [
      "social-actors-service-ecosystem",
      "electronic-records-management",
      "digital-resources-preservation",
    ],
    tags: ["CoSA", "州档案馆", "专业协作", "资源中心", "电子记录"],
    focus: "州档案馆之间的专业协作、资源共享和州级档案治理实践",
    versioningApplicable: false,
  }),
];

const officialSeeds = [
  ...eCfrSeeds,
  ...usCodeSeeds,
  ...ombSeeds,
  ...naraSeeds,
  ...locSeeds,
  ...aiEmergingSeeds,
  ...socialEcosystemSeeds,
];

function buildAcceptedResource(seed) {
  const slug = slugify(seed.titleEn || seed.titleZh || seed.id);

  return {
    id: seed.id,
    slug,
    titleZh: seed.titleZh,
    titleEn: seed.titleEn,
    countryId: "usa",
    institutionId: seed.institutionId || "nara",
    resourceType: seed.resourceType,
    primaryTopicId: seed.primaryTopicId,
    topicIds: uniqueStrings(seed.topicIds),
    tags: uniqueStrings(seed.tags),
    language: "English",
    summaryShort: seed.summaryShort,
    summaryZh: seed.summaryZh,
    keyPoints: uniqueStrings(seed.keyPoints),
    researchValue: seed.researchValue,
    publishDate: "",
    updatedDate: "",
    collectedAt: today,
    sourceUrl: seed.sourceUrl,
    sourceDomain: seed.sourceDomain,
    accessDate: today,
    lastCheckedAt: today,
    linkStatus: "ok",
    archivedUrl: "",
    hasBackup: false,
    backupVisibility: "private",
    versioningApplicable: Boolean(seed.versioningApplicable),
    hasVersions: false,
    currentVersionId: "",
    versionNote: seed.versionNote,
    status: "published_draft",
  };
}

function buildEnrichment(seed) {
  return {
    resourceId: seed.id,
    titleZh: seed.titleZh,
    summaryShort: seed.summaryShort,
    summaryZh: seed.summaryZh,
    keyPoints: uniqueStrings(seed.keyPoints),
    researchValue: seed.researchValue,
    resourceType: seed.resourceType,
    primaryTopicId: seed.primaryTopicId,
    topicIds: uniqueStrings(seed.topicIds),
    tags: uniqueStrings(seed.tags),
    status: "published_draft",
    versioningApplicable: Boolean(seed.versioningApplicable),
    versionNote: seed.versionNote,
    sourceBasis: "official_curated_discovery",
  };
}

function buildOfficialFile(seed) {
  return {
    id: `official-file-${seed.id}`,
    resourceId: seed.id,
    titleZh: seed.titleZh,
    titleEn: seed.titleEn,
    fileRole: seed.officialFileType === "pdf" ? "official_file" : "official_text",
    sourceReliability: "official",
    sourceName: seed.sourceName,
    sourceUrl: seed.sourceUrl,
    fileUrl: seed.sourceUrl,
    fileType: seed.officialFileType || "html",
    descriptionZh: `该官方入口用于查看“${seed.titleZh}”的原始文本或文件。`,
    isPrimaryAccess: true,
    displayGroup: "official",
    accessNote:
      seed.officialFileType === "pdf"
        ? "官方 PDF 文件，适合下载、引用和核对原始文本。"
        : "官方 HTML 页面，适合查看当前在线文本。",
    collectedAt: today,
  };
}

function formatObject(object, baseIndent = "  ") {
  const json = JSON.stringify(object, null, 2);

  return `${baseIndent}${json.replace(/\n/g, `\n${baseIndent}`)},`;
}

function appendToTsArray(text, objects) {
  if (objects.length === 0) {
    return text;
  }

  const closingArrayPattern = /\n\];\s*$/;

  if (!closingArrayPattern.test(text)) {
    throw new Error("TS 数据文件格式异常：未找到文件末尾的 `];`。");
  }

  const insertion = objects.map((object) => formatObject(object)).join("\n");

  return text.replace(closingArrayPattern, `\n${insertion}\n];\n`);
}

function extractResourceIdsFromText(text) {
  const ids = new Set();
  const matcher = /(?:resourceId|["']resourceId["'])\s*:\s*["']([^"']+)["']/g;

  for (const match of text.matchAll(matcher)) {
    ids.add(match[1]);
  }

  return ids;
}

function extractOfficialFileKeys(text) {
  const keys = new Set();
  const objectMatcher = /\{[\s\S]*?\}/g;

  for (const match of text.matchAll(objectMatcher)) {
    const objectText = match[0];
    const resourceId = objectText.match(
      /(?:resourceId|["']resourceId["'])\s*:\s*["']([^"']+)["']/,
    )?.[1];
    const fileUrl = objectText.match(
      /(?:fileUrl|["']fileUrl["'])\s*:\s*["']([^"']+)["']/,
    )?.[1];

    if (resourceId && fileUrl) {
      keys.add(`${resourceId}::${normalizeUrl(fileUrl)}`);
    }
  }

  return keys;
}

async function appendMessages(messages) {
  if (messages.length === 0) {
    return;
  }

  const previousMessages = await readJson(autopilotMessagesPath, []);
  const safePreviousMessages = Array.isArray(previousMessages)
    ? previousMessages
    : [];
  const merged = [...safePreviousMessages, ...messages].slice(-maxStoredMessages);

  await writeJson(autopilotMessagesPath, merged);
}

function buildMessage(resource, seed, runId) {
  const title = seed.titleZh || seed.titleEn || seed.id;

  return {
    id: `${runId}-${seed.id}-official-discovery`,
    runId,
    resourceId: seed.id,
    title,
    status: "applied",
    message: `《${title}》已补入资料库，已生成中文介绍并发布到前台。`,
    detailUrl: `/resources/${resource.slug}`,
    editUrl: `/admin/resources?resourceId=${encodeURIComponent(seed.id)}`,
    enrichmentReviewUrl: `/admin/resources?resourceId=${encodeURIComponent(seed.id)}`,
    sourceDomain: seed.sourceDomain,
    actionSummary:
      "来自官方资料扩充清单，已生成中文标题、卡片简介、中文摘要、内容要点、研究价值和官方文件入口。",
    autoFixStatus: "auto_applied",
    safetyReasons: ["官方来源", "本地预置高价值资料", "已直接发布到前台"],
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = `discovery-${Date.now()}`;
  const [acceptedResources, resourceEnrichmentsText, resourceOfficialFilesText] =
    await Promise.all([
      readJson(acceptedResourcesPath, []),
      readText(resourceEnrichmentsPath),
      readText(resourceOfficialFilesPath),
    ]);
  const safeAcceptedResources = Array.isArray(acceptedResources)
    ? acceptedResources
    : [];
  const existingResourceIds = new Set(
    safeAcceptedResources.map((resource) => cleanString(resource?.id)).filter(Boolean),
  );
  const existingUrls = new Set(
    safeAcceptedResources
      .map((resource) => normalizeUrl(resource?.sourceUrl))
      .filter(Boolean),
  );
  const existingEnrichmentIds = extractResourceIdsFromText(resourceEnrichmentsText);
  const existingOfficialFileKeys = extractOfficialFileKeys(resourceOfficialFilesText);
  const sourceFilteredSeeds = officialSeeds.filter(
    (seed) => options.source === "all" || seed.source === options.source,
  );
  const candidates = sourceFilteredSeeds.filter((seed) => {
    if (existingResourceIds.has(seed.id)) {
      return false;
    }

    if (existingUrls.has(normalizeUrl(seed.sourceUrl))) {
      return false;
    }

    return true;
  });
  const selectedSeeds = candidates.slice(0, options.limit);
  const resourcesToAppend = selectedSeeds.map(buildAcceptedResource);
  const enrichmentsToAppend = selectedSeeds
    .filter((seed) => !existingEnrichmentIds.has(seed.id))
    .map(buildEnrichment);
  const officialFilesToAppend = selectedSeeds
    .filter(
      (seed) =>
        !existingOfficialFileKeys.has(`${seed.id}::${normalizeUrl(seed.sourceUrl)}`),
    )
    .map(buildOfficialFile);
  const messages = resourcesToAppend.map((resource, index) =>
    buildMessage(resource, selectedSeeds[index], runId),
  );

  console.log("安全官方资料扩充 Agent");
  console.log(`资料种子总数：${officialSeeds.length}`);
  console.log(`来源筛选：${options.source}`);
  console.log(`筛选后种子数量：${sourceFilteredSeeds.length}`);
  console.log(`已存在资料数量：${safeAcceptedResources.length}`);
  console.log(`可新增候选数量：${candidates.length}`);
  console.log(`本次 limit：${options.limit}`);
  console.log(`本次新增资料数量：${resourcesToAppend.length}`);
  console.log(`本次新增中文介绍数量：${enrichmentsToAppend.length}`);
  console.log(`本次新增官方文件入口数量：${officialFilesToAppend.length}`);

  if (resourcesToAppend.length > 0) {
    console.log("本次补入资料：");
    for (const resource of resourcesToAppend) {
      console.log(`- ${resource.id}：${resource.titleZh}`);
    }
  }

  if (options.dryRun) {
    console.log("dry-run 模式：未写入文件。");
    return;
  }

  if (resourcesToAppend.length === 0) {
    console.log("没有新的官方资料需要补入。");
    return;
  }

  await writeJson(acceptedResourcesPath, [
    ...safeAcceptedResources,
    ...resourcesToAppend,
  ]);
  await writeFile(
    resourceEnrichmentsPath,
    appendToTsArray(resourceEnrichmentsText, enrichmentsToAppend),
    "utf8",
  );
  await writeFile(
    resourceOfficialFilesPath,
    appendToTsArray(resourceOfficialFilesText, officialFilesToAppend),
    "utf8",
  );
  await appendMessages(messages);

  console.log(`已写入资料：${acceptedResourcesPath}`);
  console.log(`已写入中文介绍：${resourceEnrichmentsPath}`);
  console.log(`已写入官方文件入口：${resourceOfficialFilesPath}`);
  console.log(`已写入智能体消息：${autopilotMessagesPath}`);
  console.log("新增资料已发布到前台。");
}

main().catch((error) => {
  console.error(`官方资料扩充失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
