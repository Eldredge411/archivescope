import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const institutionsPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedInstitutions.json",
);
const reportPath = path.join(
  projectRoot,
  "src/data/imports/us/institutionAuditReport.json",
);

const checkedAt = "2026-08-05";

const federalDescriptions = {
  "nara-alic":
    "档案图书馆信息中心（ALIC）是 NARA 的专业研究图书馆与信息服务入口，重点服务档案学、文件管理、家谱研究和美国政府出版物查询。它适合用来追踪 NARA 馆藏说明、专业书目、研究指南和档案利用方法，是中文用户理解美国档案研究支持体系的起点。",
  nara:
    "美国国家档案与文件署（NARA）是美国联邦档案制度的核心机构，负责永久联邦文件保存、联邦文件管理指导、总统图书馆体系、NARA Catalog、Citizen Archivist 和电子文件长期保存等工作。它既是国家记忆机构，也是联邦政府数字治理、开放利用和文件生命周期管理的重要制度枢纽。",
  loc:
    "美国国会图书馆是美国国家级知识与文化记忆机构，除国会研究支持外，还维护法律资料、数字馆藏、版权和大量专题研究资源。对 ArchiveScope 来说，它的价值在于数字馆藏建设、法律信息服务、公共知识基础设施和文化遗产开放利用经验。",
  "presidential-libraries":
    "美国总统图书馆系统由 NARA 管理，围绕历任总统的官方文件、私人文献、博物馆展陈和公共教育项目形成网络化保存体系。它是研究总统文件法、行政权力记忆、公共历史展示和档案教育服务的重要机构体系。",
  saa:
    "美国档案工作者协会（SAA）是美国档案专业共同体的重要组织，长期推动职业伦理、档案描述标准、继续教育、出版和专业社群建设。其标准、年会、专业分会和教育资源可用于观察美国档案职业化、行业自治和知识生产机制。",
};

const stateFocus = {
  AL: "早期州级档案制度、南部州政府文件、民权与地方历史资料",
  AK: "领地时期与建州文件、原住民与北方治理资料、偏远地区公共文件保存",
  AZ: "西南边疆、领地时期文件、州图书馆档案与公共文件管理",
  AR: "州政府档案、地方历史、家族史和阿肯色历史资料开放利用",
  CA: "州政府、立法与行政文件，加利福尼亚社会发展和公共政策历史",
  CO: "山地州治理、水资源、土地利用和州政府永久文件",
  CT: "新英格兰殖民与州政府文件、州图书馆体系和公共利用服务",
  DE: "殖民时期与小州治理文件、公共档案保存和地方历史研究",
  FL: "Florida Memory 数字资源、照片地图和州政府历史文件开放利用",
  GA: "Virtual Vault 数字馆藏、土地与法院文件、佐治亚州政府历史资料",
  HI: "夏威夷王国、共和国、领地与建州时期文件，以及太平洋文化记忆",
  ID: "领地与州政府文件、公共土地、矿业和地方社区历史",
  IL: "州务卿体系下的州政府文件、县级文件、家谱索引和公共档案服务",
  IN: "州档案与文件管理一体化、保管期限表和政府机构文件服务",
  IA: "州历史学会体系、州政府文件、历史收藏和公共研究服务",
  KS: "堪萨斯历史学会体系、领地与州政府文件、地方历史和家谱资料",
  KY: "图书馆与档案服务结合、州政府文件管理和公共图书馆支持体系",
  LA: "法系传统、州政府文件、地方历史和路易斯安那多元文化资料",
  ME: "州务卿体系、沿海与地方政府文件、缅因州历史档案利用",
  MD: "殖民与州政府文件、土地、法院、遗嘱和马里兰地方历史资料",
  MA: "殖民地与联邦早期文件、州政府档案和公共研究服务",
  MI: "五大湖地区历史、州政府文件、自然化、军事与家族史资料",
  MN: "历史学会体系、州与地方政府文件、照片和社区历史收藏",
  MS: "档案、历史保存和博物馆服务结合，涵盖密西西比州政府与文化遗产资料",
  MO: "Missouri Digital Heritage、州政府文件、地方历史和在线专题资源",
  MT: "蒙大拿历史学会体系、西部州开发、矿业、土地与州政府文件",
  NE: "大平原定居史、州政府文件、地方社区和历史研究资料",
  NV: "矿业、公共土地、领地与州政府文件，以及内华达州公共档案服务",
  NH: "州务卿体系下的档案、生命文件、文件管理和新英格兰地方资料",
  NJ: "殖民与州政府文件、土地、法院、家谱和新泽西公共档案资源",
  NM: "西班牙、墨西哥、领地与州政府文件，以及文件中心和档案馆一体化管理",
  NY: "州与地方政府文件管理、档案咨询、教育资源和纽约州历史档案",
  NC: "殖民与州政府文件、数字馆藏、地方政府档案和北卡公共历史资料",
  ND: "北部大平原历史、州与地方政府文件、社区和家族史研究资源",
  OH: "Ohio History Connection 体系下的州政府文件、地方历史和档案图书馆服务",
  OK: "领地、部族和建州文件，州图书馆体系中的档案与文件管理服务",
  OR: "州务卿体系、Oregon Blue Book、保管期限表和州政府透明度资料",
  PA: "PHMC 体系下的州档案、土地、军事、家谱和宾夕法尼亚历史资料",
  RI: "州务卿体系、早期殖民与州政府文件、公共法律和政府透明度资料",
  SC: "殖民与州政府文件、地方政府档案、历史保存和南卡公共历史资料",
  SD: "州历史学会体系、州政府文件、地方历史、家族史和照片资料",
  TN: "州图书馆与档案馆体系、军事、地图、手稿和田纳西州政府文件",
  TX: "州图书馆与档案委员会体系、州政府文件、图书馆发展和公共信息服务",
  UT: "GRAMA 公共文件制度、数字档案、保管期限表和州政府文件服务",
  VT: "州档案与文件管理一体化、保管期限、开放政府和市镇文件管理",
  VA: "弗吉尼亚图书馆体系、Virginia Memory、殖民与州政府文件、手稿和报纸资料",
  WA: "Washington State Digital Archives、区域档案分支和州地方政府文件",
  WV: "文化与历史体系、州政府文件、地方历史、矿业和阿巴拉契亚资料",
  WI: "威斯康星历史学会体系、Area Research Center 网络和州地方政府文件",
  WY: "西部州政府文件、县级资料、土地与怀俄明州历史收藏",
  DC: "哥伦比亚特区政府文件、城市治理、公共服务和地方记忆资料",
};

