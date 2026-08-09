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
const usStatesPath = path.join(projectRoot, "src/data/constants/usStates.ts");
const reportPath = path.join(
  projectRoot,
  "src/data/imports/us/institutionAuditReport.json",
);

const institutionGroups = [
  "federal",
  "state",
  "social",
  "academic",
  "commercial",
  "other",
];

const institutionTypes = [
  "archives",
  "library",
  "museum",
  "association",
  "government",
  "research",
  "company",
  "nonprofit",
  "other",
];

const requiredFields = [
  "id",
  "slug",
  "nameZh",
  "nameEn",
  "countryId",
  "institutionGroup",
  "institutionType",
  "website",
];

const requiredStateFields = ["stateCode", "stateName", "stateNameZh"];

const defaultUsStateCodes = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase();
}

function getWebsite(institution) {
  return normalizeString(
    institution.website || institution.officialUrl || institution.sourceUrl,
  );
}

function getInstitutionTypeCode(institution) {
  const rawTypeCode = normalizeString(institution.institutionTypeCode);
  const rawType = normalizeString(institution.institutionType);

  if (institutionTypes.includes(rawTypeCode)) {
    return rawTypeCode;
  }

  if (institutionTypes.includes(rawType)) {
    return rawType;
  }

  return "other";
}

function createCountMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

async function readJsonArray(filePath) {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw new Error(
      `${path.relative(projectRoot, filePath)} 读取或解析失败：${error.message}`,
    );
  }
}

async function readUsStateCodes() {
  try {
    const source = await readFile(usStatesPath, "utf8");
    const codes = Array.from(source.matchAll(/code:\s*"([A-Z]{2})"/g)).map(
      (match) => match[1],
    );

    return codes.length ? Array.from(new Set(codes)) : defaultUsStateCodes;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return defaultUsStateCodes;
    }

    throw new Error(
      `${path.relative(projectRoot, usStatesPath)} 读取失败：${error.message}`,
    );
  }
}

function getMissingFields(institutions) {
  return institutions
    .map((institution, index) => {
      const missingFields = requiredFields.filter((field) => {
        if (field === "website") {
          return !getWebsite(institution);
        }

        return !normalizeString(institution[field]);
      });

      if (institution.institutionGroup === "state") {
        missingFields.push(
          ...requiredStateFields.filter((field) => !normalizeString(institution[field])),
        );
      }

      return {
        index,
        id: normalizeString(institution.id),
        nameEn: normalizeString(institution.nameEn),
        missingFields,
      };
    })
    .filter((item) => item.missingFields.length > 0);
}

function findDuplicates(institutions, fieldName, getValue) {
  const valueMap = new Map();

  institutions.forEach((institution, index) => {
    const rawValue = getValue(institution);
    const key = normalizeKey(rawValue);

    if (!key) {
      return;
    }

    const item = {
      index,
      id: normalizeString(institution.id),
      nameEn: normalizeString(institution.nameEn),
      value: rawValue,
    };

    valueMap.set(key, [...(valueMap.get(key) ?? []), item]);
  });

  return Array.from(valueMap.values())
    .filter((items) => items.length > 1)
    .map((items) => ({
      field: fieldName,
      value: items[0].value,
      items,
    }));
}

function buildDuplicates(institutions) {
  return {
    id: findDuplicates(institutions, "id", (institution) =>
      normalizeString(institution.id),
    ),
    slug: findDuplicates(institutions, "slug", (institution) =>
      normalizeString(institution.slug),
    ),
    website: findDuplicates(institutions, "website", getWebsite),
    nameEn: findDuplicates(institutions, "nameEn", (institution) =>
      normalizeString(institution.nameEn),
    ),
  };
}

function countDuplicateGroups(duplicates) {
  return Object.values(duplicates).reduce(
    (total, duplicateGroups) => total + duplicateGroups.length,
    0,
  );
}

