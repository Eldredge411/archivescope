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
const snapshotAuditReportPath = path.join(
  projectRoot,
  "src/data/imports/us/snapshotAuditReport.json",
);
const publicRoot = path.join(projectRoot, "public");
const fallbackMinimumSnapshotFileSize = 50_000;
const minimumSnapshotFileSizeByType = {
  pdf: 50_000,
  screenshot: 50_000,
};

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
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function getSnapshotStrategy(resource) {
  const sourceDomain = normalizeSourceDomain(resource?.sourceDomain);

  if (sourceDomain === "federalregister.gov") {
    return "official_api_preferred";
  }

  return "playwright_snapshot";
}

function getSnapshotStrategyNote(resource) {
  if (getSnapshotStrategy(resource) === "official_api_preferred") {
    return "Federal Register 资料优先使用官方 API / PDF；默认不通过 Playwright 高频截图，以避免触发官方访问验证。";
  }

  return "";
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

function isSnapshotFile(file) {
  return file?.fileType === "pdf" || file?.fileType === "screenshot";
}

function getMinimumSnapshotFileSize(fileType) {
  return (
    minimumSnapshotFileSizeByType[fileType] ?? fallbackMinimumSnapshotFileSize
  );
}

async function inspectSnapshotFile(file) {
  const expectedPath = resolvePublicFilePath(file?.fileUrl);

  if (!expectedPath) {
    return {
      exists: false,
      expectedPath,
      fileSize: 0,
      error: "fileUrl 无法映射到 public 目录。",
    };
  }

  try {
    const fileStat = await stat(expectedPath);

    return {
      exists: true,
      expectedPath,
      fileSize: fileStat.size,
      error: "",
    };
  } catch (error) {
    return {
      exists: false,
      expectedPath,
      fileSize: 0,
      error: error.message,
    };
  }
}

function buildResourceLookup(resources) {
  return new Map(resources.map((resource) => [resource.id, resource]));
}

function findDuplicateSnapshotIds(snapshotFiles) {
  const idIndexMap = new Map();

  snapshotFiles.forEach((file, index) => {
    if (!file?.id) {
      return;
    }

    const indexes = idIndexMap.get(file.id) ?? [];
    indexes.push(index);
    idIndexMap.set(file.id, indexes);
  });

  return [...idIndexMap.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([id, indexes]) => ({
      id,
      count: indexes.length,
      indexes,
    }));
}

function createDomainStats(resources, snapshotFiles) {
  const domainStats = new Map();
  const resourceLookup = buildResourceLookup(resources);

  for (const resource of resources) {
    const sourceDomain = normalizeSourceDomain(resource.sourceDomain);
    const stats = domainStats.get(sourceDomain) ?? {
      sourceDomain,
      totalResources: 0,
      resourcesWithCompleteSnapshots: 0,
      resourcesWithPartialSnapshots: 0,
      resourcesWithoutSnapshots: 0,
      snapshotMetadataCount: 0,
    };

    stats.totalResources += 1;
    domainStats.set(sourceDomain, stats);
  }

  for (const file of snapshotFiles) {
    const resource = resourceLookup.get(file?.resourceId);
    const sourceDomain = normalizeSourceDomain(resource?.sourceDomain);
    const stats = domainStats.get(sourceDomain) ?? {
      sourceDomain,
      totalResources: 0,
      resourcesWithCompleteSnapshots: 0,
      resourcesWithPartialSnapshots: 0,
      resourcesWithoutSnapshots: 0,
      snapshotMetadataCount: 0,
    };

    stats.snapshotMetadataCount += 1;
    domainStats.set(sourceDomain, stats);
  }

  return domainStats;
}

function getValidFileTypes(resourceId, validSnapshotTypesByResourceId) {
  return [...(validSnapshotTypesByResourceId.get(resourceId) ?? [])].sort();
}

function getMissingFileTypes(validFileTypes) {
  return ["pdf", "screenshot"].filter(
    (fileType) => !validFileTypes.includes(fileType),
  );
}

function buildResourceSnapshotEntry(resource, validSnapshotTypesByResourceId) {
  const availableValidFileTypes = getValidFileTypes(
    resource.id,
    validSnapshotTypesByResourceId,
  );

  return {
    resourceId: resource.id,
    title: resource.titleZh || resource.titleEn || resource.id,
    sourceDomain: normalizeSourceDomain(resource.sourceDomain),
    sourceUrl: resource.sourceUrl || "",
    snapshotStrategy: getSnapshotStrategy(resource),
    snapshotStrategyNote: getSnapshotStrategyNote(resource),
    availableValidFileTypes,
    missingFileTypes: getMissingFileTypes(availableValidFileTypes),
  };
}

async function main() {
  console.log("正在读取 acceptedResources.json……");
  const acceptedResources = await readJsonArray(acceptedResourcesPath);
  console.log(`acceptedResources 总数：${acceptedResources.length}`);

  console.log("正在读取 resourceSnapshotFiles.json……");
  const snapshotFiles = await readJsonArray(snapshotFilesPath, {
    optional: true,
  });
  console.log(`snapshot metadata 总数：${snapshotFiles.length}`);

  const missingFiles = [];
  const suspiciousSmallFiles = [];
  const validSnapshotTypesByResourceId = new Map();
  const domainStats = createDomainStats(acceptedResources, snapshotFiles);

  for (const file of snapshotFiles) {
    const inspection = await inspectSnapshotFile(file);

    if (!inspection.exists) {
      missingFiles.push({
        id: file?.id || "",
        resourceId: file?.resourceId || "",
        fileType: file?.fileType || "",
        fileUrl: file?.fileUrl || "",
        expectedPath: inspection.expectedPath,
        error: inspection.error,
      });
      continue;
    }

    const minimumSnapshotFileSize = getMinimumSnapshotFileSize(file.fileType);

    if (isSnapshotFile(file) && inspection.fileSize < minimumSnapshotFileSize) {
      suspiciousSmallFiles.push({
        id: file?.id || "",
        resourceId: file?.resourceId || "",
        fileType: file?.fileType || "",
        fileUrl: file?.fileUrl || "",
        expectedPath: inspection.expectedPath,
        fileSize: inspection.fileSize,
        minimumExpectedSize: minimumSnapshotFileSize,
      });
      continue;
    }

    if (isSnapshotFile(file) && file?.resourceId) {
      const validTypes =
        validSnapshotTypesByResourceId.get(file.resourceId) ?? new Set();
      validTypes.add(file.fileType);
      validSnapshotTypesByResourceId.set(file.resourceId, validTypes);
    }
  }

  const completeSnapshotResources = [];
  const partialSnapshotResources = [];
  const missingSnapshotResources = [];
  const officialApiPreferredMissingSnapshotResources = [];

  for (const resource of acceptedResources) {
    const availableValidFileTypes = getValidFileTypes(
      resource.id,
      validSnapshotTypesByResourceId,
    );
    const entry = buildResourceSnapshotEntry(
      resource,
      validSnapshotTypesByResourceId,
    );

    if (
      availableValidFileTypes.includes("pdf") &&
      availableValidFileTypes.includes("screenshot")
    ) {
      completeSnapshotResources.push(entry);
    } else if (availableValidFileTypes.length > 0) {
      partialSnapshotResources.push(entry);
    } else {
      missingSnapshotResources.push(entry);

      if (entry.snapshotStrategy === "official_api_preferred") {
        officialApiPreferredMissingSnapshotResources.push(entry);
      }
    }
  }

  for (const resource of acceptedResources) {
    const sourceDomain = normalizeSourceDomain(resource.sourceDomain);
    const stats = domainStats.get(sourceDomain);
    const availableValidFileTypes = getValidFileTypes(
      resource.id,
      validSnapshotTypesByResourceId,
    );

    if (!stats) {
      continue;
    }

    if (
      availableValidFileTypes.includes("pdf") &&
      availableValidFileTypes.includes("screenshot")
    ) {
      stats.resourcesWithCompleteSnapshots += 1;
    } else if (availableValidFileTypes.length > 0) {
      stats.resourcesWithPartialSnapshots += 1;
    } else {
      stats.resourcesWithoutSnapshots += 1;
    }
  }

  const duplicateSnapshotIds = findDuplicateSnapshotIds(snapshotFiles);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      acceptedResourcesTotal: acceptedResources.length,
      snapshotMetadataTotal: snapshotFiles.length,
      resourcesWithCompleteSnapshots: completeSnapshotResources.length,
      resourcesWithPartialSnapshots: partialSnapshotResources.length,
      resourcesWithoutSnapshots: missingSnapshotResources.length,
      resourcesWithoutSnapshotsRequiringCapture:
        missingSnapshotResources.length -
        officialApiPreferredMissingSnapshotResources.length,
      resourcesWithoutSnapshotsOfficialApiPreferred:
        officialApiPreferredMissingSnapshotResources.length,
      missingFileCount: missingFiles.length,
      suspiciousSmallFileCount: suspiciousSmallFiles.length,
      duplicateSnapshotIdCount: duplicateSnapshotIds.length,
    },
    bySourceDomain: [...domainStats.values()].sort((a, b) =>
      a.sourceDomain.localeCompare(b.sourceDomain),
    ),
    completeSnapshotResources,
    partialSnapshotResources,
    missingSnapshotResources,
    officialApiPreferredMissingSnapshotResources,
    missingFiles,
    suspiciousSmallFiles,
    duplicateSnapshotIds,
  };

  await mkdir(path.dirname(snapshotAuditReportPath), { recursive: true });
  await writeFile(
    snapshotAuditReportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `完整快照 resource 数量：${report.summary.resourcesWithCompleteSnapshots}`,
  );
  console.log(
    `部分快照 resource 数量：${report.summary.resourcesWithPartialSnapshots}`,
  );
  console.log(
    `完全没有快照的 resource 数量：${report.summary.resourcesWithoutSnapshots}`,
  );
  console.log(
    `其中采用官方 API / PDF 优先策略的 Federal Register 数量：${report.summary.resourcesWithoutSnapshotsOfficialApiPreferred}`,
  );
  console.log(
    `仍需常规快照补采的 resource 数量：${report.summary.resourcesWithoutSnapshotsRequiringCapture}`,
  );
  console.log(`缺失文件数量：${report.summary.missingFileCount}`);
  console.log(`疑似过小文件数量：${report.summary.suspiciousSmallFileCount}`);
  console.log(`重复快照 id 数量：${report.summary.duplicateSnapshotIdCount}`);
  console.log(`已写入校验报告：${snapshotAuditReportPath}`);
}

main().catch((error) => {
  console.error("快照校验脚本执行失败。");
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
});