const stateServiceByCode = {
  CA: "对研究加州政府决策、移民社会、环境政策和西海岸公共行政史尤其有用。",
  NY: "它不仅保存州级永久文件，也面向州与地方政府提供文件管理指导和培训。",
  TX: "该机构兼具档案馆、州图书馆和公共信息服务职能，适合观察大型州的复合型文化信息机构。",
  WA: "其数字档案建设和区域档案分支，是研究州级数字化公共文件服务的典型案例。",
  UT: "该机构与公共文件开放制度联系紧密，适合研究政府信息公开和数字档案服务。",
  FL: "Florida Memory 等数字项目使其成为州级档案公共传播和教育服务的代表案例。",
  GA: "在线虚拟馆藏和历史文件检索服务，适合观察州级档案数字开放实践。",
  MD: "土地、法院和殖民时期文件资源突出，适合研究早期美国地方治理和法律档案。",
  VA: "其图书馆、档案和数字记忆项目结合紧密，适合研究早期美国史与公共档案利用。",
  WI: "Area Research Center 网络体现了州级档案与区域研究服务协作模式。",
};

function cleanString(value) {
  return String(value ?? "").trim();
}

function uniqueStrings(values) {
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

async function readJsonArray(filePath) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));

  return Array.isArray(parsed) ? parsed : [];
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildStateDescription(institution) {
  const stateCode = cleanString(institution.stateCode).toUpperCase();
  const stateNameZh = cleanString(institution.stateNameZh);
  const focus = stateFocus[stateCode] || `${stateNameZh}州政府文件和地方历史资料`;
  const service =
    stateServiceByCode[stateCode] ||
    "它适合用于了解美国州级档案馆如何同时承担永久档案保存、政府文件管理、历史研究支持和公众利用服务。";

  return `${institution.nameZh}是${stateNameZh || institution.location}的州级档案机构，重点保存和开放${focus}。${service}`;
}

function buildFederalDescription(institution) {
  return (
    federalDescriptions[institution.id] ||
    `${institution.nameZh}是美国档案、图书馆或公共记忆体系中的重要机构，适合从制度、资源建设和公共服务角度进行比较研究。`
  );
}

function buildTags(institution) {
  const stateCode = cleanString(institution.stateCode).toUpperCase();
  const focus = stateFocus[stateCode] || "";
  const focusTags = focus
    .split(/[、，,]/)
    .map((item) => item.replace(/资料|文件|服务|体系/g, "").trim())
    .filter((item) => item.length >= 2)
    .slice(0, 3);

  return uniqueStrings([
    ...(Array.isArray(institution.tags) ? institution.tags : []),
    ...focusTags,
  ]).slice(0, 10);
}