function buildStatistics(institutions, usStateCodes) {
  const byGroup = createCountMap(institutionGroups);
  const byType = createCountMap(institutionTypes);

  institutions.forEach((institution) => {
    const group = institutionGroups.includes(institution.institutionGroup)
      ? institution.institutionGroup
      : "other";
    const type = getInstitutionTypeCode(institution);

    byGroup[group] += 1;
    byType[type] += 1;
  });

  const stateInstitutions = institutions.filter(
    (institution) => institution.institutionGroup === "state",
  );
  const stateCounts = Object.fromEntries(usStateCodes.map((code) => [code, 0]));

  stateInstitutions.forEach((institution) => {
    const code = normalizeString(institution.stateCode).toUpperCase();

    if (!code) {
      return;
    }

    stateCounts[code] = (stateCounts[code] ?? 0) + 1;
  });

  const coveredStates = usStateCodes.filter((code) => (stateCounts[code] ?? 0) > 0);
  const missingStates = usStateCodes.filter((code) => (stateCounts[code] ?? 0) === 0);

  return {
    summary: {
      totalInstitutions: institutions.length,
      federal: byGroup.federal,
      state: byGroup.state,
      social: byGroup.social,
      academic: byGroup.academic,
      commercial: byGroup.commercial,
      other: byGroup.other,
    },
    byGroup,
    byType,
    stateCoverage: {
      expectedCount: usStateCodes.length,
      coveredCount: coveredStates.length,
      missingCount: missingStates.length,
      coveredStates,
      missingStates,
      stateCounts,
    },
  };
}

function createAbortSignal(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeout),
  };
}

async function fetchWithTimeout(url, method) {
  const { signal, cancel } = createAbortSignal(15000);

  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal,
      headers: {
        "User-Agent": "ArchiveScopeInstitutionChecker/0.1",
        Accept: method === "HEAD" ? "*/*" : "text/html,application/xhtml+xml,*/*",
      },
    });

    await response.body?.cancel();

    return response;
  } finally {
    cancel();
  }
}

function shouldFallbackToGet(response) {
  return response.status === 403 || response.status === 405;
}

function classifyHttpStatus(response, website) {
  const statusCode = response?.status ?? null;
  const finalUrl = response?.url || website;
  const redirected = Boolean(
    response?.redirected || (finalUrl && finalUrl !== website),
  );

  if (statusCode && statusCode >= 200 && statusCode <= 299) {
    return redirected ? "redirected" : "ok";
  }

  if (statusCode === 403) {
    return "blocked";
  }

  if (statusCode === 404) {
    return "not_found";
  }

  if (statusCode && statusCode >= 500 && statusCode <= 599) {
    return "server_error";
  }

  if ([301, 302, 307, 308].includes(statusCode ?? 0)) {
    return "redirected";
  }

  return "unknown";
}

function classifyRequestError(error) {
  const errorName = normalizeString(error?.name);
  const errorCode = normalizeString(error?.code || error?.cause?.code);
  const errorMessage = normalizeString(error?.message);
  const combined = `${errorName} ${errorCode} ${errorMessage}`.toLowerCase();

  if (
    errorName === "AbortError" ||
    combined.includes("aborted") ||
    combined.includes("timeout")
  ) {
    return "timeout";
  }

  if (
    errorCode ||
    combined.includes("fetch failed") ||
    combined.includes("network") ||
    combined.includes("dns") ||
    combined.includes("tls") ||
    combined.includes("certificate") ||
    combined.includes("connect") ||
    combined.includes("econn") ||
    combined.includes("enotfound") ||
    combined.includes("etimedout")
  ) {
    return "network_error";
  }

  return "unknown";
}

function getErrorMessage(error) {
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    const causeCode = normalizeString(error.cause?.code);

    return causeCode ? `${error.message} (${causeCode})` : error.message;
  }

  return String(error);
}

function needsManualReview(status) {
  return ["blocked", "not_found", "timeout", "network_error", "unknown"].includes(
    status,
  );
}

function buildLinkCheckResult({
  institution,
  website,
  response,
  method,
  checkedAt,
  errorMessage = "",
  errorStatus = "",
}) {
  const finalUrl = response?.url || website;
  const statusCode = response?.status ?? null;
  const status = response
    ? classifyHttpStatus(response, website)
    : errorStatus || "unknown";

  return {
    institutionId: normalizeString(institution.id),
    nameZh: normalizeString(institution.nameZh),
    nameEn: normalizeString(institution.nameEn),
    website,
    method,
    status,
    statusCode,
    finalUrl,
    checkedAt,
    errorMessage,
    needsManualReview: needsManualReview(status),
  };
}

