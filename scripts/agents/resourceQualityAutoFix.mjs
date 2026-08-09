import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const resourceQualityAgentReportPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAgentReport.json",
);
const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const enrichmentDraftsPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceEnrichmentDrafts.json",
);
const autoFixLogPath = path.join(
  projectRoot,
  "src/data/admin/resourceQualityAutoFixLog.json",
);

const allowedTopicIds = new Set([
  "laws-policies-governance",
  "electronic-records-management",
  "digital-resources-preservation",
  "access-outreach-public-participation",
  "ai-emerging-technologies",
  "social-actors-service-ecosystem",
]);
const defaultLimit = 3;
const defaultAiTimeoutSeconds = 60;
const lowValueTerms = [
  "appointment",
  "personnel",
  "generic clearance",
  "information collection",
  "information collection activities",
  "renewal of collection",
  "comment request",
  "meeting notice",
  "solicitation of nominations",
];
const blockingDraftStatuses = new Set([
  "accepted",
  "applied",
  "needs_revision",
  "pending",
]);

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

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

function parseArgs(argv) {
  const rawLimit = readArgValue(argv, ["--limit"]);
  const rawAiTimeout = readArgValue(argv, ["--ai-timeout", "--aiTimeout"]);
  const sourceDomain = readArgValue(argv, [
    "--sourceDomain",
    "--source-domain",
  ]);
  const resourceId = readArgValue(argv, [
    "--resourceId",
    "--resource-id",
    "--force-id",
    "--forceId",
  ]);
  const parsedLimit = Number.parseInt(rawLimit, 10);
  const parsedAiTimeout = Number.parseInt(rawAiTimeout, 10);

  return {
    resourceId: cleanString(resourceId),
    sourceDomain: normalizeSourceDomain(sourceDomain),
    autoSafe: hasArg(argv, ["--auto-safe", "--autoSafe"]),
    publishAll: hasArg(argv, ["--publish-all", "--publishAll"]),
    includeExistingPending: hasArg(argv, ["--include-existing-pending"]),
    aiTimeout:
      Number.isFinite(parsedAiTimeout) && parsedAiTimeout >= 1
        ? parsedAiTimeout
        : defaultAiTimeoutSeconds,
    limit:
      Number.isFinite(parsedLimit) && parsedLimit >= 0
        ? parsedLimit
        : defaultLimit,
  };
}

function normalizeSourceDomain(value) {
  return cleanString(value).toLowerCase().replace(/^www\./, "");
}

async function readJsonFile(filePath, options = {}) {
  const { optional = false, fallback = null } = options;

  try {
    const content = await readFile(filePath, "utf8");

    return JSON.parse(content);
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return fallback;
    }

    throw new Error(`${filePath} 读取失败：${getErrorMessage(error)}`);
  }
}

