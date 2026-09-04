import acceptedResources from "@/data/imports/us/acceptedResources.json";
import acceptedInstitutions from "@/data/imports/us/acceptedInstitutions.json";
import resourceSnapshotFiles from "@/data/imports/us/resourceSnapshotFiles.json";
import resourceCurationDecisionsJson from "@/data/imports/us/resourceCurationDecisions.json";
import resourceAdminEdits from "@/data/imports/us/resourceAdminEdits.json";
import { resourceEnrichments } from "@/data/imports/us/resourceEnrichments";
import {
  importedEntityRelations,
  importedResourceVersions,
} from "@/data/imports/us/resourceKnowledgeGraph";
import {
  resourceCurationDecisions,
  type ResourceCurationDecision,
} from "@/data/imports/us/resourceCurationDecisions";
import type {
  Country,
  CopyrightStatus,
  Institution,
  InstitutionGroup,
  InstitutionTypeCode,
  Topic,
  Resource,
  ResourceFile,
  ResourceFileType,
  ResourceVersion,
  EntityRelation,
} from "@/types";
import {
  normalizeLinkStatus,
  normalizeResourceStatus,
  normalizeResourceType,
  normalizeVisibility,
} from "@/lib/display";

export const countries: Country[] = [
  {
    id: "usa",
    slug: "usa",
    code: "USA",
    nameZh: "美国",
    nameEn: "United States",
    iso2: "US",
    iso3: "USA",
    status: "active",
    descriptionZh:
      "美国板块聚焦联邦档案法规、机构政策、数字资源建设与公众参与。",
    sortIndex: 0,
  },
  {
    id: "uk",
    slug: "uk",
    code: "UK",
    nameZh: "英国",
    nameEn: "United Kingdom",
    iso2: "GB",
    iso3: "GBR",
    status: "coming_soon",
    descriptionZh: "英国档案机构及相关法规、项目与数字资源（规划中）。",
    sortIndex: 1,
  },
  {
    id: "canada",
    slug: "canada",
    code: "CA",
    nameZh: "加拿大",
    nameEn: "Canada",
    iso2: "CA",
    iso3: "CAN",
    status: "coming_soon",
    descriptionZh: "加拿大档案机构及相关档案政策与资源（规划中）。",
    sortIndex: 2,
  },
  {
    id: "australia",
    slug: "australia",
    code: "AU",
    nameZh: "澳大利亚",
    nameEn: "Australia",
    iso2: "AU",
    iso3: "AUS",
    status: "coming_soon",
    descriptionZh: "澳大利亚档案机构及相关档案制度与项目（规划中）。",
    sortIndex: 3,
  },
  {
    id: "japan",
    slug: "japan",
    code: "JP",
    nameZh: "日本",
    nameEn: "Japan",
    iso2: "JP",
    iso3: "JPN",
    status: "coming_soon",
    descriptionZh: "日本国立公文书馆及相关档案法规与数字化资源（规划中）。",
    sortIndex: 4,
  },
];

const baseInstitutions: Institution[] = [
  {
    id: "nara",
    slug: "nara",
    nameZh: "美国国家档案与文件署",
    nameEn: "National Archives and Records Administration",
    shortName: "NARA",
    countryId: "usa",
    institutionGroup: "federal",
    institutionTypeCode: "archives",
    institutionType: "政府档案机构",
    institutionSubType: "国家档案馆与联邦文件管理机构",
    institutionLevel: "联邦",
    location: "Washington, D.C., United States",
    descriptionZh:
      "NARA 是美国联邦档案的保管机构，负责联邦文件的全生命周期管理、移交接收、保存与公众利用，并运营总统图书馆系统。",
    officialUrl: "https://www.archives.gov",
    tags: ["国家档案馆", "联邦文件", "数字保存", "公众利用", "总统图书馆"],
    linkStatus: "ok",
    lastCheckedAt: "2025-06-01",
    establishedYear: 1934,
  },
  {
    id: "loc",
    slug: "library-of-congress",
    nameZh: "美国国会图书馆",
    nameEn: "Library of Congress",
    shortName: "LOC",
    countryId: "usa",
    institutionGroup: "federal",
    institutionTypeCode: "library",
    institutionType: "图书馆与文化机构",
    institutionSubType: "国家图书馆 / 国会研究机构",
    institutionLevel: "联邦",
    location: "Washington, D.C., United States",
    descriptionZh:
      "美国国会图书馆是美国最大的图书馆与重要文化机构，提供法律文本、数字馆藏与研究服务，是档案与文献研究的重要参考来源。",
    officialUrl: "https://www.loc.gov",
    tags: ["图书馆", "数字馆藏", "法律资料", "文化遗产", "研究服务"],
    linkStatus: "ok",
    lastCheckedAt: "2025-06-01",
    establishedYear: 1800,
  },
  {
    id: "saa",
    slug: "society-of-american-archivists",
    nameZh: "美国档案工作者协会",
    nameEn: "Society of American Archivists",
    shortName: "SAA",
    countryId: "usa",
    institutionGroup: "social",
    institutionTypeCode: "association",
    institutionType: "专业协会",
    institutionSubType: "档案职业组织",
    institutionLevel: "专业组织",
    location: "Chicago, Illinois, United States",
    descriptionZh:
      "SAA 是美国档案领域的专业组织，制定行业标准与职业道德准则，发布专业指南并开展档案教育与培训。",
    officialUrl: "https://www.archivists.org",
    tags: ["专业协会", "档案教育", "行业标准", "职业伦理", "培训"],
    linkStatus: "ok",
    lastCheckedAt: "2025-06-01",
    establishedYear: 1936,
  },
  {
    id: "presidential-libraries",
    slug: "presidential-libraries",
    nameZh: "美国总统图书馆系统",
    nameEn: "Presidential Libraries",
    shortName: "PL",
    countryId: "usa",
    institutionGroup: "federal",
    institutionTypeCode: "archives",
    institutionType: "档案馆系统",
    institutionSubType: "总统档案与博物馆体系",
    institutionLevel: "联邦 / NARA 下属体系",
    location: "United States",
    descriptionZh:
      "总统图书馆系统由 NARA 运营，保管历任总统及其政府的文件与文物，是研究总统档案与行政文件的重要资源体系。",
    officialUrl: "https://www.archives.gov/presidential-libraries",
    tags: ["总统档案", "总统图书馆", "行政文件", "公共利用", "NARA"],
    linkStatus: "ok",
    lastCheckedAt: "2025-06-01",
    establishedYear: 1939,
  },
];

