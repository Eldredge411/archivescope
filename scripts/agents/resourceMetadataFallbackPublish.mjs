import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRecordTerminology } from "../terminology/normalizeRecordTerminology.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const reportPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAgentReport.json",
);
const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const draftsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);

const allowedTopicIds = new Set([
  "laws-policies-governance",
  "electronic-records-management",
  "digital-resources-preservation",
  "access-outreach-public-participation",
  "ai-emerging-technologies",
  "social-actors-service-ecosystem",
]);

const topicLabels = {
  "laws-policies-governance": "档案法律政策与治理",
  "electronic-records-management": "电子文件与文件管理",
  "digital-resources-preservation": "数字资源与长期保存",
  "access-outreach-public-participation": "开放利用与公众参与",
  "ai-emerging-technologies": "人工智能与新兴技术",
  "social-actors-service-ecosystem": "社会机构与服务生态",
};

const titleZhByResourceId = {
  "fr-2016-30948": "总统图书馆-基金会伙伴关系咨询委员会会议通知",
  "fr-E6-2641": "电子备份磁带处置通知",
  "fr-05-8768": "NARA 设施地点与开放时间规则",
  "fr-05-8765": "克林顿政府电子备份磁带拟处置通知",
  "fr-2010-7776": "国家工业安全计划第 1 号指令",
  "fr-04-5625": "联邦文件管理拟议监管框架",
  "fr-03-28454": "政府范围非采购禁止与暂停及无毒工作场所资助要求",
  "fr-03-26614": "联邦资助项目中残障歧视禁止规则拟议实施",
  "fr-02-16158": "通用文件表 24 信息技术运营与管理文件征求意见",
  "fr-02-15861": "国家历史出版物与文件委员会资助条例",
  "fr-01-12265": "文件处置技术性修订",
  "fr-01-8993": "约翰·F·肯尼迪遇刺文件收藏规则更正",
  "fr-00-20916": "联邦财政资助教育项目中的性别歧视禁止规则",
  "fr-99-30973": "机构文件中心规则",
  "fr-99-27372": "联邦资助教育项目中的性别歧视禁止拟议规则",
  "fr-99-24813": "机密国家安全信息保护规则",
  "fr-99-14382": "原通用文件表 20 所涵盖电子副本文件表征求意见",
  "fr-98-19469": "电子文件工作组报告草案征求意见",
  "fr-98-19466": "电子文件工作组报告草案附录 C",
  "fr-96-3097": "国家历史出版物与文件委员会资助项目程序",
  "fr-95-23818": "联邦文件处置拟议规则",
  "fr-95-13951": "重要文件管理规则",
  "fr-94-13517": "机构项目评估规则",
  "fr-94-13180": "重要文件灾害减缓与恢复规则",
  "fr-94-7187": "尼克松总统历史材料保存、保护与开放利用规则修订",
  "fr-04-10317": "官方印章与标识规则",
  "fr-02-4211": "研究阅览室程序规则",
  "fr-00-30178": "国家历史出版物与文件委员会 Title IX 适用项目通知",
  "fr-95-25548": "高校、医院和非营利组织资助与协议统一行政要求规则",
};

function cleanString(value) {
  return String(value ?? "").trim();
}

function readArgValue(argv, names) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const name = names.find((candidate) => arg === candidate || arg.startsWith(`${candidate}=`));

    if (!name) {
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

function parseArgs(argv) {
  const rawLimit = Number.parseInt(readArgValue(argv, ["--limit"]), 10);

  return {
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50,
    publish: hasArg(argv, ["--publish"]),
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function uniqueStrings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(cleanString).filter(Boolean))];
}

function getDocumentKind(resource) {
  const tags = uniqueStrings(resource.tags).join(" ").toLowerCase();
  const title = cleanString(resource.titleEn).toLowerCase();

  if (tags.includes("proposed rule") || title.includes("proposed")) {
    return "拟议规则";
  }

  if (tags.includes("rule") || ["law", "regulation"].includes(resource.resourceType)) {
    return "规则文件";
  }

  if (tags.includes("notice") || title.includes("meeting")) {
    return "公告通知";
  }

  return "联邦公报资料";
}

function getThemePhrase(resource) {
  const topic = cleanString(resource.primaryTopicId);

  if (topic === "electronic-records-management") {
    return "电子文件管理、文件处置、机构文件管理制度";
  }

  if (topic === "digital-resources-preservation") {
    return "数字资源保存、公共利用与机构服务规范";
  }

  if (topic === "access-outreach-public-participation") {
    return "档案开放利用、公众参与与公共服务程序";
  }

  return "档案法律政策、机构治理与联邦文件管理实践";
}

function buildTitleZh(resource) {
  return (
    titleZhByResourceId[resource.id] ||
    `${cleanString(resource.titleEn) || resource.id}（联邦公报资料）`
  );
}