async function readJsonArray(filePath, options = {}) {
  const parsed = await readJsonFile(filePath, {
    ...options,
    fallback: [],
  });

  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} 内容不是 JSON 数组。`);
  }

  return parsed;
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function cleanStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map(cleanString).filter(Boolean))]
    : [];
}

function getNeedsEnrichmentResources(report) {
  const resources = report?.lists?.needsEnrichmentResources;

  return Array.isArray(resources)
    ? resources
        .map((resource) => ({
          resourceId: cleanString(resource?.resourceId),
          title: cleanString(resource?.title),
          titleZh: cleanString(resource?.titleZh),
          titleEn: cleanString(resource?.titleEn),
          resourceType: cleanString(resource?.resourceType),
          sourceDomain: cleanString(resource?.sourceDomain).toLowerCase(),
          sourceUrl: cleanString(resource?.sourceUrl),
          issueTags: cleanStringArray(resource?.issueTags),
          tags: cleanStringArray(resource?.tags),
          primaryTopicId: cleanString(resource?.primaryTopicId),
          topicIds: cleanStringArray(resource?.topicIds),
          targetEntityType: cleanString(resource?.targetEntityType),
        }))
        .filter((resource) => resource.resourceId)
    : [];
}

function buildAcceptedResourcesById(resources) {
  const resourcesById = new Map();

  for (const resource of resources) {
    const resourceId = cleanString(resource?.id);

    if (!resourceId) {
      continue;
    }

    resourcesById.set(resourceId, resource);
  }

  return resourcesById;
}

function mergeResourceWithAcceptedData(resource, acceptedResourcesById) {
  const acceptedResource = acceptedResourcesById.get(resource.resourceId);

  if (!acceptedResource) {
    return resource;
  }

  return {
    ...resource,
    title:
      resource.title ||
      cleanString(acceptedResource.titleZh) ||
      cleanString(acceptedResource.titleEn),
    titleZh: resource.titleZh || cleanString(acceptedResource.titleZh),
    titleEn: resource.titleEn || cleanString(acceptedResource.titleEn),
    resourceType:
      resource.resourceType || cleanString(acceptedResource.resourceType),
    sourceDomain:
      resource.sourceDomain ||
      cleanString(acceptedResource.sourceDomain).toLowerCase(),
    sourceUrl: resource.sourceUrl || cleanString(acceptedResource.sourceUrl),
    tags: mergeUniqueStrings(resource.tags, acceptedResource.tags),
    primaryTopicId:
      resource.primaryTopicId || cleanString(acceptedResource.primaryTopicId),
    topicIds: mergeUniqueStrings(resource.topicIds, acceptedResource.topicIds),
    targetEntityType:
      resource.targetEntityType || cleanString(acceptedResource.targetEntityType),
  };
}

function mergeUniqueStrings(...values) {
  return [...new Set(values.flat().map(cleanString).filter(Boolean))];
}

function getReportResourceIds(report, listName) {
  const resources = report?.lists?.[listName];

  return new Set(
    Array.isArray(resources)
      ? resources
          .map((resource) => cleanString(resource?.resourceId))
          .filter(Boolean)
      : [],
  );
}

function buildRiskSets(report) {
  return {
    suspectLowRelevance: getReportResourceIds(
      report,
      "suspectLowRelevanceResources",
    ),
    needsClassificationReview: getReportResourceIds(
      report,
      "needsClassificationReviewResources",
    ),
    needsHumanReview: getReportResourceIds(report, "needsHumanReviewResources"),
    needsOfficialFile: getReportResourceIds(report, "needsOfficialFileResources"),
    needsVersionReview: getReportResourceIds(report, "needsVersionReviewResources"),
  };
}

function buildExistingDraftsByResourceId(drafts) {
  const draftsByResourceId = new Map();

  for (const draft of drafts) {
    const resourceId = cleanString(draft?.resourceId);

    if (!resourceId) {
      continue;
    }

    const draftsForResource = draftsByResourceId.get(resourceId) ?? [];

    draftsForResource.push(draft);
    draftsByResourceId.set(resourceId, draftsForResource);
  }

  return draftsByResourceId;
}

function getDraftReviewStatus(draft) {
  return cleanString(draft?.reviewStatus) || "pending";
}

function isNonRejectedDraft(draft) {
  return Boolean(draft?.resourceId) && getDraftReviewStatus(draft) !== "rejected";
}

function isBlockingExistingDraft(draft, options) {
  if (!draft?.resourceId) {
    return false;
  }

  const reviewStatus = getDraftReviewStatus(draft);

  if (reviewStatus === "rejected") {
    return false;
  }

  if (options.includeExistingPending && reviewStatus === "pending") {
    return false;
  }

  return blockingDraftStatuses.has(reviewStatus) || reviewStatus !== "rejected";
}

function getBlockingExistingDraft(drafts, options) {
  return (drafts ?? []).find((draft) => isBlockingExistingDraft(draft, options));
}

function hasAnyExistingDraft(drafts) {
  return (drafts ?? []).some((draft) => Boolean(draft?.resourceId));
}

function getReusableExistingDraft(drafts) {
  return (drafts ?? []).find((draft) =>
    ["pending", "accepted", "applied"].includes(getDraftReviewStatus(draft)),
  );
}

function runEnrichmentGenerate(resourceId, options) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(
      command,
      [
        "run",
        "enrich:generate",
        "--",
        "--force-id",
        resourceId,
        "--ai-timeout",
        String(options.aiTimeout),
      ],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: null,
        generatedCount: 0,
        stdout,
        stderr,
        errorMessage: getErrorMessage(error),
      });
    });

    child.on("close", (exitCode) => {
      const generatedCountMatch = stdout.match(/本次成功生成数量：(\d+)/);
      const generatedCount = generatedCountMatch
        ? Number.parseInt(generatedCountMatch[1], 10)
        : exitCode === 0
          ? 1
          : 0;
      const aiFailureMatch = `${stdout}\n${stderr}`.match(
        /AI 请求失败，已跳过该资料：([^\n]+)/,
      );
      const noDraftGenerated =
        stdout.includes("本次没有成功生成新的 AI enrichment 草稿") ||
        stdout.includes("AI 请求失败");
      const ok = exitCode === 0 && generatedCount > 0 && !noDraftGenerated;

      resolve({
        ok,
        exitCode,
        generatedCount,
        stdout,
        stderr,
        errorMessage:
          ok
            ? ""
            : aiFailureMatch
              ? `AI 请求失败：${aiFailureMatch[1].trim()}`
            : noDraftGenerated
              ? "enrich:generate 未生成新的 AI enrichment 草稿。"
              : `enrich:generate 退出码为 ${exitCode ?? "unknown"}。`,
      });
    });
  });
}

function runEnrichmentApply(resourceId) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(
      command,
      [
        "run",
        "enrich:apply",
        "--",
        "--resourceId",
        resourceId,
        "--update-existing",
      ],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: null,
        appliedCount: 0,
        stdout,
        stderr,
        errorMessage: getErrorMessage(error),
      });
    });

    child.on("close", (exitCode) => {
      const output = `${stdout}\n${stderr}`;
      const appliedCountMatch = output.match(/应用成功后改为 applied 的数量：(\d+)/);
      const appliedCount = appliedCountMatch
        ? Number.parseInt(appliedCountMatch[1], 10)
        : 0;
      const noChangeNeeded =
        output.includes("没有 enrichment 需要追加或更新") ||
        output.includes("应用成功后改为 applied 的数量：0");
      const ok = exitCode === 0 && (appliedCount > 0 || noChangeNeeded);

      resolve({
        ok,
        exitCode,
        appliedCount,
        stdout,
        stderr,
        errorMessage: ok
          ? ""
          : `enrich:apply 未能应用该草稿，退出码为 ${exitCode ?? "unknown"}。`,
      });
    });
  });
}

async function readDraftForResource(resourceId) {
  const drafts = await readJsonArray(enrichmentDraftsPath, {
    optional: true,
  });

  return drafts.find((draft) => cleanString(draft?.resourceId) === resourceId);
}

async function updateDraftStatus(resourceId, reviewStatus, extraFields = {}) {
  const drafts = await readJsonArray(enrichmentDraftsPath, {
    optional: true,
  });
  const updatedAt = new Date().toISOString();
  let updatedDraft = null;
  const updatedDrafts = drafts.map((draft) => {
    if (cleanString(draft?.resourceId) !== resourceId) {
      return draft;
    }

    updatedDraft = {
      ...draft,
      ...extraFields,
      reviewStatus,
      updatedAt,
    };

    return updatedDraft;
  });

  if (!updatedDraft) {
    throw new Error(`未找到 resourceId=${resourceId} 的 AI enrichment 草稿。`);
  }

  await writeJson(enrichmentDraftsPath, updatedDrafts);

  return updatedDraft;
}

function getMatchedLowValueTerms(resource, draft) {
  const text = [
    resource.title,
    resource.titleEn,
    resource.titleZh,
    draft?.titleZh,
    resource.primaryTopicId,
    ...(Array.isArray(resource.topicIds) ? resource.topicIds : []),
    ...(Array.isArray(resource.tags) ? resource.tags : []),
    ...(Array.isArray(draft?.tags) ? draft.tags : []),
  ]
    .map(cleanString)
    .join(" ")
    .toLowerCase();

  return lowValueTerms.filter((term) => text.includes(term));
}

function getMatchedLowValueTermsBeforeGeneration(resource) {
  return getMatchedLowValueTerms(resource, null);
}

function getDraftCompletenessIssues(draft) {
  const issues = [];
  const primaryTopicId = cleanString(draft?.primaryTopicId);
  const topicIds = cleanStringArray(draft?.topicIds);

  if (!cleanString(draft?.titleZh)) {
    issues.push("titleZh 为空");
  }

  if (!cleanString(draft?.summaryShort)) {
    issues.push("summaryShort 为空");
  }

  if (!cleanString(draft?.summaryZh)) {
    issues.push("summaryZh 为空");
  }

  if (cleanStringArray(draft?.keyPoints).length < 3) {
    issues.push("keyPoints 少于 3 条");
  }

  if (!cleanString(draft?.researchValue)) {
    issues.push("researchValue 为空");
  }

  if (cleanStringArray(draft?.tags).length < 3) {
    issues.push("tags 少于 3 个");
  }

  if (!allowedTopicIds.has(primaryTopicId)) {
    issues.push("primaryTopicId 不合法");
  }

  if (primaryTopicId && !topicIds.includes(primaryTopicId)) {
    issues.push("topicIds 未包含 primaryTopicId");
  }

  return issues;
}

function assessPublishAllCompleteness(draft) {
  const completenessIssues = getDraftCompletenessIssues(draft);

  return {
    isComplete: completenessIssues.length === 0,
    completenessIssues,
  };
}

function assessAutoSafe(resource, draft, riskSets) {
  const safetyReasons = [];
  const resourceId = resource.resourceId;
  const resourceType = cleanString(resource.resourceType);
  const draftResourceType = cleanString(draft?.resourceType);
  const matchedLowValueTerms = getMatchedLowValueTerms(resource, draft);
  const targetEntityType =
    cleanString(resource.targetEntityType) || cleanString(draft?.targetEntityType);

  if (resource.sourceDomain !== "archives.gov") {
    safetyReasons.push("来源不是 archives.gov。");
  }

  if (
    ["law", "regulation"].includes(resourceType) ||
    ["law", "regulation"].includes(draftResourceType)
  ) {
    safetyReasons.push("法律法规类资料必须人工审核。");
  }

  if (riskSets.suspectLowRelevance.has(resourceId)) {
    safetyReasons.push("位于疑似低价值资料列表。");
  }

  if (riskSets.needsClassificationReview.has(resourceId)) {
    safetyReasons.push("位于分类复核列表。");
  }

  if (riskSets.needsHumanReview.has(resourceId)) {
    safetyReasons.push("位于人工复核列表。");
  }

  if (
    targetEntityType === "institution" ||
    resourceType === "institution_resource" ||
    draftResourceType === "institution_resource"
  ) {
    safetyReasons.push("疑似机构条目，不能自动应用为资料。");
  }

  if (matchedLowValueTerms.length > 0) {
    safetyReasons.push(
      `标题或标签命中低价值关键词：${matchedLowValueTerms.join(" / ")}。`,
    );
  }

  if (
    riskSets.needsOfficialFile.has(resourceId) &&
    ["law", "regulation", "strategy", "report"].includes(
      resourceType || draftResourceType,
    )
  ) {
    safetyReasons.push("该资料缺少官方文件且需要人工判断官方入口。");
  }

  if (
    riskSets.needsVersionReview.has(resourceId) &&
    ["law", "regulation", "strategy", "report"].includes(
      resourceType || draftResourceType,
    )
  ) {
    safetyReasons.push("该资料版本沿革需复核，不能自动应用。");
  }

  safetyReasons.push(...getDraftCompletenessIssues(draft));

  return {
    isSafe: safetyReasons.length === 0,
    safetyReasons,
  };
}

function assessAutoSafeCandidate(resource, riskSets) {
  const safetyReasons = [];
  const resourceId = resource.resourceId;
  const resourceType = cleanString(resource.resourceType);
  const matchedLowValueTerms = getMatchedLowValueTermsBeforeGeneration(resource);
  const targetEntityType = cleanString(resource.targetEntityType);

  if (resource.sourceDomain !== "archives.gov") {
    safetyReasons.push("来源不是 archives.gov。");
  }

  if (resourceType === "law" || resourceType === "regulation") {
    safetyReasons.push("法律法规类资料必须人工审核。");
  }

  if (riskSets.suspectLowRelevance.has(resourceId)) {
    safetyReasons.push("位于疑似低价值资料列表。");
  }

  if (riskSets.needsClassificationReview.has(resourceId)) {
    safetyReasons.push("位于分类复核列表。");
  }

  if (riskSets.needsHumanReview.has(resourceId)) {
    safetyReasons.push("位于人工复核列表。");
  }

  if (targetEntityType === "institution" || resourceType === "institution_resource") {
    safetyReasons.push("疑似机构条目，不能自动应用为资料。");
  }

  if (matchedLowValueTerms.length > 0) {
    safetyReasons.push(
      `标题或标签命中低价值关键词：${matchedLowValueTerms.join(" / ")}。`,
    );
  }

  return {
    isSafeCandidate: safetyReasons.length === 0,
    safetyReasons,
  };
}

function isNeedsHumanReviewStatus(resource, riskSets) {
  return (
    riskSets.needsHumanReview.has(resource.resourceId) ||
    riskSets.needsClassificationReview.has(resource.resourceId) ||
    riskSets.suspectLowRelevance.has(resource.resourceId)
  );
}

function makeLogEntry({
  resource,
  status,
  reason,
  action = "generate_enrichment_draft",
  isSafe = false,
  safetyReasons = [],
  failureReason = "",
  startedAt,
  finishedAt = new Date().toISOString(),
}) {
  const normalizedReason =
    reason || failureReason || safetyReasons.filter(Boolean).join("；");

  return {
    resourceId: resource.resourceId,
    title: resource.title,
    action,
    status,
    isSafe,
    safetyReasons,
    failureReason,
    reason: normalizedReason,
    startedAt,
    finishedAt,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;

  try {
    report = await readJsonFile(resourceQualityAgentReportPath);
  } catch (error) {
    if (getErrorMessage(error).includes("ENOENT")) {
      console.error("请先运行 npm run agent:resource-quality");
      process.exitCode = 1;
      return;
    }

    console.error(getErrorMessage(error));
    process.exitCode = 1;
    return;
  }

  const riskSets = buildRiskSets(report);
  const acceptedResources = await readJsonArray(acceptedResourcesPath, {
    optional: true,
  });
  const acceptedResourcesById = buildAcceptedResourcesById(acceptedResources);
  const needsEnrichmentResources = getNeedsEnrichmentResources(report).map(
    (resource) => mergeResourceWithAcceptedData(resource, acceptedResourcesById),
  );
  const existingDrafts = await readJsonArray(enrichmentDraftsPath, {
    optional: true,
  });
  const existingDraftsByResourceId = buildExistingDraftsByResourceId(existingDrafts);
  const resourcesWithNonRejectedDrafts = new Set();
  const resourcesSkippedByExistingDraft = new Set();
  const candidateResources = [];

  for (const resource of needsEnrichmentResources) {
    if (
      options.sourceDomain &&
      normalizeSourceDomain(resource.sourceDomain) !== options.sourceDomain
    ) {
      continue;
    }

    const draftsForResource =
      existingDraftsByResourceId.get(resource.resourceId) ?? [];
    const blockingDraft = getBlockingExistingDraft(draftsForResource, options);

    if (draftsForResource.some(isNonRejectedDraft)) {
      resourcesWithNonRejectedDrafts.add(resource.resourceId);
    }

    if (blockingDraft && !options.publishAll) {
      resourcesSkippedByExistingDraft.add(resource.resourceId);
      continue;
    }

    candidateResources.push(resource);
  }

  const autoSafeCandidateAssessments = new Map(
    candidateResources.map((resource) => [
      resource.resourceId,
      assessAutoSafeCandidate(resource, riskSets),
    ]),
  );
  const autoSafeCandidateResources = candidateResources.filter(
    (resource) =>
      autoSafeCandidateAssessments.get(resource.resourceId)?.isSafeCandidate,
  );
  const selectableResources =
    options.publishAll
      ? candidateResources
      : options.autoSafe && !options.resourceId
      ? autoSafeCandidateResources
      : candidateResources;
  const selectedResources = options.resourceId
    ? needsEnrichmentResources.filter(
        (resource) =>
          resource.resourceId === options.resourceId &&
          (!options.sourceDomain ||
            normalizeSourceDomain(resource.sourceDomain) === options.sourceDomain),
      )
    : selectableResources.slice(0, options.limit);
  const plannedGenerationCount = selectedResources.filter((resource) => {
    const draftsForResource =
      existingDraftsByResourceId.get(resource.resourceId) ?? [];

    return !getBlockingExistingDraft(draftsForResource, options);
  }).length;
  const runLogs = [];
  const previousLogs = await readJsonArray(autoFixLogPath, {
    optional: true,
  });

  console.log(`全站 needs_enrichment 总数：${needsEnrichmentResources.length}`);
  console.log(`来源域名筛选：${options.sourceDomain || "未指定"}`);
  console.log(`sourceDomain 筛选后待补全资料数量：${candidateResources.length}`);
  console.log(`已有未拒绝 AI 草稿数量：${resourcesWithNonRejectedDrafts.size}`);
  console.log(`因已有草稿跳过数量：${resourcesSkippedByExistingDraft.size}`);
  console.log(
    `符合 auto-safe 预筛选的低风险资料数量：${autoSafeCandidateResources.length}`,
  );
  console.log(`本次实际待生成数量：${plannedGenerationCount}`);
  console.log(`指定 resourceId：${options.resourceId || "未指定"}`);
  console.log(`本次 limit：${options.limit}`);
  console.log(`AI 请求超时：${options.aiTimeout} 秒`);
  console.log(`是否启用自动安全模式：${options.autoSafe ? "是" : "否"}`);
  console.log(
    `是否启用全量发布模式：${options.publishAll ? "是" : "否"}`,
  );
  console.log(
    `是否允许覆盖已有 pending 草稿：${
      options.includeExistingPending ? "是" : "否"
    }`,
  );

  if (options.resourceId && selectedResources.length === 0) {
    console.log(
      `指定资料 ${options.resourceId} 不在 needsEnrichmentResources 中，未处理。`,
    );
  }

  if (selectedResources.length === 0) {
    if (options.autoSafe) {
      console.log("没有符合 auto-safe 规则的低风险资料，剩余资料需要人工审核。");
    } else {
      console.log("本次没有需要处理的资料。");
    }
  }

  for (const resource of selectedResources) {
    const startedAt = new Date().toISOString();
    const draftsForResource =
      existingDraftsByResourceId.get(resource.resourceId) ?? [];
    const blockingDraft = getBlockingExistingDraft(draftsForResource, options);

    console.log(`当前处理 resourceId：${resource.resourceId}`);
    console.log(`标题：${resource.title || "未记录"}`);
    console.log(`是否已有 AI 草稿：${hasAnyExistingDraft(draftsForResource) ? "是" : "否"}`);

    if (blockingDraft && !options.publishAll) {
      const reason = `已有 reviewStatus=${getDraftReviewStatus(blockingDraft)} 的 AI 草稿，跳过生成。`;

      console.log(`跳过：${reason}`);
      runLogs.push(
        makeLogEntry({
          resource,
          status: "skipped",
          reason,
          startedAt,
        }),
      );
      continue;
    }

    let result = null;
    let generatedDraft = options.publishAll
      ? getReusableExistingDraft(draftsForResource)
      : null;

    if (generatedDraft) {
      console.log(
        `复用已有 AI 草稿：reviewStatus=${getDraftReviewStatus(generatedDraft)}`,
      );
    } else {
      console.log("是否调用 enrich:generate：是");
      console.log(`传递给 enrich:generate 的 AI 超时：${options.aiTimeout} 秒`);
      result = await runEnrichmentGenerate(resource.resourceId, options);
    }

    if (generatedDraft || result?.ok) {
      if (!generatedDraft) {
        console.log(`成功生成或更新 AI 草稿：${resource.resourceId}`);
      }

      if (!options.autoSafe) {
        if (!options.publishAll) {
          runLogs.push(
            makeLogEntry({
              resource,
              status: "generated_pending",
              reason: "已生成 AI enrichment 草稿，等待人工审核。",
              startedAt,
            }),
          );
          continue;
        }
      }

      try {
        generatedDraft =
          generatedDraft ?? (await readDraftForResource(resource.resourceId));
      } catch (error) {
        const failureReason = `读取生成后的 AI 草稿失败：${getErrorMessage(error)}`;

        console.log(`失败：${failureReason}`);
        runLogs.push(
          makeLogEntry({
            resource,
            status: "failed",
            failureReason,
            startedAt,
          }),
        );
        continue;
      }

      if (options.publishAll) {
        const completeness = assessPublishAllCompleteness(generatedDraft);

        console.log(
          `全量发布完整性判断：${
            completeness.isComplete ? "可发布" : "不完整，保留人工处理"
          }`,
        );

        if (!completeness.isComplete) {
          console.log(`不完整原因：${completeness.completenessIssues.join("；")}`);
          runLogs.push(
            makeLogEntry({
              resource,
              status: "generated_pending",
              reason: "已生成 AI enrichment 草稿，但内容不完整，暂未自动发布。",
              isSafe: false,
              safetyReasons: completeness.completenessIssues,
              startedAt,
            }),
          );
          continue;
        }

        try {
          await updateDraftStatus(resource.resourceId, "accepted", {
            publishAll: true,
            publishAllAcceptedAt: new Date().toISOString(),
            publishAllReason:
              "管理员选择全量先发布模式，AI 输出字段完整，已自动接受。",
          });
          console.log("全量发布模式：自动接受草稿成功");
        } catch (error) {
          const failureReason = `全量发布模式自动接受草稿失败：${getErrorMessage(
            error,
          )}`;

          console.log(`失败：${failureReason}`);
          runLogs.push(
            makeLogEntry({
              resource,
              status: "failed",
              failureReason,
              startedAt,
            }),
          );
          continue;
        }

        console.log("全量发布模式：正在应用草稿到前台……");
        const applyResult = await runEnrichmentApply(resource.resourceId);

        if (applyResult.ok) {
          console.log(`全量发布模式：应用成功 ${resource.resourceId}`);
          runLogs.push(
            makeLogEntry({
              resource,
              action: "publish_all_enrichment_draft",
              status: "auto_applied",
              reason: "已按全量发布模式自动应用到前台。",
              isSafe: true,
              safetyReasons: [],
              startedAt,
            }),
          );
        } else {
          const failureReason =
            applyResult.errorMessage || "enrich:apply 执行失败。";

          console.log(`失败：${failureReason}`);
          runLogs.push(
            makeLogEntry({
              resource,
              status: "failed",
              failureReason,
              startedAt,
            }),
          );
        }

        continue;
      }

      const safety = assessAutoSafe(resource, generatedDraft, riskSets);

      console.log(`自动安全判断：${safety.isSafe ? "安全" : "需人工审核"}`);

      if (safety.safetyReasons.length > 0) {
        console.log(`安全判断原因：${safety.safetyReasons.join("；")}`);
      }

      if (!safety.isSafe) {
        const status = isNeedsHumanReviewStatus(resource, riskSets)
          ? "needs_human_review"
          : "skipped_high_risk";

        runLogs.push(
          makeLogEntry({
            resource,
            status,
            reason: "已生成草稿，但未通过自动安全判断，保留人工审核。",
            isSafe: false,
            safetyReasons: safety.safetyReasons,
            startedAt,
          }),
        );
        continue;
      }

      try {
        await updateDraftStatus(resource.resourceId, "accepted", {
          autoSafe: true,
          autoSafeAcceptedAt: new Date().toISOString(),
          autoSafeReasons: ["低风险资料且 AI 输出完整。"],
        });
        console.log("自动接受草稿：成功");
        runLogs.push(
          makeLogEntry({
            resource,
            action: "auto_accept_enrichment_draft",
            status: "auto_accepted",
            reason: "低风险资料且 AI 输出完整，已自动标记 accepted。",
            isSafe: true,
            safetyReasons: [],
            startedAt,
          }),
        );
      } catch (error) {
        const failureReason = `自动接受草稿失败：${getErrorMessage(error)}`;

        console.log(`失败：${failureReason}`);
        runLogs.push(
          makeLogEntry({
            resource,
            status: "failed",
            isSafe: true,
            failureReason,
            startedAt,
          }),
        );
        continue;
      }

      console.log("正在自动应用 accepted 草稿……");
      const applyResult = await runEnrichmentApply(resource.resourceId);

      if (applyResult.ok) {
        console.log(`自动应用成功：${resource.resourceId}`);
        runLogs.push(
          makeLogEntry({
            resource,
            action: "apply_enrichment_draft",
            status: "auto_applied",
            reason: "低风险资料已自动应用到 resourceEnrichments.ts。",
            isSafe: true,
            safetyReasons: [],
            startedAt,
          }),
        );
      } else {
        const failureReason =
          applyResult.errorMessage || "enrich:apply 执行失败。";

        console.log(`失败：${failureReason}`);
        runLogs.push(
          makeLogEntry({
            resource,
            status: "failed",
            isSafe: true,
            failureReason,
            startedAt,
          }),
        );
      }
    } else {
      const reason = result?.errorMessage || "enrich:generate 执行失败。";

      console.log(`失败：${reason}`);
      runLogs.push(
        makeLogEntry({
          resource,
          status: "failed",
          reason,
          startedAt,
        }),
      );
    }
  }

  await writeJson(autoFixLogPath, [...previousLogs, ...runLogs]);

  const generatedPendingCount = runLogs.filter(
    (entry) => entry.status === "generated_pending",
  ).length;
  const autoAcceptedCount = runLogs.filter(
    (entry) => entry.status === "auto_accepted",
  ).length;
  const autoAppliedCount = runLogs.filter(
    (entry) => entry.status === "auto_applied",
  ).length;
  const highRiskSkippedCount = runLogs.filter(
    (entry) => entry.status === "skipped_high_risk",
  ).length;
  const needsHumanReviewCount = runLogs.filter(
    (entry) => entry.status === "needs_human_review",
  ).length;
  const skippedCount = runLogs.filter((entry) => entry.status === "skipped").length;
  const realFailedCount = runLogs.filter((entry) => entry.status === "failed").length;
  const generatedResourceIds = new Set(
    runLogs
      .filter((entry) =>
        [
          "generated_pending",
          "skipped_high_risk",
          "needs_human_review",
          "auto_accepted",
          "auto_applied",
        ].includes(entry.status),
      )
      .map((entry) => entry.resourceId),
  );
  const generatedCount = generatedResourceIds.size;
  const remainingWithoutDraftCount = Math.max(
    0,
    candidateResources.length - generatedCount,
  );
  const highRiskReasonCounts = new Map();

  for (const entry of runLogs) {
    if (
      entry.status !== "skipped_high_risk" &&
      entry.status !== "needs_human_review"
    ) {
      continue;
    }

    for (const reason of entry.safetyReasons ?? []) {
      highRiskReasonCounts.set(reason, (highRiskReasonCounts.get(reason) ?? 0) + 1);
    }
  }

  console.log(`本次处理数量：${selectedResources.length}`);
  console.log(`成功生成草稿数量：${generatedCount}`);
  console.log(`自动接受数量：${autoAcceptedCount}`);
  console.log(`自动应用数量：${autoAppliedCount}`);
  console.log(
    `保留人工审核数量：${
      generatedPendingCount + highRiskSkippedCount + needsHumanReviewCount
    }`,
  );
  console.log(`高风险跳过数量：${highRiskSkippedCount}`);
  console.log(`需人工复核数量：${needsHumanReviewCount}`);
  console.log(`真实失败数量：${realFailedCount}`);

  if (highRiskReasonCounts.size > 0) {
    console.log("高风险跳过原因统计：");

    for (const [reason, count] of highRiskReasonCounts.entries()) {
      console.log(`- ${reason}：${count}`);
    }
  }

  console.log(
    `当前筛选范围内剩余待生成草稿数量：${remainingWithoutDraftCount}`,
  );
  console.log(`跳过数量：${skippedCount}`);
  console.log(`日志写入路径：${autoFixLogPath}`);

  if (realFailedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Resource Quality Auto Fix 运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