export const topics: Topic[] = [
  {
    id: "laws-policies-governance",
    slug: "laws-policies-archival-governance",
    titleZh: "法规政策与制度治理",
    titleEn: "Laws, Policies and Archival Governance",
    plainQuestion:
      "我想了解一个国家的档案制度、法律依据、政策框架和管理规则。",
    shortDescription:
      "收录各国档案领域的法律法规、政策战略、制度框架、机构职责和治理机制。",
    description:
      "关注各国档案工作的制度基础，包括档案法律法规、公共文件制度、信息公开制度、国家档案战略、机构职责、档案开放规则和相关治理框架。",
    examples: [
      "档案法",
      "公共文件法",
      "信息自由法",
      "总统文件法",
      "国家档案战略",
      "机构政策",
      "开放利用制度",
      "管理条例",
    ],
    relatedKeywords: [
      "档案法",
      "公共文件",
      "信息公开",
      "政策战略",
      "制度治理",
      "机构职责",
      "开放制度",
    ],
    sortIndex: 0,
  },
  {
    id: "electronic-records-management",
    slug: "electronic-records-and-records-management",
    titleZh: "电子文件与文件管理",
    titleEn: "Electronic Records and Records Management",
    plainQuestion:
      "我想了解政府机关和组织在日常工作中产生的电子文件、电子邮件和业务文件应该如何管理、保存、处置和移交。",
    shortDescription:
      "关注各国电子文件和文件的形成、捕获、分类、保存、处置、移交和合规管理。",
    description:
      "关注文件和文件在形成、办理、管理、保存期限控制、处置和移交之前的管理过程，尤其是政府机构、公共部门和组织内部产生的电子文件管理。",
    examples: [
      "电子文件管理政策",
      "文件管理指南",
      "保存期限表",
      "处置规则",
      "电子邮件归档",
      "社交媒体文件管理",
      "电子文件移交要求",
      "合规评估",
    ],
    relatedKeywords: [
      "电子文件",
      "电子文件",
      "文件管理",
      "保存期限",
      "文件处置",
      "归档移交",
      "电子邮件归档",
      "合规管理",
    ],
    sortIndex: 1,
  },
  {
    id: "digital-resources-preservation",
    slug: "digital-resources-and-preservation",
    titleZh: "数字资源建设与长期保存",
    titleEn: "Digital Resources and Preservation",
    plainQuestion:
      "我想了解各国档案馆如何开展档案数字化、建设数字馆藏和目录平台，并长期保存这些数字档案资源。",
    shortDescription:
      "关注档案数字化、数字馆藏、元数据、目录平台、数字保存和长期保存体系建设。",
    description:
      "关注档案资源进入档案机构或资源平台之后，如何被数字化、描述、组织、保存、检索和长期维护，重点包括数字资源平台、数字馆藏、元数据和数字保存战略。",
    examples: [
      "档案数字化项目",
      "数字保存战略",
      "元数据标准",
      "档案目录平台",
      "数字档案馆",
      "数字馆藏建设",
      "长期保存系统",
      "格式迁移",
    ],
    relatedKeywords: [
      "数字化",
      "数字保存",
      "元数据",
      "档案目录",
      "数字馆藏",
      "长期保存",
      "数字档案馆",
      "资源平台",
    ],
    sortIndex: 2,
  },
  {
    id: "access-outreach-public-participation",
    slug: "access-outreach-and-public-participation",
    titleZh: "开放利用、展览教育与公众参与",
    titleEn: "Access, Outreach and Public Participation",
    plainQuestion:
      "我想了解各国档案馆如何服务公众、开放档案、举办展览课程，并吸引公众参与档案工作。",
    shortDescription:
      "关注档案开放利用、查档服务、在线展览、教育课程、公众项目、社区参与和众包协作。",
    description:
      "关注档案机构如何面向公众提供档案查询、利用、展览、教育和社会参与服务，也包括公众参与转录、标引、社区档案和公共历史等项目。",
    examples: [
      "档案开放利用政策",
      "查档服务",
      "在线展览",
      "教育资源",
      "公益课程",
      "公民档案员项目",
      "众包转录",
      "社区档案",
      "公共历史项目",
    ],
    relatedKeywords: [
      "开放利用",
      "查档服务",
      "在线展览",
      "教育资源",
      "公众参与",
      "众包",
      "社区档案",
      "公民档案员",
    ],
    sortIndex: 3,
  },
  {
    id: "ai-emerging-technologies",
    slug: "ai-and-emerging-technologies",
    titleZh: "AI 与新兴技术实践",
    titleEn: "AI and Emerging Technologies",
    plainQuestion:
      "我想了解 AI、大模型、OCR、知识图谱等新技术正在怎样影响档案管理、保存、检索和利用。",
    shortDescription:
      "关注 AI、OCR、自动标引、语义检索、知识图谱、大模型和数字人文等新技术在档案领域的应用。",
    description:
      "关注数智时代各国档案领域的新技术探索，包括人工智能辅助描述、自动分类、手写文字识别、语义检索、知识图谱、数字人文、开放接口、区块链和云存储等实践。",
    examples: [
      "AI 档案描述项目",
      "OCR/HTR 项目",
      "自动标引",
      "智能检索",
      "知识图谱",
      "数字人文项目",
      "开放 API",
      "区块链存证",
      "云端数字保存",
    ],
    relatedKeywords: [
      "AI",
      "人工智能",
      "OCR",
      "HTR",
      "自动标引",
      "语义检索",
      "知识图谱",
      "大模型",
      "数字人文",
      "开放接口",
    ],
    sortIndex: 4,
  },
  {
    id: "social-actors-service-ecosystem",
    slug: "social-actors-and-archival-service-ecosystem",
    titleZh: "社会力量与档案服务生态",
    titleEn: "Social Actors and Archival Service Ecosystem",
    plainQuestion:
      "我想了解除了政府和国家档案馆之外，企业、协会、高校、公益组织和社区如何参与档案建设与服务。",
    shortDescription:
      "关注商业公司、公益组织、专业协会、高校、社区组织等社会主体参与档案建设、服务和项目实践。",
    description:
      "关注国家档案馆之外的多元主体如何参与档案资源建设和档案服务，包括商业公司、技术供应商、专业协会、图书馆、博物馆、高校、公益组织、社区组织和公众社群等。",
    examples: [
      "商业档案服务",
      "企业档案管理平台",
      "数字化外包服务",
      "家谱服务",
      "专业协会项目",
      "高校研究项目",
      "社区档案",
      "公益档案项目",
      "公私合作项目",
    ],
    relatedKeywords: [
      "商业服务",
      "档案服务",
      "专业协会",
      "高校",
      "公益组织",
      "社区档案",
      "企业档案",
      "技术供应商",
      "公私合作",
    ],
    sortIndex: 5,
  },
];

type AcceptedResourceInput = Partial<Resource> & {
  language?: string;
  status?: string;
  targetEntityType?: "resource" | "institution" | "unknown";
};

type ImportedResource = Resource & {
  language: string;
};

type AcceptedInstitutionInput = Partial<Institution> & {
  abbreviation?: string;
  categoryId?: string;
  subcategoryId?: string;
  jurisdictionLevel?: string;
  website?: string;
  status?: string;
  relatedTopicIds?: string[];
};

type ResourceEnrichment = {
  resourceId: string;
  titleZh?: string;
  summaryShort?: string;
  summaryZh?: string;
  keyPoints?: string[];
  researchValue?: string;
  resourceType?: string;
  primaryTopicId?: string;
  topicIds?: string[];
  tags?: string[];
  status?: string;
  versioningApplicable?: boolean;
  versionNote?: string;
};

type ResourceAdminEdit = Partial<Resource> & {
  resourceId?: string;
  manuallyEdited?: boolean;
  updatedAt?: string;
};

type ResourceCurationDecisionInput = Partial<ResourceCurationDecision> & {
  resourceId?: string;
  decision?: string;
};

type ImportedResourceFileInput = Partial<ResourceFile> & {
  fileType?: string;
  visibility?: string;
  copyrightStatus?: string;
};