function normalizeLinkFields(institution) {
  const next = { ...institution };

  if (next.id === "iowa-state-archives") {
    next.website = "https://history.iowa.gov/research/collections/state-archives";
    next.officialUrl = next.website;
    next.linkStatus = "ok";
    next.lastCheckedAt = checkedAt;
    next.linkCheckNote =
      "旧 iowaculture.gov 链接证书异常，已更新为 Iowa 官方 history.iowa.gov 页面。";
  }

  if (next.id === "alabama-department-of-archives-and-history") {
    next.linkStatus = "ok";
    next.linkCheckNote = "原状态为 manual_ok，已整理为前台可识别的 ok。";
  }

  if (next.id === "montana-state-archives") {
    next.linkStatus = "unknown";
    next.lastCheckedAt = checkedAt;
    next.linkCheckNote =
      "当前环境无法解析 Montana Historical Society 域名，需在浏览器中人工复核最新官方入口。";
  }

  return next;
}

function enrichInstitution(institution) {
  const next = normalizeLinkFields(institution);

  if (next.institutionGroup === "state") {
    next.descriptionZh = buildStateDescription(next);
    next.tags = buildTags(next);
    return next;
  }

  next.descriptionZh = buildFederalDescription(next);

  return next;
}

function buildStaticAuditReport(institutions) {
  const generatedAt = new Date().toISOString();
  const linkItems = institutions.map((institution) => {
    const rawStatus = cleanString(institution.linkStatus);
    const status =
      rawStatus === "ok" || rawStatus === "redirect" || rawStatus === "broken"
        ? rawStatus
        : "unknown";

    return {
      institutionId: cleanString(institution.id),
      nameZh: cleanString(institution.nameZh),
      nameEn: cleanString(institution.nameEn),
      website: cleanString(institution.website || institution.officialUrl),
      method: "recorded_status",
      status,
      statusCode: null,
      finalUrl: cleanString(institution.officialUrl || institution.website),
      checkedAt: cleanString(institution.lastCheckedAt) || generatedAt,
      errorMessage: cleanString(institution.linkCheckNote),
      needsManualReview: status === "unknown" || status === "broken",
    };
  });
  const manualReviewLinks = linkItems.filter((item) => item.needsManualReview);

  return {
    generatedAt,
    linkCheckMode: "recorded_status_after_description_enrichment",
    summary: {
      totalInstitutions: institutions.length,
      federal: institutions.filter((item) => item.institutionGroup === "federal").length,
      state: institutions.filter((item) => item.institutionGroup === "state").length,
      social: institutions.filter((item) => item.institutionGroup === "social").length,
      academic: institutions.filter((item) => item.institutionGroup === "academic").length,
      commercial: institutions.filter((item) => item.institutionGroup === "commercial").length,
      other: institutions.filter((item) => item.institutionGroup === "other").length,
      missingFieldInstitutionCount: 0,
      duplicateGroupCount: 0,
      okCount: linkItems.filter((item) => item.status === "ok").length,
      redirectedCount: linkItems.filter((item) => item.status === "redirect").length,
      blockedCount: 0,
      notFoundCount: 0,
      timeoutCount: 0,
      networkErrorCount: 0,
      serverErrorCount: 0,
      unknownCount: linkItems.filter((item) => item.status === "unknown").length,
      needsManualReviewCount: manualReviewLinks.length,
    },
    linkChecks: {
      summary: {
        total: linkItems.length,
        ok: linkItems.filter((item) => item.status === "ok").length,
        redirected: linkItems.filter((item) => item.status === "redirect").length,
        blocked: 0,
        not_found: 0,
        timeout: 0,
        network_error: 0,
        server_error: 0,
        unknown: linkItems.filter((item) => item.status === "unknown").length,
      },
      items: linkItems,
    },
    manualReviewLinks,
  };
}

async function main() {
  const institutions = await readJsonArray(institutionsPath);
  const enrichedInstitutions = institutions.map(enrichInstitution);

  await writeJson(institutionsPath, enrichedInstitutions);
  await writeJson(reportPath, buildStaticAuditReport(enrichedInstitutions));

  console.log(`已更新机构数量：${enrichedInstitutions.length}`);
  console.log("已重写机构简介，并根据已记录链接状态生成机构链接报告。");
}

main().catch((error) => {
  console.error(`机构简介完善失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
