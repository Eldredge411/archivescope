import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const acceptedResourcesPath = path.join(
  projectRoot,
  "src/data/imports/us/acceptedResources.json",
);
const snapshotFilesPath = path.join(
  projectRoot,
  "src/data/imports/us/resourceSnapshotFiles.json",
);
const snapshotFailuresPath = path.join(
  projectRoot,
  "src/data/imports/us/snapshotFailures.json",
);
const publicRoot = path.join(projectRoot, "public");
const snapshotPublicRoot = path.join(projectRoot, "public/snapshots/us");

const defaultLimit = 3;
const fallbackMinimumSnapshotFileSize = 50_000;
const minimumSnapshotFileSizeByType = {
  pdf: 50_000,
  screenshot: 50_000,
};
const minimumBodyTextLength = 120;
const viewport = {
  width: 1440,
  height: 1200,
};
const navigationTimeoutMs = 30_000;
const snapshotNotes =
  "由 Playwright 自动生成，仅用于资料来源核验、学术研究和防止链接失效。正式引用请以官方原始链接为准。";
const invalidPageIndicators = [
  "404",
  "Not Found",
  "Page not found",
  "We're unable to find the requested page",
  "Access Denied",
  "Forbidden",
  "unblock",
  "Verification",
  "Request was unsuccessful",
];

class SnapshotCaptureError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SnapshotCaptureError";
    this.reason = details.reason || "snapshot_capture_failed";
    this.httpStatus = details.httpStatus ?? null;
    this.pageTitle = details.pageTitle || "";
    this.errorMessage = details.errorMessage || message;
  }
}

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const limitIndex = argv.indexOf("--limit");
  const sourceDomainIndex = argv.indexOf("--sourceDomain");
  const resourceIdIndex = argv.indexOf("--resourceId");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const sourceDomainArg = argv.find((arg) => arg.startsWith("--sourceDomain="));
  const resourceIdArg = argv.find((arg) => arg.startsWith("--resourceId="));
  const rawLimit =
    limitArg?.slice("--limit=".length) ??
    (limitIndex >= 0 ? argv[limitIndex + 1] : "");
  const rawSourceDomain =
    sourceDomainArg?.slice("--sourceDomain=".length) ??
    (sourceDomainIndex >= 0 ? argv[sourceDomainIndex + 1] : "");
  const rawResourceId =
    resourceIdArg?.slice("--resourceId=".length) ??
    (resourceIdIndex >= 0 ? argv[resourceIdIndex + 1] : "");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : defaultLimit;

  return {
    limit:
      Number.isNaN(parsedLimit) || parsedLimit < 1 ? defaultLimit : parsedLimit,
    force: argv.includes("--force"),
    includeFederalRegister: argv.includes("--includeFederalRegister"),
    sourceDomain: String(rawSourceDomain || "").trim().toLowerCase(),
    resourceId: String(rawResourceId || "").trim(),
  };
}

async function readJsonArray(filePath, options = {}) {
  const { optional = false } = options;

  try {
    const content = await readFile(filePath, "utf8");
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error("文件内容不是 JSON 数组。");
    }

    return data;
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return [];
    }

    throw new Error(`${filePath} 读取失败：${error.message}`);
  }
}

function normalizeSourceDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function sourcePriority(resource) {
  const sourceDomain = normalizeSourceDomain(resource?.sourceDomain);

  if (sourceDomain === "archives.gov") {
    return 0;
  }

  if (sourceDomain === "federalregister.gov") {
    return 1;
  }

  return 2;
}

function isFederalRegisterResource(resource) {
  return normalizeSourceDomain(resource?.sourceDomain) === "federalregister.gov";
}

function shouldIncludeFederalRegister(options) {
  return Boolean(
    options.includeFederalRegister || options.force || options.resourceId,
  );
}

function logFederalRegisterSkip(skippedCount) {
  if (skippedCount < 1) {
    return;
  }

  console.log(
    "Federal Register 建议通过官方 API / PDF 获取资料，默认跳过 Playwright 快照以避免触发访问验证。",
  );
  console.log(`默认跳过 Federal Register 资料数量：${skippedCount}`);
  console.log(
    "后续如生成 officialFiles，建议优先使用 Federal Register API 返回的 html_url / pdf_url。",
  );
  console.log(
    "如确需截图，请显式传入 --includeFederalRegister、--force，或使用 --resourceId 指定单条 Federal Register 资料。",
  );
}