const baseResources: Resource[] = [
  {
    id: "res-federal-records-act",
    slug: "federal-records-act",
    titleZh: "联邦文件法",
    titleEn: "Federal Records Act",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "law",
    primaryTopicId: "laws-policies-governance",
    topicIds: ["laws-policies-governance", "electronic-records-management"],
    tags: ["联邦文件", "文件管理", "政府文件", "NARA", "法律法规"],
    summaryZh:
      "《联邦文件法》（1934 年制定、1950 年重大修订）是美国联邦文件管理的根本性法律，确立了联邦文件的定义、机构保存义务，以及国家档案与文件署（NARA）在联邦文件全生命周期中的监管职能。",
    keyPoints: [
      "定义“联邦文件”的涵盖范围，包括文件、数据及其他文件材料",
      "要求各联邦机构建立文件管理项目并指定文件官",
      "授权 NARA 批准文件处置申请与保管期限",
      "规定文件的移交、保存与公开流程",
    ],
    researchValue:
      "研究美国档案制度起点与联邦文件治理框架的必读法律文本，为理解 NARA 权力来源与机构间文件责任划分提供基础。",
    publishDate: "1934-06-19",
    updatedDate: "2014-11-26",
    collectedAt: "2025-03-12",
    sourceUrl: "https://www.archives.gov/about/info/laws/fed-records.html",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-12",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/about/info/laws/fed-records.html",
    hasBackup: true,
    backupVisibility: "public",
    hasVersions: true,
    currentVersionId: "ver-fra-current",
    versioningApplicable: true,
    versionNote: "该法规存在多次修订，本站当前仅整理主要版本节点。",
  },
  {
    id: "res-presidential-records-act",
    slug: "presidential-records-act",
    titleZh: "总统文件法",
    titleEn: "Presidential Records Act",
    countryId: "usa",
    institutionId: "presidential-libraries",
    resourceType: "law",
    primaryTopicId: "laws-policies-governance",
    topicIds: [
      "laws-policies-governance",
      "access-outreach-public-participation",
    ],
    tags: ["总统文件", "法律法规", "信息公开", "保存", "开放利用"],
    summaryZh:
      "《总统文件法》（PRA，1978 年制定、1981 年生效）将总统及其团队的公务文件确立为联邦政府财产，由 NARA 通过总统图书馆系统保管，并规定了离职后公开与保密的规则。",
    keyPoints: [
      "明确总统公务文件属于联邦政府财产",
      "建立总统与 NARA 的共同管理机制",
      "规定离职后 12 年内可限制公开的类别",
      "授权总统图书馆系统接收与保管",
    ],
    researchValue:
      "研究总统档案归属、行政特权与公开边界的关键法律，对分析权力交接期的档案管理具有制度意义。",
    publishDate: "1978-11-04",
    updatedDate: "2014-11-26",
    collectedAt: "2025-03-12",
    sourceUrl:
      "https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-12",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    hasBackup: true,
    backupVisibility: "public",
    hasVersions: true,
    currentVersionId: "ver-pra-current",
    versioningApplicable: true,
    versionNote: "该法规存在初始制定、生效与后续整理版本，本站先展示主要版本节点。",
  },
  {
    id: "res-freedom-of-information-act",
    slug: "freedom-of-information-act",
    titleZh: "信息自由法",
    titleEn: "Freedom of Information Act",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "law",
    primaryTopicId: "laws-policies-governance",
    topicIds: [
      "laws-policies-governance",
      "access-outreach-public-participation",
    ],
    tags: ["FOIA", "信息公开", "公众获取", "开放利用", "政府透明"],
    summaryZh:
      "《信息自由法》（FOIA，1966 年制定）赋予公众请求获取联邦机构文件的权利，并设定了九类豁免条款，是研究美国档案开放与公共获取制度的核心法律。",
    keyPoints: [
      "赋予任何人请求联邦机构文件的权利",
      "规定九类豁免公开的情形",
      "要求机构在 20 个工作日内作出回应",
      "与《联邦文件法》共同构成开放与保密的平衡框架",
    ],
    researchValue:
      "分析美国信息公开制度与档案利用政策关系的重要法律文本，可为比较法研究提供参照。",
    publishDate: "1966-07-04",
    updatedDate: "2016-12-16",
    collectedAt: "2025-03-13",
    sourceUrl: "https://www.archives.gov/foia",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-13",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl: "https://web.archive.org/web/2025/https://www.archives.gov/foia",
    hasBackup: true,
    backupVisibility: "public",
    hasVersions: true,
    currentVersionId: "ver-foia-current",
    versioningApplicable: true,
    versionNote: "该法规经历多次重要修订，本站先整理制定版本、重要修订与当前整理版本。",
  },
  {
    id: "res-nara-catalog",
    slug: "nara-catalog",
    titleZh: "NARA 档案目录",
    titleEn: "NARA Catalog",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "catalog",
    primaryTopicId: "digital-resources-preservation",
    topicIds: [
      "digital-resources-preservation",
      "access-outreach-public-participation",
    ],
    tags: ["NARA Catalog", "档案目录", "在线检索", "元数据", "数字资源"],
    summaryZh:
      "NARA Catalog 是美国国家档案馆的在线检索目录，整合了全国档案馆藏的描述性与数字化对象元数据，是公众与研究者获取档案信息的主要入口。",
    keyPoints: [
      "整合档案描述、数字化对象与权限元数据",
      "支持按机构、主题、时间等多维度检索",
      "提供 API 与批量数据下载接口",
      "持续接入新增数字化馆藏",
    ],
    researchValue:
      "研究美国档案数字资源组织方式与元数据标准的一手平台，适合开展数据驱动的档案学研究。",
    publishDate: "2014-12-15",
    updatedDate: "2025-05-20",
    collectedAt: "2025-03-14",
    sourceUrl: "https://catalog.archives.gov",
    sourceDomain: "catalog.archives.gov",
    accessDate: "2025-05-20",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl: null,
    hasBackup: false,
    backupVisibility: "public",
    hasVersions: false,
    versioningApplicable: true,
    versionNote: "该在线平台持续更新，本站暂未整理独立版本沿革。",
  },
  {
    id: "res-nara-digital-preservation-strategy",
    slug: "nara-digital-preservation-strategy",
    titleZh: "NARA 数字保存战略",
    titleEn: "NARA Digital Preservation Strategy",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "strategy",
    primaryTopicId: "digital-resources-preservation",
    topicIds: ["digital-resources-preservation", "laws-policies-governance"],
    tags: ["数字保存", "长期保存", "数字资源", "保存战略", "NARA"],
    summaryZh:
      "NARA 数字保存战略阐述了国家档案馆对原生数字与数字化文件长期保存的目标、原则与技术路径，涵盖格式管理、真实性保障与风险评估。",
    keyPoints: [
      "以格式可接受性列表（Transfer Guidance）规范移交格式",
      "强调文件真实性与完整性保障",
      "采用风险管理与技术监测相结合的策略",
      "规划可持续的长期保存基础设施",
    ],
    researchValue:
      "研究国家档案机构数字保存政策与技术路线的代表性战略文件，为制定本土数字保存框架提供借鉴。",
    publishDate: "2014-08-01",
    updatedDate: "2023-09-12",
    collectedAt: "2025-03-15",
    sourceUrl: "https://www.archives.gov/preservation/digital-preservation",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-15",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/preservation/digital-preservation",
    hasBackup: true,
    backupVisibility: "public",
    hasVersions: true,
    currentVersionId: "ver-dps-current",
    versioningApplicable: true,
    versionNote: "数字保存战略会随技术路线和政策重点调整，本站展示早期版本与当前版本节点。",
  },
  {
    id: "res-nara-records-management-guidance",
    slug: "nara-records-management-guidance",
    titleZh: "NARA 文件管理指南",
    titleEn: "NARA Records Management Guidance",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "guidance",
    primaryTopicId: "electronic-records-management",
    topicIds: ["electronic-records-management", "laws-policies-governance"],
    tags: ["文件管理", "电子文件", "保存期限", "文件处置", "归档移交", "NARA"],
    summaryZh:
      "NARA 文件管理指南面向联邦机构提供文件全生命周期管理的方法与工具，包括保管期限表、电子文件移交与合规评估。",
    keyPoints: [
      "提供通用文件保管期限表（GRS）与机构专属计划编制方法",
      "规范电子文件移交格式与元数据要求",
      "指导 Capstone 邮件管理方法",
      "建立年度文件管理合规自我评估机制",
    ],
    researchValue:
      "研究联邦机构文件管理操作规范与合规框架的核心指南集合，对电子文件治理研究具有方法论价值。",
    publishDate: "2009-06-01",
    updatedDate: "2024-02-28",
    collectedAt: "2025-03-15",
    sourceUrl: "https://www.archives.gov/records-mgmt",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-15",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/records-mgmt",
    hasBackup: true,
    backupVisibility: "restricted",
    hasVersions: false,
    versioningApplicable: true,
    versionNote: "该指南集合持续更新，本站暂未拆分具体历史版本。",
  },
  {
    id: "res-citizen-archivist",
    slug: "citizen-archivist",
    titleZh: "公民档案员项目",
    titleEn: "Citizen Archivist",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "program",
    primaryTopicId: "access-outreach-public-participation",
    topicIds: [
      "access-outreach-public-participation",
      "digital-resources-preservation",
    ],
    tags: ["Citizen Archivist", "公众参与", "众包", "转录", "档案开放"],
    summaryZh:
      "公民档案员项目是 NARA 推动公众参与档案建设的众包项目，志愿者通过转录、加标签与注释提升馆藏的可发现性与可访问性。",
    keyPoints: [
      "开展历史文献转录与标签众包",
      "建立贡献者社区与任务体系",
      "众包成果反哺 NARA Catalog 元数据",
      "强调公众参与与档案民主化",
    ],
    researchValue:
      "研究档案众包与公众参与模式的典型案例，可为中文档案机构开展社会化编目与转录提供实践参照。",
    publishDate: "2010-04-15",
    updatedDate: "2025-01-10",
    collectedAt: "2025-03-16",
    sourceUrl: "https://www.archives.gov/citizen-archivist",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-16",
    lastCheckedAt: "2025-06-01",
    linkStatus: "ok",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/citizen-archivist",
    hasBackup: true,
    backupVisibility: "public",
    hasVersions: false,
    versioningApplicable: false,
    versionNote: "该资料为公众参与项目入口，暂不按法规或指南版本方式管理。",
  },
  {
    id: "res-electronic-records-archives",
    slug: "electronic-records-archives",
    titleZh: "电子文件档案系统",
    titleEn: "Electronic Records Archives (ERA)",
    countryId: "usa",
    institutionId: "nara",
    resourceType: "system",
    primaryTopicId: "electronic-records-management",
    topicIds: [
      "electronic-records-management",
      "digital-resources-preservation",
    ],
    tags: ["Electronic Records Archives", "电子文件", "文件移交", "数字保存", "NARA"],
    summaryZh:
      "电子文件档案系统（ERA）是 NARA 接收、保存与提供联邦电子文件利用的核心系统，支持从联邦机构自动移交到长期保存的全流程。",
    keyPoints: [
      "实现联邦电子文件在线移交与接收",
      "支持多种格式与元数据的保存",
      "提供机构与 NARA 之间的工作流协同",
      "作为联邦电子文件管理基础设施的核心组件",
    ],
    researchValue:
      "研究国家级电子文件管理系统架构与业务流程的重要案例，对电子文件集中接收与长期保存系统建设具有参考价值。",
    publishDate: "2008-06-01",
    updatedDate: "2022-11-30",
    collectedAt: "2025-03-16",
    sourceUrl: "https://www.archives.gov/era",
    sourceDomain: "archives.gov",
    accessDate: "2025-03-16",
    lastCheckedAt: "2025-05-15",
    linkStatus: "redirect",
    archivedUrl: "https://web.archive.org/web/2024/https://www.archives.gov/era",
    hasBackup: true,
    backupVisibility: "restricted",
    hasVersions: false,
    versioningApplicable: true,
    versionNote: "该系统介绍页面可能发生更新，本站暂未整理正式版本沿革。",
  },
];