function buildDraft(resource) {
  const titleZh = buildTitleZh(resource);
  const documentKind = getDocumentKind(resource);
  const themePhrase = getThemePhrase(resource);
  const publishDate = cleanString(resource.publishDate);
  const topicIds = uniqueStrings(resource.topicIds);
  const primaryTopicId = allowedTopicIds.has(resource.primaryTopicId)
    ? resource.primaryTopicId
    : topicIds.find((topicId) => allowedTopicIds.has(topicId)) ||
      "laws-policies-governance";
  const normalizedTopicIds = uniqueStrings([
    primaryTopicId,
    ...topicIds.filter((topicId) => allowedTopicIds.has(topicId)),
  ]);
  const tags = uniqueStrings([
    "Federal Register",
    "NARA",
    "联邦公报",
    "美国国家档案馆",
    ...uniqueStrings(resource.tags),
    ...themePhrase.split("、"),
  ]).slice(0, 10);

  return {
    resourceId: resource.id,
    titleZh,
    summaryShort: `该资料是 NARA 在《联邦公报》发布的${documentKind}，主题涉及${themePhrase}。用户可通过该条目快速了解其制度背景、适用范围和与档案管理实践相关的要点。`,
    summaryZh: `该资料题为“${cleanString(resource.titleEn)}”，由美国国家档案与文件管理局（NARA）通过《联邦公报》发布${publishDate ? `，发布日期为 ${publishDate}` : ""}。作为${documentKind}，它反映了 NARA 在${themePhrase}方面的制度安排、程序要求或公开沟通。该条目用于为中文用户提供基础导读，帮助理解该资料在美国联邦档案治理、文件管理政策、公共服务规则或项目管理中的位置。后续如需正式引用，应以官方链接和联邦公报原文为准。`,
    keyPoints: [
      `资料来源为 Federal Register，发布机构为美国国家档案与文件管理局（NARA）。`,
      `资料类型可理解为${documentKind}，主题集中在${themePhrase}。`,
      `该条目有助于了解 NARA 如何通过联邦公报发布规则、公告、征求意见或程序性信息。`,
      `用户可结合官方来源链接核对具体条文、日期、生效安排和适用范围。`,
    ],
    researchValue: `该资料可作为研究美国联邦档案治理和文件管理制度的基础线索，适合用于比较 NARA 的规则发布机制、联邦公报公告制度、电子文件管理和公共利用程序。对于中文档案学学习者、研究者和从业者，它可以帮助定位相关政策文本，并与中国档案法规、机关文件管理和数字档案长期保存实践进行比较。`,
    resourceType: cleanString(resource.resourceType) || "guidance",
    primaryTopicId,
    topicIds: normalizedTopicIds,
    tags,
    status: "published_draft",
    versioningApplicable: ["law", "regulation", "policy", "strategy", "report"].includes(
      cleanString(resource.resourceType),
    ),
    versionNote:
      "该条目为本地兜底补全内容，已依据标题、来源、类型、专题和标签生成基础导读；后续可从前台管理员入口继续人工校订。",
    sourceBasis: "source_url",
    metadataFallback: true,
    reviewStatus: "accepted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function runApply() {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(command, ["run", "enrich:apply", "--", "--update-existing"], {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (exitCode) => {
      resolve({ ok: exitCode === 0, exitCode, output });
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [report, acceptedResources, drafts] = await Promise.all([
    readJson(reportPath, null),
    readJson(acceptedResourcesPath, []),
    readJson(draftsPath, []),
  ]);

  if (!report) {
    console.error("请先运行 npm run agent:resource-quality");
    process.exitCode = 1;
    return;
  }

  const acceptedById = new Map(
    acceptedResources
      .map((resource) => [cleanString(resource.id), resource])
      .filter(([resourceId]) => Boolean(resourceId)),
  );
  const existingNonRejectedDraftIds = new Set(
    drafts
      .filter((draft) => cleanString(draft.reviewStatus) !== "rejected")
      .map((draft) => cleanString(draft.resourceId))
      .filter(Boolean),
  );
  const needs = Array.isArray(report?.lists?.needsEnrichmentResources)
    ? report.lists.needsEnrichmentResources
    : [];
  const selectedResources = needs
    .map((item) => acceptedById.get(cleanString(item.resourceId)))
    .filter(Boolean)
    .filter((resource) => !existingNonRejectedDraftIds.has(resource.id))
    .slice(0, options.limit);
  const fallbackDrafts = normalizeRecordTerminology(selectedResources.map(buildDraft));

  console.log(`当前 needs_enrichment 数量：${needs.length}`);
  console.log(`本次生成本地兜底草稿数量：${fallbackDrafts.length}`);

  if (fallbackDrafts.length === 0) {
    console.log("没有需要生成本地兜底草稿的资料。");
    return;
  }

  await writeJson(draftsPath, [...drafts, ...fallbackDrafts]);
  console.log(`已写入兜底草稿：${draftsPath}`);

  if (!options.publish) {
    console.log("未传入 --publish，暂不应用到前台。");
    return;
  }

  console.log("正在发布本地兜底草稿到前台……");
  const result = await runApply();

  if (!result.ok) {
    console.error(`发布失败，退出码：${result.exitCode}`);
    process.exitCode = 1;
    return;
  }

  console.log("本地兜底草稿已发布到前台。");
}

main().catch((error) => {
  console.error(`本地兜底发布失败：${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