async function checkWebsite(institution, checkedAt) {
  const website = getWebsite(institution);

  if (!website) {
    return buildLinkCheckResult({
      institution,
      website,
      response: null,
      method: "none",
      checkedAt,
      errorMessage: "缺少 website。",
      errorStatus: "unknown",
    });
  }

  try {
    const headResponse = await fetchWithTimeout(website, "HEAD");

    if (shouldFallbackToGet(headResponse)) {
      try {
        const getResponse = await fetchWithTimeout(website, "GET");

        return buildLinkCheckResult({
          institution,
          website,
          response: getResponse,
          method: "GET",
          checkedAt,
        });
      } catch (getError) {
        return buildLinkCheckResult({
          institution,
          website,
          response: headResponse,
          method: "HEAD",
          checkedAt,
          errorMessage: `GET 回退失败：${getErrorMessage(getError)}`,
        });
      }
    }

    return buildLinkCheckResult({
      institution,
      website,
      response: headResponse,
      method: "HEAD",
      checkedAt,
    });
  } catch (headError) {
    try {
      const getResponse = await fetchWithTimeout(website, "GET");

      return buildLinkCheckResult({
        institution,
        website,
        response: getResponse,
        method: "GET",
        checkedAt,
      });
    } catch (getError) {
      return buildLinkCheckResult({
        institution,
        website,
        response: null,
        method: "GET",
        checkedAt,
        errorMessage: getErrorMessage(getError || headError),
        errorStatus: classifyRequestError(getError || headError),
      });
    }
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

async function validateInstitutions() {
  const institutions = await readJsonArray(acceptedInstitutionsPath);

  if (institutions === null) {
    console.log("没有 acceptedInstitutions.json 可校验。");
    return;
  }

  const usStateCodes = await readUsStateCodes();
  const generatedAt = new Date().toISOString();
  const statistics = buildStatistics(institutions, usStateCodes);
  const missingFields = getMissingFields(institutions);
  const duplicates = buildDuplicates(institutions);

  console.log("正在检查机构官网链接……");
  const linkChecks = await mapWithConcurrency(
    institutions,
    5,
    async (institution, index) => {
      const result = await checkWebsite(institution, generatedAt);
      console.log(
        `[${index + 1}/${institutions.length}] ${
          result.institutionId || result.nameEn
        }：${result.status}${result.statusCode ? ` ${result.statusCode}` : ""}`,
      );

      return result;
    },
  );

  const linkSummary = {
    total: linkChecks.length,
    ok: linkChecks.filter((check) => check.status === "ok").length,
    redirected: linkChecks.filter((check) => check.status === "redirected")
      .length,
    blocked: linkChecks.filter((check) => check.status === "blocked").length,
    not_found: linkChecks.filter((check) => check.status === "not_found").length,
    timeout: linkChecks.filter((check) => check.status === "timeout").length,
    network_error: linkChecks.filter((check) => check.status === "network_error")
      .length,
    server_error: linkChecks.filter((check) => check.status === "server_error")
      .length,
    unknown: linkChecks.filter((check) => check.status === "unknown").length,
  };
  const manualReviewLinks = linkChecks.filter((check) => check.needsManualReview);

  const report = {
    generatedAt,
    summary: {
      ...statistics.summary,
      missingFieldInstitutionCount: missingFields.length,
      duplicateGroupCount: countDuplicateGroups(duplicates),
      okCount: linkSummary.ok,
      redirectedCount: linkSummary.redirected,
      blockedCount: linkSummary.blocked,
      notFoundCount: linkSummary.not_found,
      timeoutCount: linkSummary.timeout,
      networkErrorCount: linkSummary.network_error,
      serverErrorCount: linkSummary.server_error,
      unknownCount: linkSummary.unknown,
      needsManualReviewCount: manualReviewLinks.length,
    },
    byGroup: statistics.byGroup,
    byType: statistics.byType,
    stateCoverage: statistics.stateCoverage,
    missingFields,
    duplicates,
    linkChecks: {
      summary: linkSummary,
      items: linkChecks,
    },
    manualReviewLinks,
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`机构总数：${institutions.length}`);
  console.log(`州覆盖数量：${statistics.stateCoverage.coveredCount}`);
  console.log(`缺失字段数量：${missingFields.length}`);
  console.log(`重复项数量：${countDuplicateGroups(duplicates)}`);
  console.log(
    `链接检查状态：ok ${linkSummary.ok}，redirected ${linkSummary.redirected}，blocked ${linkSummary.blocked}，not_found ${linkSummary.not_found}，timeout ${linkSummary.timeout}，network_error ${linkSummary.network_error}，server_error ${linkSummary.server_error}，unknown ${linkSummary.unknown}`,
  );
  console.log(`需人工复核链接数量：${manualReviewLinks.length}`);
  console.log(`报告写入路径：${path.relative(projectRoot, reportPath)}`);
}

validateInstitutions().catch((error) => {
  console.error(`机构数据校验失败：${error.message}`);
  process.exitCode = 1;
});