function resolvePublicFilePath(fileUrl) {
  const relativePath = String(fileUrl || "").replace(/^\/+/, "");
  const resolvedPath = path.resolve(publicRoot, relativePath);
  const relativeToPublicRoot = path.relative(publicRoot, resolvedPath);

  if (
    relativeToPublicRoot.startsWith("..") ||
    path.isAbsolute(relativeToPublicRoot)
  ) {
    return "";
  }

  return resolvedPath;
}

async function isUsableSnapshotFile(file) {
  if (file?.fileType !== "pdf" && file?.fileType !== "screenshot") {
    return false;
  }

  if (file.captureStatus && file.captureStatus !== "success") {
    return false;
  }

  const filePath = resolvePublicFilePath(file.fileUrl);

  if (!filePath) {
    return false;
  }

  try {
    const fileStat = await stat(filePath);
    const minimumFileSize =
      minimumSnapshotFileSizeByType[file.fileType] ??
      fallbackMinimumSnapshotFileSize;

    return fileStat.size >= minimumFileSize;
  } catch {
    return false;
  }
}

function resolveSnapshotSourceUrl(resource) {
  const sourceUrl = String(resource?.sourceUrl || "").trim();

  try {
    const url = new URL(sourceUrl);
    const hostname = normalizeSourceDomain(url.hostname);
    const pathname = url.pathname.replace(/\/+$/, "");

    if (hostname === "archives.gov" && pathname === "/research/catalog") {
      return "https://catalog.archives.gov";
    }
  } catch {
    return sourceUrl;
  }

  return sourceUrl;
}

async function getUsableSnapshotTypes(existingSnapshotFiles, resourceId) {
  const resourceSnapshotFiles = existingSnapshotFiles.filter(
    (file) => file?.resourceId === resourceId,
  );
  const usableSnapshotTypes = new Set();

  for (const file of resourceSnapshotFiles) {
    if (await isUsableSnapshotFile(file)) {
      usableSnapshotTypes.add(file.fileType);
    }
  }

  return usableSnapshotTypes;
}

async function hasCompleteUsableSnapshot(existingSnapshotFiles, resourceId) {
  const usableSnapshotTypes = await getUsableSnapshotTypes(
    existingSnapshotFiles,
    resourceId,
  );

  return usableSnapshotTypes.has("pdf") && usableSnapshotTypes.has("screenshot");
}

function hasSnapshotMetadata(existingSnapshotFiles, resourceId) {
  return existingSnapshotFiles.some(
    (file) =>
      file?.resourceId === resourceId &&
      (file.fileType === "pdf" || file.fileType === "screenshot"),
  );
}

async function selectResources(resources, existingSnapshotFiles, options) {
  const includeFederalRegister = shouldIncludeFederalRegister(options);

  if (options.resourceId) {
    const resource = resources.find((item) => item?.id === options.resourceId);

    if (!resource) {
      console.log(`未找到 resourceId：${options.resourceId}`);
      return [];
    }

    if (!options.force && hasSnapshotMetadata(existingSnapshotFiles, resource.id)) {
      console.log(
        `resourceId ${resource.id} 已有快照记录。如需重新生成，请增加 --force。`,
      );
      return [];
    }

    return [resource];
  }

  let skippedFederalRegisterCount = 0;
  const eligibleResources = resources
    .filter((resource) => {
      if (!resource?.id || !resource?.sourceUrl) {
        return false;
      }

      if (options.sourceDomain) {
        if (normalizeSourceDomain(resource.sourceDomain) !== options.sourceDomain) {
          return false;
        }
      }

      if (isFederalRegisterResource(resource) && !includeFederalRegister) {
        skippedFederalRegisterCount += 1;
        return false;
      }

      return true;
    })
    .sort((resourceA, resourceB) => {
      const priorityDelta = sourcePriority(resourceA) - sourcePriority(resourceB);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return String(resourceA.id).localeCompare(String(resourceB.id));
    });

  logFederalRegisterSkip(skippedFederalRegisterCount);

  const selectedResources = [];

  for (const resource of eligibleResources) {
    if (
      options.force ||
      !(await hasCompleteUsableSnapshot(existingSnapshotFiles, resource.id))
    ) {
      selectedResources.push(resource);
    }

    if (selectedResources.length >= options.limit) {
      break;
    }
  }

  return selectedResources;
}

function safePathSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function hashFile(filePath) {
  const fileBuffer = await readFile(filePath);

  return createHash("sha256").update(fileBuffer).digest("hex");
}

async function getFileMetadata(filePath) {
  const fileStat = await stat(filePath);

  return {
    fileSize: fileStat.size,
    checksum: await hashFile(filePath),
  };
}

function copyrightStatusFor(resource) {
  const sourceDomain = normalizeSourceDomain(resource?.sourceDomain);

  if (sourceDomain === "federalregister.gov") {
    return "public_domain";
  }

  if (sourceDomain === "archives.gov") {
    return "unknown";
  }

  return "unknown";
}

function buildSnapshotMetadata(resource, details) {
  const title = resource.titleZh || resource.titleEn || resource.id;
  const capturedAt = details.capturedAt;
  const metadata = [];

  if (details.pdfFileSize !== undefined && details.pdfChecksum) {
    metadata.push({
      id: `snapshot-${resource.id}-${details.date}-pdf`,
      resourceId: resource.id,
      versionId: "",
      fileType: "pdf",
      fileName: details.pdfFileName,
      fileUrl: details.pdfFileUrl,
      originalUrl: details.snapshotSourceUrl || resource.sourceUrl,
      capturedAt,
      uploadedAt: capturedAt,
      visibility: "public",
      description: `来源页面 PDF 快照：${title}`,
      fileSize: details.pdfFileSize,
      mimeType: "application/pdf",
      checksum: details.pdfChecksum,
      copyrightStatus: copyrightStatusFor(resource),
      captureStatus: "success",
      sourceHttpStatus: details.sourceHttpStatus,
      pageTitle: details.pageTitle,
      validatedAt: details.validatedAt,
      notes: snapshotNotes,
    });
  }

  if (
    details.screenshotFileSize !== undefined &&
    details.screenshotChecksum
  ) {
    metadata.push({
      id: `snapshot-${resource.id}-${details.date}-screenshot`,
      resourceId: resource.id,
      versionId: "",
      fileType: "screenshot",
      fileName: details.screenshotFileName,
      fileUrl: details.screenshotFileUrl,
      originalUrl: details.snapshotSourceUrl || resource.sourceUrl,
      capturedAt,
      uploadedAt: capturedAt,
      visibility: "public",
      description: `来源页面截图快照：${title}`,
      fileSize: details.screenshotFileSize,
      mimeType: "image/png",
      checksum: details.screenshotChecksum,
      copyrightStatus: copyrightStatusFor(resource),
      captureStatus: "success",
      sourceHttpStatus: details.sourceHttpStatus,
      pageTitle: details.pageTitle,
      validatedAt: details.validatedAt,
      notes: snapshotNotes,
    });
  }

  return metadata;
}

async function loadPlaywrightChromium() {
  try {
    const playwright = await import("playwright");

    return playwright.chromium;
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        "当前项目尚未安装 Playwright。请先运行 npm install，然后如有需要运行 npx playwright install chromium。",
      );
    }

    throw error;
  }
}

async function navigateWithFallback(page, sourceUrl) {
  try {
    return await page.goto(sourceUrl, {
      waitUntil: "networkidle",
      timeout: navigationTimeoutMs,
    });
  } catch (networkIdleError) {
    console.warn(
      `networkidle 等待超时或失败，改用 domcontentloaded：${networkIdleError.message}`,
    );
    return page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: navigationTimeoutMs,
    });
  }
}

async function getPageBodyText(page) {
  try {
    return await page.locator("body").innerText({ timeout: 5000 });
  } catch {
    return "";
  }
}