function slugifyImportedResource(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "imported-resource";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function normalizeResourceFileType(fileType?: string | null): ResourceFileType {
  if (
    fileType === "screenshot" ||
    fileType === "pdf" ||
    fileType === "html" ||
    fileType === "document" ||
    fileType === "image" ||
    fileType === "web_archive" ||
    fileType === "csv" ||
    fileType === "json" ||
    fileType === "other"
  ) {
    return fileType;
  }

  return "other";
}

function normalizeCopyrightStatus(
  copyrightStatus?: string | null,
): CopyrightStatus {
  if (
    copyrightStatus === "public_domain" ||
    copyrightStatus === "government_work" ||
    copyrightStatus === "copyrighted" ||
    copyrightStatus === "unknown"
  ) {
    return copyrightStatus;
  }

  return "unknown";
}

function normalizeInstitutionGroup(value?: string | null): InstitutionGroup {
  if (
    value === "federal" ||
    value === "state" ||
    value === "social" ||
    value === "academic" ||
    value === "commercial" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function normalizeInstitutionTypeCode(
  value?: string | null,
): InstitutionTypeCode {
  if (
    value === "archives" ||
    value === "library" ||
    value === "museum" ||
    value === "association" ||
    value === "government" ||
    value === "research" ||
    value === "company" ||
    value === "nonprofit" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function inferInstitutionGroup(
  institution: AcceptedInstitutionInput,
): InstitutionGroup {
  const text = [
    institution.id,
    institution.nameEn,
    institution.nameZh,
    institution.shortName,
    institution.institutionLevel,
    institution.jurisdictionLevel,
    institution.officialUrl,
    institution.website,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  if (String(institution.institutionGroup || "").trim()) {
    return normalizeInstitutionGroup(institution.institutionGroup);
  }

  if (text.includes("state ") || text.includes("state archives")) {
    return "state";
  }

  if (
    text.includes("archives.gov") ||
    text.includes("loc.gov") ||
    text.includes("nara") ||
    text.includes("federal") ||
    text.includes("presidential libraries") ||
    text.includes("alic")
  ) {
    return "federal";
  }

  if (text.includes("university") || text.includes("college")) {
    return "academic";
  }

  if (text.includes("company") || text.includes("inc.") || text.includes("llc")) {
    return "commercial";
  }

  if (
    text.includes("association") ||
    text.includes("society") ||
    text.includes("nonprofit")
  ) {
    return "social";
  }

  return "other";
}

function inferInstitutionTypeCode(
  institution: AcceptedInstitutionInput,
): InstitutionTypeCode {
  const text = [
    institution.id,
    institution.nameEn,
    institution.nameZh,
    institution.shortName,
    institution.categoryId,
    institution.subcategoryId,
    institution.institutionType,
    institution.institutionSubType,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  if (String(institution.institutionTypeCode || "").trim()) {
    return normalizeInstitutionTypeCode(institution.institutionTypeCode);
  }

  if (text.includes("library") || text.includes("图书馆")) {
    return "library";
  }

  if (text.includes("museum") || text.includes("博物馆")) {
    return "museum";
  }

  if (text.includes("association") || text.includes("society") || text.includes("协会")) {
    return "association";
  }

  if (text.includes("research") || text.includes("研究")) {
    return "research";
  }

  if (text.includes("company") || text.includes("商业")) {
    return "company";
  }

  if (text.includes("government") || text.includes("agency") || text.includes("政府")) {
    return "government";
  }

  if (text.includes("archives") || text.includes("档案")) {
    return "archives";
  }

  if (text.includes("nonprofit") || text.includes("公益")) {
    return "nonprofit";
  }

  return "other";
}

function normalizeImportedInstitution(
  institution: AcceptedInstitutionInput,
): Institution {
  const nameEn =
    institution.nameEn ||
    institution.shortName ||
    institution.nameZh ||
    institution.id ||
    "";
  const nameZh = institution.nameZh || institution.nameEn || institution.id || "";
  const officialUrl = institution.officialUrl || institution.website || "";
  const shortName = institution.shortName || institution.abbreviation || "";

  return {
    id: institution.id || `institution-${slugifyImportedResource(nameEn || nameZh)}`,
    slug:
      institution.slug ||
      slugifyImportedResource(nameEn || nameZh || institution.id || ""),
    nameZh,
    nameEn,
    shortName,
    countryId: institution.countryId || "usa",
    // 未来采集系统中的 institution draft 可直接写入 institutionGroup
    // 和 institutionTypeCode，用于自动进入国家机构导航的对应分区。
    institutionGroup: inferInstitutionGroup(institution),
    institutionTypeCode: inferInstitutionTypeCode(institution),
    institutionType:
      institution.institutionType ||
      institution.categoryId ||
      "机构",
    institutionSubType:
      institution.institutionSubType ||
      institution.subcategoryId ||
      "综合机构",
    institutionLevel:
      institution.institutionLevel ||
      institution.jurisdictionLevel ||
      "national",
    stateCode: institution.stateCode || "",
    stateName: institution.stateName || "",
    stateNameZh: institution.stateNameZh || "",
    location: institution.location || "United States",
    descriptionZh:
      institution.descriptionZh ||
      "该机构条目由采集流程导入，中文简介待补充。",
    officialUrl,
    tags: normalizeStringArray(institution.tags),
    linkStatus: normalizeLinkStatus(institution.linkStatus),
    lastCheckedAt: institution.lastCheckedAt || "",
    establishedYear:
      typeof institution.establishedYear === "number"
        ? institution.establishedYear
        : undefined,
  };
}

function mergeInstitutions(
  baseInstitutionList: Institution[],
  importedInstitutionList: Institution[],
) {
  const mergedInstitutions = baseInstitutionList.map((institution) => ({
    ...institution,
  }));
  const institutionIds = new Set(
    mergedInstitutions.map((institution) => institution.id),
  );
  const institutionWebsites = new Set(
    mergedInstitutions
      .map((institution) => institution.officialUrl)
      .filter(Boolean),
  );
  const institutionNamesEn = new Set(
    mergedInstitutions
      .map((institution) => institution.nameEn.trim().toLowerCase())
      .filter(Boolean),
  );

  importedInstitutionList.forEach((institution) => {
    if (!institution.id) {
      return;
    }
    const normalizedNameEn = institution.nameEn.trim().toLowerCase();

    if (institutionIds.has(institution.id)) {
      return;
    }

    if (
      institution.officialUrl &&
      institutionWebsites.has(institution.officialUrl)
    ) {
      return;
    }

    if (normalizedNameEn && institutionNamesEn.has(normalizedNameEn)) {
      return;
    }

    mergedInstitutions.push(institution);
    institutionIds.add(institution.id);

    if (institution.officialUrl) {
      institutionWebsites.add(institution.officialUrl);
    }

    if (normalizedNameEn) {
      institutionNamesEn.add(normalizedNameEn);
    }
  });

  return mergedInstitutions;
}

function shouldIncludeAcceptedResource(resource: AcceptedResourceInput) {
  if (resource.targetEntityType === "institution") {
    return false;
  }

  if (String(resource.resourceType || "") === "institution_resource") {
    return false;
  }

  const id = String(resource.id || "").trim();
  const sourceUrl = String(resource.sourceUrl || "").trim();
  const institutionLikeResourceIds = new Set([
    "nara-web-alic",
    "nara-web-presidential-libraries",
    "nara-web-about-nara",
  ]);

  if (institutionLikeResourceIds.has(id)) {
    return false;
  }

  return ![
    "https://www.archives.gov/research/alic",
    "https://www.archives.gov/presidential-libraries",
    "https://www.archives.gov/about",
  ].includes(sourceUrl);
}

function getCanonicalResourceSourceKey(resource: Pick<Resource, "sourceUrl">) {
  const sourceUrl = String(resource.sourceUrl || "").trim();

  if (!sourceUrl) {
    return "";
  }

  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
    const federalRegisterDocumentId = pathname.match(
      /^\/documents\/\d{4}\/\d{2}\/\d{2}\/([^/]+)/,
    )?.[1];

    if (hostname === "federalregister.gov" && federalRegisterDocumentId) {
      return `${hostname}:document:${federalRegisterDocumentId}`;
    }

    return `${hostname}${pathname}`;
  } catch {
    return sourceUrl.toLowerCase().replace(/[#?].*$/, "").replace(/\/+$/, "");
  }
}

function normalizeResourceTitleForMerge(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getResourceExactTitleKey(resource: Pick<Resource, "titleEn">) {
  return resource.titleEn.trim().toLowerCase();
}

function getResourceNormalizedTitleMergeKey(
  resource: Pick<
    Resource,
    "institutionId" | "resourceType" | "sourceDomain" | "titleEn"
  >,
) {
  const normalizedTitle = normalizeResourceTitleForMerge(resource.titleEn);
  const wordCount = normalizedTitle.split(" ").filter(Boolean).length;

  if (wordCount < 6) {
    return "";
  }

  return [
    resource.sourceDomain || "unknown-source",
    resource.institutionId || "unknown-institution",
    resource.resourceType || "unknown-type",
    normalizedTitle,
  ].join("|");
}

function normalizeAcceptedResource(resource: AcceptedResourceInput): ImportedResource {
  const primaryTopicId =
    resource.primaryTopicId ||
    resource.topicIds?.find((topicId) => Boolean(topicId)) ||
    "laws-policies-governance";
  const topicIds = Array.from(
    new Set([primaryTopicId, ...normalizeStringArray(resource.topicIds)]),
  );
  const titleEn = resource.titleEn || "";
  const slug = resource.slug || slugifyImportedResource(titleEn || resource.id || "");

  return {
    id: resource.id || `imported-${slug}`,
    slug,
    titleZh: resource.titleZh || "",
    titleEn,
    countryId: resource.countryId || "usa",
    institutionId: resource.institutionId || "nara",
    resourceType: normalizeResourceType(resource.resourceType),
    primaryTopicId,
    topicIds,
    tags: normalizeStringArray(resource.tags),
    summaryShort: resource.summaryShort || "",
    summaryZh: resource.summaryZh || "",
    keyPoints: normalizeStringArray(resource.keyPoints),
    researchValue: resource.researchValue || "",
    publishDate: resource.publishDate || "",
    updatedDate: resource.updatedDate || "",
    collectedAt: resource.collectedAt || "",
    sourceUrl: resource.sourceUrl || "",
    sourceDomain: resource.sourceDomain || "",
    accessDate: resource.accessDate || "",
    lastCheckedAt: resource.lastCheckedAt || "",
    linkStatus: normalizeLinkStatus(resource.linkStatus),
    archivedUrl: resource.archivedUrl ?? "",
    hasBackup: resource.hasBackup ?? false,
    backupVisibility: normalizeVisibility(resource.backupVisibility),
    hasVersions: resource.hasVersions ?? false,
    currentVersionId: resource.currentVersionId || "",
    versioningApplicable: resource.versioningApplicable ?? true,
    versionNote: resource.versionNote || "",
    language: resource.language || "English",
    status: normalizeResourceStatus(resource.status || "imported_draft"),
  };
}

function mergeResources(
  baseResourceList: Resource[],
  importedResourceList: ImportedResource[],
) {
  const mergedResources = baseResourceList.map((resource) => ({ ...resource }));
  const resourceIndexById = new Map(
    mergedResources.map((resource, index) => [resource.id, index]),
  );
  const resourceIndexBySourceUrl = new Map(
    mergedResources
      .map((resource, index) => [
        getCanonicalResourceSourceKey(resource),
        index,
      ] as const)
      .filter(([sourceKey]) => Boolean(sourceKey)),
  );
  const resourceIndexByTitle = new Map(
    mergedResources
      .map((resource, index) => [
        getResourceExactTitleKey(resource),
        index,
      ] as const)
      .filter(([title]) => Boolean(title)),
  );
  const resourceIndexByNormalizedTitle = new Map(
    mergedResources
      .map((resource, index) => [
        getResourceNormalizedTitleMergeKey(resource),
        index,
      ] as const)
      .filter(([title]) => Boolean(title)),
  );

  importedResourceList.forEach((resource) => {
    const sourceKey = getCanonicalResourceSourceKey(resource);
    const titleKey = getResourceExactTitleKey(resource);
    const normalizedTitleKey = getResourceNormalizedTitleMergeKey(resource);
    const duplicateIndex =
      resourceIndexById.get(resource.id) ??
      resourceIndexBySourceUrl.get(sourceKey) ??
      resourceIndexByTitle.get(titleKey) ??
      resourceIndexByNormalizedTitle.get(normalizedTitleKey);

    if (duplicateIndex !== undefined) {
      const existingResource = mergedResources[duplicateIndex];

      mergedResources[duplicateIndex] = {
        ...existingResource,
        titleZh: existingResource.titleZh || resource.titleZh,
        summaryShort: existingResource.summaryShort || resource.summaryShort,
        summaryZh: existingResource.summaryZh || resource.summaryZh,
        keyPoints: existingResource.keyPoints.length
          ? existingResource.keyPoints
          : resource.keyPoints,
        researchValue: existingResource.researchValue || resource.researchValue,
        tags: mergeUniqueStrings(existingResource.tags, resource.tags),
        slugAliases: mergeUniqueStrings(existingResource.slugAliases ?? [], [
          resource.slug,
          ...(resource.slugAliases ?? []),
        ]),
        sourceResourceIds: mergeUniqueStrings(
          existingResource.sourceResourceIds ?? [],
          resource.sourceResourceIds ?? [],
          [resource.id],
        ),
      };
      resourceIndexById.set(resource.id, duplicateIndex);

      if (sourceKey) {
        resourceIndexBySourceUrl.set(sourceKey, duplicateIndex);
      }

      if (titleKey) {
        resourceIndexByTitle.set(titleKey, duplicateIndex);
      }

      if (normalizedTitleKey) {
        resourceIndexByNormalizedTitle.set(normalizedTitleKey, duplicateIndex);
      }

      return;
    }

    const newIndex = mergedResources.length;
    mergedResources.push(resource);
    resourceIndexById.set(resource.id, newIndex);

    if (sourceKey) {
      resourceIndexBySourceUrl.set(sourceKey, newIndex);
    }

    if (titleKey) {
      resourceIndexByTitle.set(titleKey, newIndex);
    }

    if (normalizedTitleKey) {
      resourceIndexByNormalizedTitle.set(normalizedTitleKey, newIndex);
    }
  });

  return mergedResources;
}

function mergeUniqueStrings(...values: string[][]) {
  return Array.from(
    new Set(values.flat().map((value) => value.trim()).filter(Boolean)),
  );
}

function normalizeTopicIds(primaryTopicId: string, topicIds: string[]) {
  return mergeUniqueStrings([primaryTopicId], topicIds);
}

function applyResourceEnrichments(resourceList: Resource[]) {
  const enrichmentByResourceId = new Map(
    (resourceEnrichments as ResourceEnrichment[]).map((enrichment) => [
      enrichment.resourceId,
      enrichment,
    ]),
  );

  return resourceList.map((resource) => {
    const enrichment =
      enrichmentByResourceId.get(resource.id) ??
      resource.sourceResourceIds
        ?.map((resourceId) => enrichmentByResourceId.get(resourceId))
        .find((matchedEnrichment): matchedEnrichment is ResourceEnrichment =>
          Boolean(matchedEnrichment),
        );

    if (!enrichment) {
      return resource;
    }

    const primaryTopicId = enrichment.primaryTopicId || resource.primaryTopicId;
    const enrichmentTopicIds = normalizeStringArray(enrichment.topicIds);
    const resourceTopicIds = normalizeStringArray(resource.topicIds);
    const topicIds = enrichmentTopicIds.length
      ? normalizeTopicIds(primaryTopicId, enrichmentTopicIds)
      : normalizeTopicIds(primaryTopicId, resourceTopicIds);
    const enrichmentTags = normalizeStringArray(enrichment.tags);
    const tags = enrichmentTags.length
      ? mergeUniqueStrings(normalizeStringArray(resource.tags), enrichmentTags)
      : resource.tags;

    return {
      ...resource,
      titleZh: enrichment.titleZh || resource.titleZh,
      summaryShort: enrichment.summaryShort || resource.summaryShort,
      summaryZh: enrichment.summaryZh || resource.summaryZh,
      keyPoints: enrichment.keyPoints?.length
        ? enrichment.keyPoints
        : resource.keyPoints,
      researchValue: enrichment.researchValue || resource.researchValue,
      resourceType: normalizeResourceType(
        enrichment.resourceType || resource.resourceType,
      ),
      primaryTopicId,
      topicIds,
      tags,
      versioningApplicable:
        typeof enrichment.versioningApplicable === "boolean"
          ? enrichment.versioningApplicable
          : resource.versioningApplicable,
      versionNote: enrichment.versionNote || resource.versionNote,
      status: normalizeResourceStatus(enrichment.status || resource.status),
    };
  });
}

function applyResourceAdminEdits(resourceList: Resource[]) {
  const editByResourceId = new Map(
    (resourceAdminEdits as ResourceAdminEdit[])
      .map((edit): [string, ResourceAdminEdit] => [
        String(edit.resourceId || edit.id || "").trim(),
        edit,
      ])
      .filter(([resourceId]) => Boolean(resourceId)),
  );

  return resourceList.map((resource) => {
    const edit = editByResourceId.get(resource.id);

    if (!edit) {
      return resource;
    }

    const primaryTopicId =
      String(edit.primaryTopicId || "").trim() || resource.primaryTopicId;
    const editedTopicIds = normalizeStringArray(edit.topicIds);
    const editedTags = normalizeStringArray(edit.tags);
    const editedKeyPoints = normalizeStringArray(edit.keyPoints);

    return {
      ...resource,
      titleZh: String(edit.titleZh || "").trim() || resource.titleZh,
      titleEn: String(edit.titleEn || "").trim() || resource.titleEn,
      summaryShort:
        String(edit.summaryShort || "").trim() || resource.summaryShort,
      summaryZh: String(edit.summaryZh || "").trim() || resource.summaryZh,
      keyPoints: editedKeyPoints.length ? editedKeyPoints : resource.keyPoints,
      researchValue:
        String(edit.researchValue || "").trim() || resource.researchValue,
      resourceType: normalizeResourceType(
        String(edit.resourceType || "").trim() || resource.resourceType,
      ),
      primaryTopicId,
      topicIds: editedTopicIds.length
        ? normalizeTopicIds(primaryTopicId, editedTopicIds)
        : resource.topicIds,
      tags: editedTags.length ? editedTags : resource.tags,
      versioningApplicable:
        typeof edit.versioningApplicable === "boolean"
          ? edit.versioningApplicable
          : resource.versioningApplicable,
      versionNote: String(edit.versionNote || "").trim() || resource.versionNote,
      status: normalizeResourceStatus(
        String(edit.status || "").trim() || resource.status,
      ),
    };
  });
}

function getResourceCurationDecisionMap() {
  const decisionMap = new Map<string, ResourceCurationDecisionInput>();

  [
    ...(resourceCurationDecisions as ResourceCurationDecisionInput[]),
    ...(resourceCurationDecisionsJson as ResourceCurationDecisionInput[]),
  ].forEach((decision) => {
    const resourceId = String(decision.resourceId || "").trim();

    if (resourceId) {
      decisionMap.set(resourceId, decision);
    }
  });

  return decisionMap;
}

function shouldShowResourceInLibrary(resource: Resource) {
  const decisionMap = getResourceCurationDecisionMap();
  const resourceIds = [resource.id, ...(resource.sourceResourceIds ?? [])];

  return !resourceIds.some((resourceId) => {
    const decision = decisionMap.get(resourceId);

    return (
      decision?.hiddenFromLibrary === true ||
      decision?.decision === "exclude" ||
      decision?.decision === "hidden"
    );
  });
}

function normalizeResourceForDisplay(resource: Resource): Resource {
  const titleEn = resource.titleEn || resource.titleZh || resource.id || "";
  const slug = resource.slug || slugifyImportedResource(titleEn || resource.id || "");
  const primaryTopicId =
    resource.primaryTopicId ||
    normalizeStringArray(resource.topicIds)[0] ||
    "laws-policies-governance";

  return {
    ...resource,
    id: resource.id || `resource-${slug}`,
    slug,
    slugAliases: normalizeStringArray(resource.slugAliases),
    sourceResourceIds: normalizeStringArray(resource.sourceResourceIds),
    titleZh: resource.titleZh || "",
    titleEn,
    countryId: resource.countryId || "usa",
    institutionId: resource.institutionId || "nara",
    resourceType: normalizeResourceType(resource.resourceType),
    primaryTopicId,
    topicIds: normalizeTopicIds(primaryTopicId, normalizeStringArray(resource.topicIds)),
    tags: normalizeStringArray(resource.tags),
    summaryShort: resource.summaryShort || "",
    summaryZh: resource.summaryZh || "",
    keyPoints: normalizeStringArray(resource.keyPoints),
    researchValue: resource.researchValue || "",
    publishDate: resource.publishDate || "",
    updatedDate: resource.updatedDate || "",
    collectedAt: resource.collectedAt || "",
    sourceUrl: resource.sourceUrl || "",
    sourceDomain: resource.sourceDomain || "",
    accessDate: resource.accessDate || "",
    lastCheckedAt: resource.lastCheckedAt || "",
    linkStatus: normalizeLinkStatus(resource.linkStatus),
    archivedUrl: resource.archivedUrl ?? "",
    hasBackup: resource.hasBackup ?? false,
    backupVisibility: normalizeVisibility(resource.backupVisibility),
    hasVersions: resource.hasVersions ?? false,
    currentVersionId: resource.currentVersionId || "",
    versionNote: resource.versionNote || "",
    status: normalizeResourceStatus(resource.status),
  };
}

const normalizedAcceptedInstitutions = (
  acceptedInstitutions as AcceptedInstitutionInput[]
).map(normalizeImportedInstitution);

export const institutions: Institution[] = mergeInstitutions(
  baseInstitutions,
  normalizedAcceptedInstitutions,
);

const normalizedAcceptedResources = (acceptedResources as AcceptedResourceInput[])
  .filter(shouldIncludeAcceptedResource)
  .map(normalizeAcceptedResource);

export const resources: Resource[] = applyResourceAdminEdits(
  applyResourceEnrichments(mergeResources(baseResources, normalizedAcceptedResources))
    .map(normalizeResourceForDisplay),
)
  .map(normalizeResourceForDisplay)
  .filter(shouldShowResourceInLibrary);

const baseResourceFiles: ResourceFile[] = [
  {
    id: "file-fra-screenshot",
    resourceId: "res-federal-records-act",
    versionId: "ver-fra-current",
    fileType: "screenshot",
    fileName: "federal-records-act-page-2025-03-12.png",
    fileUrl: "/backups/federal-records-act-page-2025-03-12.png",
    capturedAt: "2025-03-12",
    visibility: "public",
    description: "《联邦文件法》官方页面截图（2025-03-12）。",
    checksum:
      "sha256:8f1c3a9e2b4d6f8a0c1e3d5b7a9c2e4f6a8b0d2c4e6f8a0b2c4d6e8f0a2c4e6",
    copyrightStatus: "government_work",
  },
  {
    id: "file-fra-pdf",
    resourceId: "res-federal-records-act",
    versionId: "ver-fra-current",
    fileType: "pdf",
    fileName: "federal-records-act-text.pdf",
    fileUrl: "/backups/federal-records-act-text.pdf",
    capturedAt: "2025-03-12",
    visibility: "public",
    description: "《联邦文件法》条文 PDF 备份。",
    checksum:
      "sha256:1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3",
    copyrightStatus: "public_domain",
  },
  {
    id: "file-pra-screenshot",
    resourceId: "res-presidential-records-act",
    versionId: "ver-pra-current",
    fileType: "screenshot",
    fileName: "presidential-records-act-2025-03-12.png",
    fileUrl: "/backups/presidential-records-act-2025-03-12.png",
    capturedAt: "2025-03-12",
    visibility: "public",
    description: "《总统文件法》官方页面截图。",
    checksum:
      "sha256:2b4c6d8e0f2b4c6d8e0f2b4c6d8e0f2b4c6d8e0f2b4c6d8e0f2b4c6d8e0f2b4",
    copyrightStatus: "government_work",
  },
  {
    id: "file-foia-screenshot",
    resourceId: "res-freedom-of-information-act",
    versionId: "ver-foia-current",
    fileType: "screenshot",
    fileName: "nara-foia-2025-03-13.png",
    fileUrl: "/backups/nara-foia-2025-03-13.png",
    capturedAt: "2025-03-13",
    visibility: "public",
    description: "NARA FOIA 页面截图。",
    checksum:
      "sha256:3c5d7e9f1a3c5d7e9f1a3c5d7e9f1a3c5d7e9f1a3c5d7e9f1a3c5d7e9f1a3c",
    copyrightStatus: "government_work",
  },
  {
    id: "file-dps-pdf",
    resourceId: "res-nara-digital-preservation-strategy",
    versionId: "ver-dps-current",
    fileType: "pdf",
    fileName: "nara-digital-preservation-strategy.pdf",
    fileUrl: "/backups/nara-digital-preservation-strategy.pdf",
    capturedAt: "2025-03-15",
    visibility: "public",
    description: "NARA 数字保存战略 PDF 备份。",
    checksum:
      "sha256:4d6e8f0a2c4d6e8f0a2c4d6e8f0a2c4d6e8f0a2c4d6e8f0a2c4d6e8f0a2c4d6",
    copyrightStatus: "government_work",
  },
  {
    id: "file-rmg-pdf",
    resourceId: "res-nara-records-management-guidance",
    fileType: "pdf",
    fileName: "nara-records-mgmt-guidance.pdf",
    fileUrl: "/backups/nara-records-mgmt-guidance.pdf",
    capturedAt: "2025-03-15",
    visibility: "restricted",
    description: "NARA 文件管理指南 PDF 备份（受限）。",
    checksum:
      "sha256:5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e",
    copyrightStatus: "government_work",
  },
  {
    id: "file-citizen-archivist-html",
    resourceId: "res-citizen-archivist",
    fileType: "html",
    fileName: "citizen-archivist-page-2025-03-16.html",
    fileUrl: "/backups/citizen-archivist-page-2025-03-16.html",
    capturedAt: "2025-03-16",
    visibility: "public",
    description: "公民档案员计划页面 HTML 快照。",
    checksum:
      "sha256:6f8a0b2c4d6f8a0b2c4d6f8a0b2c4d6f8a0b2c4d6f8a0b2c4d6f8a0b2c4d6f",
    copyrightStatus: "government_work",
  },
  {
    id: "file-era-screenshot",
    resourceId: "res-electronic-records-archives",
    fileType: "screenshot",
    fileName: "nara-era-2025-03-16.png",
    fileUrl: "/backups/nara-era-2025-03-16.png",
    capturedAt: "2025-03-16",
    visibility: "restricted",
    description: "电子文件档案系统（ERA）介绍页面截图。",
    checksum:
      "sha256:7a9b1c3d5e7a9b1c3d5e7a9b1c3d5e7a9b1c3d5e7a9b1c3d5e7a9b1c3d5e7a",
    copyrightStatus: "government_work",
  },
];

function normalizeImportedResourceFile(
  file: ImportedResourceFileInput,
): ResourceFile {
  return {
    id: file.id || `snapshot-${file.resourceId || "unknown"}-${file.fileName || ""}`,
    resourceId: file.resourceId || "",
    versionId: file.versionId || "",
    fileType: normalizeResourceFileType(file.fileType),
    fileName: file.fileName || "",
    fileUrl: file.fileUrl || "",
    originalUrl: file.originalUrl || "",
    capturedAt: file.capturedAt || "",
    uploadedAt: file.uploadedAt || "",
    visibility: normalizeVisibility(file.visibility),
    description: file.description || "",
    fileSize: typeof file.fileSize === "number" ? file.fileSize : undefined,
    mimeType: file.mimeType || "",
    checksum: file.checksum || "",
    copyrightStatus: normalizeCopyrightStatus(file.copyrightStatus),
    notes: file.notes || "",
  };
}

function mergeResourceFiles(
  baseFileList: ResourceFile[],
  importedFileList: ResourceFile[],
) {
  const mergedFiles = baseFileList.map((file) => ({ ...file }));
  const fileIds = new Set(mergedFiles.map((file) => file.id));

  importedFileList.forEach((file) => {
    if (!file.id || fileIds.has(file.id)) {
      return;
    }

    mergedFiles.push(file);
    fileIds.add(file.id);
  });

  return mergedFiles;
}

const normalizedResourceSnapshotFiles = (
  resourceSnapshotFiles as ImportedResourceFileInput[]
).map(normalizeImportedResourceFile);

export const resourceFiles: ResourceFile[] = mergeResourceFiles(
  baseResourceFiles,
  normalizedResourceSnapshotFiles,
);

const baseResourceVersions: ResourceVersion[] = [
  {
    id: "ver-fra-current",
    resourceId: "res-federal-records-act",
    versionTitle: "Federal Records Act 当前整理版本",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "2014-11-26",
    effectiveDate: "2014-11-26",
    sourceUrl: "https://www.archives.gov/about/info/laws/fed-records.html",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/about/info/laws/fed-records.html",
    summaryZh:
      "当前整理版本以 NARA 官方说明页面为基础，综合呈现《联邦文件法》及后续修订对联邦文件管理职责、处置授权和电子文件治理的影响。",
    keyChanges: [
      "强化联邦机构文件管理项目与 NARA 监督职责",
      "体现电子文件与数字环境下的文件保存要求",
      "将文件处置、移交和保存责任纳入持续监管框架",
    ],
    aiSummary:
      "模拟 AI 摘要：当前版本可作为理解美国联邦文件生命周期治理的综合入口，但正式引用仍应以官方法律文本和 NARA 最新说明为准。",
    humanNote:
      "人工整理说明：本站以 NARA 官方法规说明页作为当前版本线索，未替代正式法典文本。",
    relatedFileIds: ["file-fra-screenshot", "file-fra-pdf"],
  },
  {
    id: "ver-fra-1976",
    resourceId: "res-federal-records-act",
    versionTitle: "1976 年重要修订节点",
    versionNumber: "1976",
    versionStatus: "historical",
    publishDate: "1976-10-21",
    effectiveDate: "1976-10-21",
    sourceUrl: "https://www.archives.gov/about/info/laws/fed-records.html",
    archivedUrl: null,
    summaryZh:
      "1976 年相关修订进一步关联联邦文件处置、文件定义和国家档案机构监管职能，是理解后续文件管理制度演进的重要节点。",
    keyChanges: [
      "延续并调整联邦机构文件管理义务",
      "强化文件处置和批准程序的制度依据",
      "为后续电子文件管理政策提供法律背景",
    ],
    aiSummary:
      "模拟 AI 摘要：该节点体现联邦文件制度从纸质文件管理向更复杂行政文件治理过渡的制度延展。",
    humanNote: "人工整理说明：该条为历史版本节点示例，后续可补充更精确法案编号和原文链接。",
  },
  {
    id: "ver-fra-1950",
    resourceId: "res-federal-records-act",
    versionTitle: "1950 年初始制度化版本",
    versionNumber: "1950",
    versionStatus: "historical",
    publishDate: "1950-09-05",
    effectiveDate: "1950-09-05",
    sourceUrl: "https://www.archives.gov/about/info/laws/fed-records.html",
    archivedUrl: null,
    summaryZh:
      "1950 年版本通常被视为美国联邦文件管理制度系统化的重要起点，明确联邦机构文件管理职责和国家档案机构监管角色。",
    keyChanges: [
      "确立联邦文件管理的制度框架",
      "明确机构文件保存、处置和移交责任",
      "为 NARA 后续文件管理职责提供基础",
    ],
    aiSummary:
      "模拟 AI 摘要：该版本奠定了美国联邦文件制度的基本结构，是比较研究公共文件制度的重要节点。",
    humanNote: "人工整理说明：此处以主要制度节点为线索，并非完整列举全部修订历史。",
  },
  {
    id: "ver-pra-current",
    resourceId: "res-presidential-records-act",
    versionTitle: "Presidential Records Act 当前整理版本",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "2014-11-26",
    effectiveDate: "2014-11-26",
    sourceUrl:
      "https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    summaryZh:
      "当前整理版本围绕总统文件的政府财产属性、离任后管理、公开限制和总统图书馆系统保管机制展开。",
    keyChanges: [
      "强调总统公务文件属于公共文件体系的一部分",
      "说明总统离任后文件移交和限制公开规则",
      "关联总统图书馆系统的保存与利用机制",
    ],
    aiSummary:
      "模拟 AI 摘要：当前版本有助于理解美国总统文件的归属、保管和开放之间的制度平衡。",
    humanNote: "人工整理说明：本站以 NARA 总统图书馆系统官方页面为当前版本入口。",
    relatedFileIds: ["file-pra-screenshot"],
  },
  {
    id: "ver-pra-1981-effective",
    resourceId: "res-presidential-records-act",
    versionTitle: "1981 年生效版本",
    versionNumber: "1981",
    versionStatus: "historical",
    publishDate: "1981-01-20",
    effectiveDate: "1981-01-20",
    sourceUrl:
      "https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    archivedUrl: null,
    summaryZh:
      "1981 年生效节点标志着《总统文件法》开始适用于新一届总统任期，对总统文件的归属和移交产生实际约束。",
    keyChanges: [
      "总统公务文件开始按新制度管理",
      "强化离任后文件由公共机构保管的原则",
      "为后续总统图书馆文件接收奠定流程基础",
    ],
    aiSummary:
      "模拟 AI 摘要：该节点的研究价值在于观察法律文本如何转化为总统文件管理实践。",
    humanNote: "人工整理说明：该版本节点适合与总统换届文件移交制度一起阅读。",
  },
  {
    id: "ver-pra-1978",
    resourceId: "res-presidential-records-act",
    versionTitle: "1978 年初始制定版本",
    versionNumber: "1978",
    versionStatus: "historical",
    publishDate: "1978-11-04",
    effectiveDate: "1981-01-20",
    sourceUrl:
      "https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    archivedUrl: null,
    summaryZh:
      "1978 年制定版本确立总统及其工作人员公务文件不再被视为总统私人财产，而是纳入公共文件治理框架。",
    keyChanges: [
      "确立总统文件的公共属性",
      "规定总统离任后的文件管理和限制公开机制",
      "回应总统档案归属与公共监督问题",
    ],
    aiSummary:
      "模拟 AI 摘要：该版本是研究美国总统档案制度转折的重要法律文本。",
    humanNote: "人工整理说明：后续可继续补充与行政特权、公开限制相关的判例和修订线索。",
  },
  {
    id: "ver-foia-current",
    resourceId: "res-freedom-of-information-act",
    versionTitle: "Freedom of Information Act 当前整理版本",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "2016-12-16",
    effectiveDate: "2016-12-16",
    sourceUrl: "https://www.archives.gov/foia",
    archivedUrl: "https://web.archive.org/web/2025/https://www.archives.gov/foia",
    summaryZh:
      "当前整理版本聚焦公众获取联邦机构文件的权利、例外豁免、办理期限和开放政府原则。",
    keyChanges: [
      "强调公众请求获取联邦机构文件的权利",
      "保留九类豁免公开情形",
      "体现开放政府和主动公开要求的持续扩展",
    ],
    aiSummary:
      "模拟 AI 摘要：当前版本适合作为研究档案开放利用、政府透明和公共获取制度的核心入口。",
    humanNote: "人工整理说明：本站以 NARA FOIA 页面作为资料入口，正式研究应结合司法部和法典文本。",
    relatedFileIds: ["file-foia-screenshot"],
  },
  {
    id: "ver-foia-amendments",
    resourceId: "res-freedom-of-information-act",
    versionTitle: "后续重要修订版本",
    versionNumber: "amendments",
    versionStatus: "historical",
    publishDate: "1996-10-02",
    effectiveDate: "1997-10-02",
    sourceUrl: "https://www.archives.gov/foia",
    archivedUrl: null,
    summaryZh:
      "后续重要修订不断扩展 FOIA 在电子文件、主动公开和办理程序方面的适用范围，是理解信息公开制度演进的重要线索。",
    keyChanges: [
      "将电子文件和在线公开纳入信息公开实践",
      "推动机构主动公开常见文件",
      "进一步规范请求处理和回应程序",
    ],
    aiSummary:
      "模拟 AI 摘要：修订版本体现 FOIA 从纸质文件公开向电子政务环境下的信息获取制度延伸。",
    humanNote: "人工整理说明：此处选取电子文件相关修订作为示例节点，后续可细分更多修订。",
  },
  {
    id: "ver-foia-1966",
    resourceId: "res-freedom-of-information-act",
    versionTitle: "1966 年制定版本",
    versionNumber: "1966",
    versionStatus: "historical",
    publishDate: "1966-07-04",
    effectiveDate: "1967-07-04",
    sourceUrl: "https://www.archives.gov/foia",
    archivedUrl: null,
    summaryZh:
      "1966 年制定版本首次以联邦法律形式确立公众请求获取联邦机构文件的权利，是美国信息公开制度的基础。",
    keyChanges: [
      "确立公众请求联邦机构文件的法律权利",
      "设置机构回应与豁免公开的基本框架",
      "为档案开放利用制度提供重要法律背景",
    ],
    aiSummary:
      "模拟 AI 摘要：该版本奠定了美国信息公开制度的基本逻辑，是研究开放政府的重要起点。",
    humanNote: "人工整理说明：建议与《联邦文件法》共同阅读，以理解文件保存与文件获取之间的关系。",
  },
  {
    id: "ver-dps-current",
    resourceId: "res-nara-digital-preservation-strategy",
    versionTitle: "NARA Digital Preservation Strategy 当前版本",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "2023-09-12",
    effectiveDate: "2023-09-12",
    sourceUrl: "https://www.archives.gov/preservation/digital-preservation",
    archivedUrl:
      "https://web.archive.org/web/2025/https://www.archives.gov/preservation/digital-preservation",
    summaryZh:
      "当前版本体现 NARA 在原生数字文件、数字化对象、格式风险管理和长期保存基础设施方面的战略重点。",
    keyChanges: [
      "强调数字对象长期可用性和真实性保障",
      "关注格式风险、迁移策略和技术监测",
      "将数字保存工作与机构业务流程和基础设施建设结合",
    ],
    aiSummary:
      "模拟 AI 摘要：当前版本可作为理解国家档案机构数字保存治理路线的入口。",
    humanNote: "人工整理说明：本站以 NARA 数字保存页面和相关 PDF 备份作为当前版本来源。",
    relatedFileIds: ["file-dps-pdf"],
  },
  {
    id: "ver-dps-early",
    resourceId: "res-nara-digital-preservation-strategy",
    versionTitle: "NARA Digital Preservation Strategy 早期版本",
    versionNumber: "early",
    versionStatus: "historical",
    publishDate: "2014-08-01",
    effectiveDate: "2014-08-01",
    sourceUrl: "https://www.archives.gov/preservation/digital-preservation",
    archivedUrl: null,
    summaryZh:
      "早期版本主要确立数字保存战略的基础目标，关注格式可接受性、数字对象完整性、风险识别和保存能力建设。",
    keyChanges: [
      "提出数字保存工作的基础原则和目标",
      "强调格式管理和真实性保障",
      "为后续数字保存基础设施建设提供方向",
    ],
    aiSummary:
      "模拟 AI 摘要：早期版本更侧重战略框架搭建，适合与当前版本对比观察保存重点变化。",
    humanNote: "人工整理说明：该节点用于示范战略类资料的版本对照，后续可补充原始 PDF 快照。",
  },
];

export const resourceVersions: ResourceVersion[] = [
  ...baseResourceVersions,
  ...importedResourceVersions,
];

const baseEntityRelations: EntityRelation[] = [
  {
    id: "rel-nara-federal-records-act",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "resource",
    targetId: "res-federal-records-act",
    relationType: "related_to",
    relationLabelZh: "监管职责相关",
    descriptionZh: "NARA 的联邦文件监管职责与《联邦文件法》密切相关。",
    evidenceResourceId: "res-federal-records-act",
    sourceUrl: "https://www.archives.gov/about/info/laws/fed-records.html",
    confidence: "high",
  },
  {
    id: "rel-nara-digital-preservation-strategy",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "resource",
    targetId: "res-nara-digital-preservation-strategy",
    relationType: "issued_by",
    relationLabelZh: "发布",
    descriptionZh: "NARA 发布并维护数字保存战略相关资料。",
    evidenceResourceId: "res-nara-digital-preservation-strategy",
    sourceUrl: "https://www.archives.gov/preservation/digital-preservation",
    confidence: "high",
  },
  {
    id: "rel-nara-records-management-guidance",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "resource",
    targetId: "res-nara-records-management-guidance",
    relationType: "issued_by",
    relationLabelZh: "发布",
    descriptionZh: "NARA 面向联邦机构发布文件管理指南。",
    evidenceResourceId: "res-nara-records-management-guidance",
    sourceUrl: "https://www.archives.gov/records-mgmt",
    confidence: "high",
  },
  {
    id: "rel-nara-catalog",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "resource",
    targetId: "res-nara-catalog",
    relationType: "operated_by",
    relationLabelZh: "运营",
    descriptionZh: "NARA 运营 NARA Catalog 作为档案资源检索入口。",
    evidenceResourceId: "res-nara-catalog",
    sourceUrl: "https://catalog.archives.gov",
    confidence: "high",
  },
  {
    id: "rel-nara-citizen-archivist",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "resource",
    targetId: "res-citizen-archivist",
    relationType: "operated_by",
    relationLabelZh: "运营",
    descriptionZh: "NARA 运营 Citizen Archivist 公众参与项目。",
    evidenceResourceId: "res-citizen-archivist",
    sourceUrl: "https://www.archives.gov/citizen-archivist",
    confidence: "high",
  },
  {
    id: "rel-nara-era",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "resource",
    targetId: "res-electronic-records-archives",
    relationType: "managed_by",
    relationLabelZh: "管理",
    descriptionZh: "NARA 管理电子文件档案系统相关业务与资料。",
    evidenceResourceId: "res-electronic-records-archives",
    sourceUrl: "https://www.archives.gov/era",
    confidence: "high",
  },
  {
    id: "rel-nara-presidential-libraries",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "institution",
    targetId: "presidential-libraries",
    relationType: "managed_by",
    relationLabelZh: "管理 / 关联机构",
    descriptionZh: "美国总统图书馆系统由 NARA 运营管理，是总统档案保存与利用的重要体系。",
    sourceUrl: "https://www.archives.gov/presidential-libraries",
    confidence: "high",
  },
  {
    id: "rel-nara-digital-topic",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "topic",
    targetId: "digital-resources-preservation",
    relationType: "belongs_to_topic",
    relationLabelZh: "关联专题",
    descriptionZh: "NARA 的目录平台、数字化和数字保存工作与数字资源建设专题高度相关。",
    confidence: "high",
  },
  {
    id: "rel-nara-electronic-records-topic",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "topic",
    targetId: "electronic-records-management",
    relationType: "belongs_to_topic",
    relationLabelZh: "关联专题",
    descriptionZh: "NARA 负责联邦电子文件管理指导、移交与长期保存相关工作。",
    confidence: "high",
  },
  {
    id: "rel-nara-loc",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "institution",
    targetId: "loc",
    relationType: "related_to",
    relationLabelZh: "相关机构",
    descriptionZh: "NARA 与美国国会图书馆同属美国重要文化遗产与研究资源机构。",
    sourceUrl: "https://www.loc.gov",
    confidence: "medium",
  },
  {
    id: "rel-nara-saa",
    sourceType: "institution",
    sourceId: "nara",
    targetType: "institution",
    targetId: "saa",
    relationType: "related_to",
    relationLabelZh: "专业领域相关",
    descriptionZh: "NARA 与 SAA 均与美国档案职业、标准和教育实践密切相关。",
    sourceUrl: "https://www.archivists.org",
    confidence: "medium",
  },
];

export const entityRelations: EntityRelation[] = [
  ...baseEntityRelations,
  ...importedEntityRelations,
];
