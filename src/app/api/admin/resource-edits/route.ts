import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResourceAdminEdit = {
  resourceId: string;
  titleZh?: string;
  summaryShort?: string;
  summaryZh?: string;
  keyPoints?: string[];
  researchValue?: string;
  tags?: string[];
  manuallyEdited: boolean;
  updatedAt: string;
  reviewer: string;
  note?: string;
};

const resourceAdminEditsPath = join(
  process.cwd(),
  "src/data/imports/us/resourceAdminEdits.json",
);

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function stringArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => stringValue(item)).filter(Boolean))];
  }

  return stringValue(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

function frontendAdminWritesEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_ACTIONS_ENABLED === "true"
  );
}

async function readEditRecords() {
  try {
    const fileContent = await readFile(resourceAdminEditsPath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("resourceAdminEdits.json 内容不是 JSON 数组。");
    }

    return parsed as ResourceAdminEdit[];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeEditRecords(records: ResourceAdminEdit[]) {
  await mkdir(dirname(resourceAdminEditsPath), { recursive: true });
  await writeFile(
    resourceAdminEditsPath,
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

export async function PATCH(request: Request) {
  if (!frontendAdminWritesEnabled()) {
    return jsonError(
      "前台管理员修改入口未启用。公开部署环境不会开放资料编辑接口。",
      403,
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("请求体不是有效 JSON。");
  }

  const resourceId = stringValue(body.resourceId);

  if (!resourceId) {
    return jsonError("缺少 resourceId。");
  }

  const updates =
    body.updates && typeof body.updates === "object" && !Array.isArray(body.updates)
      ? (body.updates as Record<string, unknown>)
      : {};
  const nextRecord: ResourceAdminEdit = {
    resourceId,
    titleZh: stringValue(updates.titleZh),
    summaryShort: stringValue(updates.summaryShort),
    summaryZh: stringValue(updates.summaryZh),
    keyPoints: stringArrayValue(updates.keyPoints),
    researchValue: stringValue(updates.researchValue),
    tags: stringArrayValue(updates.tags),
    manuallyEdited: true,
    updatedAt: new Date().toISOString(),
    reviewer: stringValue(body.reviewer) || "local-admin",
    note: stringValue(body.note),
  };

  try {
    const records = await readEditRecords();
    const existingIndex = records.findIndex(
      (record) => stringValue(record.resourceId) === resourceId,
    );
    const nextRecords =
      existingIndex >= 0
        ? records.map((record, index) =>
            index === existingIndex ? { ...record, ...nextRecord } : record,
          )
        : [...records, nextRecord];

    await writeEditRecords(nextRecords);

    return NextResponse.json({
      success: true,
      edit: nextRecord,
      total: nextRecords.length,
    });
  } catch (error) {
    return jsonError(
      `资料人工修改保存失败：${
        error instanceof Error ? error.message : String(error)
      }`,
      500,
    );
  }
}