function findInvalidPageIndicator(pageTitle, bodyText) {
  const haystack = `${pageTitle}\n${bodyText}`.toLowerCase();

  return invalidPageIndicators.find((indicator) =>
    haystack.includes(indicator.toLowerCase()),
  );
}

async function inspectLoadedPage(page, response) {
  const httpStatus = response?.status() ?? null;
  const pageTitle = await page.title().catch(() => "");
  const bodyText = await getPageBodyText(page);
  const normalizedBodyText = bodyText.replace(/\s+/g, " ").trim();

  if (typeof httpStatus === "number" && httpStatus >= 400) {
    throw new SnapshotCaptureError(`页面返回 HTTP ${httpStatus}，已跳过。`, {
      reason: `http_status_${httpStatus}`,
      httpStatus,
      pageTitle,
    });
  }

  const invalidIndicator = findInvalidPageIndicator(pageTitle, bodyText);

  if (invalidIndicator) {
    throw new SnapshotCaptureError(
      `页面疑似无效，包含提示文本：${invalidIndicator}`,
      {
        reason: `invalid_page_indicator_${invalidIndicator
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")}`,
        httpStatus,
        pageTitle,
      },
    );
  }

  if (normalizedBodyText.length < minimumBodyTextLength) {
    throw new SnapshotCaptureError(
      `页面正文过短（${normalizedBodyText.length} 字符），疑似空白页或错误页，已跳过。`,
      {
        reason: "page_body_too_short",
        httpStatus,
        pageTitle,
      },
    );
  }

  return {
    httpStatus,
    pageTitle,
  };
}

async function assertGeneratedFile(filePath, label) {
  try {
    const fileStat = await stat(filePath);
    const normalizedLabel = String(label).toLowerCase();
    const minimumFileSize =
      minimumSnapshotFileSizeByType[normalizedLabel] ??
      fallbackMinimumSnapshotFileSize;

    if (fileStat.size < minimumFileSize) {
      throw new SnapshotCaptureError(
        `${label} 文件小于 ${minimumFileSize} 字节，疑似无效。`,
        {
          reason: `${normalizedLabel}_file_too_small`,
        },
      );
    }
  } catch (error) {
    if (error instanceof SnapshotCaptureError) {
      throw error;
    }

    throw new SnapshotCaptureError(`${label} 文件不存在或无法读取。`, {
      reason: `${label.toLowerCase()}_file_missing`,
      errorMessage: error.message,
    });
  }
}

function withPageContext(error, pageInspection, fallbackReason) {
  if (error instanceof SnapshotCaptureError) {
    return new SnapshotCaptureError(error.message, {
      reason: error.reason,
      httpStatus: error.httpStatus ?? pageInspection.httpStatus,
      pageTitle: error.pageTitle || pageInspection.pageTitle,
      errorMessage: error.errorMessage,
    });
  }

  return new SnapshotCaptureError(error?.message || String(error), {
    reason: fallbackReason,
    httpStatus: pageInspection.httpStatus,
    pageTitle: pageInspection.pageTitle,
    errorMessage: error?.message || String(error),
  });
}

