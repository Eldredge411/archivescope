import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResourceCurationDecision =
  | "keep"
  | "needs_enrichment"
  | "needs_review"
  | "exclude"
  | "hidden"
  | "move_to_institution";

type ResourceCurationRecord = {
  resourceId: string;
  decision: ResourceCurationDecision;
  hiddenFromLibrary: boolean;
  reason: string;
  reviewedAt: string;
  reviewer: string;
  notes: string;
};

const curationDecisionsJsonPath = join(
  process.cwd(),
  "src/data/imports/us/resourceCurationDecisions.json",
);

const allowedDecisions: ResourceCurationDecision[] = [
  "keep",
  "needs_enrichment",
  "needs_review",
  "exclude",
  "hidden",
  "move_to_institution",
];

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function booleanValue(value: unknown) {
  return value === true || value === "true";
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

function isAllowedDecision(value: string): value is ResourceCurationDecision {
  return allowedDecisions.includes(value as ResourceCurationDecision);
}

function defaultHiddenFromLibrary(decision: ResourceCurationDecision) {
  return (
    decision === "exclude" ||
    decision === "hidden" ||
    decision === "move_to_institution"
  );
}

async function readDecisionRecords() {
  try {
    const fileContent = await readFile(curationDecisionsJsonPath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("resourceCurationDecisions.json 内容不是 JSON 数组。");
    }

    return parsed as ResourceCurationRecord[];
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

async function writeDecisionRecords(records: ResourceCurationRecord[]) {
  await mkdir(dirname(curationDecisionsJsonPath), { recursive: true });
  await writeFile(
    curationDecisionsJsonPath,
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

export async function PATCH(request: Request) {
  if (!frontendAdminWritesEnabled()) {
    return jsonError(
      "前台管理员处置入口未启用。公开部署环境不会开放隐藏或删除接口。",
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
  const decision = stringValue(body.decision);

  if (!resourceId) {
    return jsonError("缺少 resourceId。");
  }

  if (!isAllowedDecision(decision)) {
    return jsonError("不支持的资料处置 decision。");
  }

  try {
    const records = await readDecisionRecords();
    const existingIndex = records.findIndex(
      (record) => stringValue(record.resourceId) === resourceId,
    );
    const hiddenFromLibrary =
      typeof body.hiddenFromLibrary === "boolean" ||
      typeof body.hiddenFromLibrary === "string"
        ? booleanValue(body.hiddenFromLibrary)
        : defaultHiddenFromLibrary(decision);
    const nextRecord: ResourceCurationRecord = {
      resourceId,
      decision,
      hiddenFromLibrary,
      reason: stringValue(body.reason),
      reviewedAt: new Date().toISOString(),
      reviewer: stringValue(body.reviewer) || "local-admin",
      notes: stringValue(body.notes),
    };

    if (existingIndex >= 0) {
      records[existingIndex] = {
        ...records[existingIndex],
        ...nextRecord,
      };
    } else {
      records.push(nextRecord);
    }

    await writeDecisionRecords(records);

    return NextResponse.json({
      success: true,
      decision: nextRecord,
    });
  } catch (error) {
    return jsonError(
      `资料处置决策保存失败：${
        error instanceof Error ? error.message : String(error)
      }`,
      500,
    );
  }
}