async function generateSnapshotForResource(browser, resource) {
  const date = formatDate();
  const snapshotSourceUrl = resolveSnapshotSourceUrl(resource);
  const safeResourceId = safePathSegment(resource.id);
  const outputDirectory = path.join(snapshotPublicRoot, safeResourceId);
  const pdfFileName = `${safeResourceId}-${date}.pdf`;
  const screenshotFileName = `${safeResourceId}-${date}.png`;
  const pdfPath = path.join(outputDirectory, pdfFileName);
  const screenshotPath = path.join(outputDirectory, screenshotFileName);
  const pdfFileUrl = `/snapshots/us/${safeResourceId}/${pdfFileName}`;
  const screenshotFileUrl = `/snapshots/us/${safeResourceId}/${screenshotFileName}`;
  const capturedAt = new Date().toISOString();
  const validatedAt = new Date().toISOString();
  const snapshotFailures = [];
  let pdfMetadata = null;
  let screenshotMetadata = null;

  await mkdir(outputDirectory, { recursive: true });

  const page = await browser.newPage({ viewport });
  let pageInspection = {
    httpStatus: null,
    pageTitle: "",
  };

  try {
    page.setDefaultTimeout(navigationTimeoutMs);
    page.setDefaultNavigationTimeout(navigationTimeoutMs);

    const response = await navigateWithFallback(page, snapshotSourceUrl);
    pageInspection = await inspectLoadedPage(page, response);

    await page.emulateMedia({ media: "screen" });

    try {
      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        timeout: navigationTimeoutMs,
      });
      await assertGeneratedFile(pdfPath, "pdf");
      pdfMetadata = await getFileMetadata(pdfPath);
      console.log(`PDF 保存路径：${pdfPath}`);
    } catch (error) {
      snapshotFailures.push(
        withPageContext(error, pageInspection, "pdf_snapshot_failed"),
      );
      console.error(`PDF 生成失败：${error.message}`);
    }

    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        timeout: navigationTimeoutMs,
      });
      await assertGeneratedFile(screenshotPath, "screenshot");
      screenshotMetadata = await getFileMetadata(screenshotPath);
      console.log(`截图保存路径：${screenshotPath}`);
    } catch (error) {
      snapshotFailures.push(
        withPageContext(error, pageInspection, "screenshot_snapshot_failed"),
      );
      console.error(`截图生成失败：${error.message}`);
    }
  } finally {
    await page.close();
  }

  const snapshotFiles = buildSnapshotMetadata(resource, {
    date,
    capturedAt,
    pdfFileName,
    pdfFileUrl,
    pdfFileSize: pdfMetadata?.fileSize,
    pdfChecksum: pdfMetadata?.checksum,
    screenshotFileName,
    screenshotFileUrl,
    screenshotFileSize: screenshotMetadata?.fileSize,
    screenshotChecksum: screenshotMetadata?.checksum,
    sourceHttpStatus: pageInspection.httpStatus,
    pageTitle: pageInspection.pageTitle,
    validatedAt,
    snapshotSourceUrl,
  });

  return {
    snapshotFiles,
    snapshotFailures,
  };
}

function mergeSnapshotFiles(
  existingSnapshotFiles,
  newSnapshotFiles,
  options,
  replacedResourceIds = new Set(),
) {
  const byId = new Map();
  const existingFilesToKeep = options.force
    ? existingSnapshotFiles.filter(
        (file) => !replacedResourceIds.has(file?.resourceId),
      )
    : existingSnapshotFiles;

  for (const file of [...existingFilesToKeep, ...newSnapshotFiles]) {
    if (file?.id && !byId.has(file.id)) {
      byId.set(file.id, file);
    }
  }

  return [...byId.values()];
}

function buildFailureRecord(resource, error) {
  return {
    resourceId: resource.id,
    sourceUrl: resource.sourceUrl,
    sourceDomain: resource.sourceDomain || "",
    attemptedAt: new Date().toISOString(),
    reason: error?.reason || "snapshot_generation_failed",
    httpStatus: error?.httpStatus ?? null,
    pageTitle: error?.pageTitle || "",
    errorMessage: error?.errorMessage || error?.message || String(error),
  };
}

function failureRecordKey(failure) {
  return [failure.resourceId, failure.sourceUrl, failure.reason].join("::");
}

function mergeSnapshotFailures(existingFailures, newFailures) {
  const byKey = new Map();

  for (const failure of existingFailures) {
    if (failure?.resourceId && failure?.sourceUrl && failure?.reason) {
      byKey.set(failureRecordKey(failure), failure);
    }
  }

  for (const failure of newFailures) {
    if (failure?.resourceId && failure?.sourceUrl && failure?.reason) {
      byKey.set(failureRecordKey(failure), failure);
    }
  }

  return [...byKey.values()].sort((failureA, failureB) =>
    String(failureB.attemptedAt || "").localeCompare(
      String(failureA.attemptedAt || ""),
    ),
  );
}

async function writeJsonArray(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log("正在读取 acceptedResources.json……");
  const acceptedResources = await readJsonArray(acceptedResourcesPath);
  console.log(`acceptedResources 总数：${acceptedResources.length}`);

  console.log("正在读取已有 resourceSnapshotFiles.json……");
  const existingSnapshotFiles = await readJsonArray(snapshotFilesPath, {
    optional: true,
  });
  console.log(`已有快照记录数量：${existingSnapshotFiles.length}`);

  console.log("正在读取已有 snapshotFailures.json……");
  const existingSnapshotFailures = await readJsonArray(snapshotFailuresPath, {
    optional: true,
  });
  console.log(`已有失败记录数量：${existingSnapshotFailures.length}`);

  const resourcesToProcess = await selectResources(
    acceptedResources,
    existingSnapshotFiles,
    options,
  );

  console.log(`本次待处理数量：${resourcesToProcess.length}`);

  if (options.sourceDomain) {
    console.log(`来源域名筛选：${options.sourceDomain}`);
  }

  if (options.force) {
    console.log("已启用 --force，将重新生成匹配资料的快照。");
  }

  if (options.includeFederalRegister) {
    console.log(
      "已启用 --includeFederalRegister，将允许处理 Federal Register 资料。",
    );
  }

  if (resourcesToProcess.length === 0) {
    console.log("没有需要生成快照的资料。");
    return;
  }

  const processedResourceIds = new Set(
    resourcesToProcess.map((resource) => resource.id),
  );
  const chromium = await loadPlaywrightChromium();
  let browser;
  const newSnapshotFiles = [];
  const newSnapshotFailures = [];

  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    throw new Error(
      `Chromium 启动失败：${error.message}\n如果尚未安装浏览器内核，请运行 npx playwright install chromium 后重试；如果已经安装，可能是当前运行环境限制了 Playwright 启动 Chromium，请在普通终端中运行本命令。`,
    );
  }

  try {
    for (const resource of resourcesToProcess) {
      console.log(`\n当前处理 resourceId：${resource.id}`);
      console.log(`sourceUrl：${resource.sourceUrl}`);
      const snapshotSourceUrl = resolveSnapshotSourceUrl(resource);

      if (snapshotSourceUrl !== resource.sourceUrl) {
        console.log(`快照采集 URL：${snapshotSourceUrl}`);
      }

      try {
        const { snapshotFiles, snapshotFailures } =
          await generateSnapshotForResource(browser, resource);

        newSnapshotFiles.push(...snapshotFiles);
        newSnapshotFailures.push(
          ...snapshotFailures.map((failure) => buildFailureRecord(resource, failure)),
        );

        if (snapshotFiles.length > 0 && snapshotFailures.length === 0) {
          console.log("是否成功：是");
        } else if (snapshotFiles.length > 0) {
          console.log("是否成功：部分成功");
        } else {
          console.log("是否成功：否");
        }
      } catch (error) {
        newSnapshotFailures.push(buildFailureRecord(resource, error));
        console.error("是否成功：否");
        console.error(`失败原因：${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (newSnapshotFailures.length > 0) {
    const mergedSnapshotFailures = mergeSnapshotFailures(
      existingSnapshotFailures,
      newSnapshotFailures,
    );

    await writeJsonArray(snapshotFailuresPath, mergedSnapshotFailures);
    console.log(`本次新增失败记录数量：${newSnapshotFailures.length}`);
    console.log(`已写入失败记录：${snapshotFailuresPath}`);
  }

  if (newSnapshotFiles.length === 0 && !options.force) {
    console.log("本次没有成功生成新的快照记录，未写入 resourceSnapshotFiles.json。");
    return;
  }

  const mergedSnapshotFiles = mergeSnapshotFiles(
    existingSnapshotFiles,
    newSnapshotFiles,
    options,
    processedResourceIds,
  );

  await writeJsonArray(snapshotFilesPath, mergedSnapshotFiles);

  console.log(`\n新生成快照记录数量：${newSnapshotFiles.length}`);
  console.log(
    `最终写入 resourceSnapshotFiles.json 的记录数量：${mergedSnapshotFiles.length}`,
  );
  console.log(`写入路径：${snapshotFilesPath}`);
}

main().catch((error) => {
  console.error("来源快照生成脚本执行失败。");
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
