import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InstitutionRecord = Record<string, unknown>;

type InstitutionPatchAction =
  | "updateWebsite"
  | "markManuallyVerified"
  | "markUnavailable";

const acceptedInstitutionsPath = join(
  process.cwd(),
  "src/data/imports/us/acceptedInstitutions.json",
);

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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

function isPatchAction(value: string): value is InstitutionPatchAction {
  return (
    value === "updateWebsite" ||
    value === "markManuallyVerified" ||
    value === "markUnavailable"
  );
}

function normalizeWebsite(value: unknown) {
  const website = stringValue(value);

  if (!website) {
    return "";
  }

  try {
    const url = new URL(website);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

async function readAcceptedInstitutions() {
  const fileContent = await readFile(acceptedInstitutionsPath, "utf8");
  const parsed = JSON.parse(fileContent) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("acceptedInstitutions.json 内容不是 JSON 数组。");
  }

  return parsed as InstitutionRecord[];
}

function sanitizeInstitutionForResponse(institution: InstitutionRecord) {
  return {
    id: stringValue(institution.id),
    slug: stringValue(institution.slug),
    nameZh: stringValue(institution.nameZh),
    nameEn: stringValue(institution.nameEn),
    website: stringValue(institution.website),
    linkStatus: stringValue(institution.linkStatus),
    lastCheckedAt: stringValue(institution.lastCheckedAt),
    linkCheckNote: stringValue(institution.linkCheckNote),
    previousWebsite: stringValue(institution.previousWebsite),
  };
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("请求体不是有效 JSON。");
  }

  const institutionId = stringValue(body.institutionId);
  const action = stringValue(body.action);

  if (!institutionId) {
    return jsonError("缺少 institutionId。");
  }

  if (!isPatchAction(action)) {
    return jsonError("不支持的机构链接更新 action。");
  }

  try {
    const institutions = await readAcceptedInstitutions();
    const institutionIndex = institutions.findIndex(
      (institution) => stringValue(institution.id) === institutionId,
    );

    if (institutionIndex < 0) {
      return jsonError(`未找到机构：${institutionId}`, 404);
    }

    const institution = institutions[institutionIndex];
    const checkedAt = todayDate();

    if (action === "updateWebsite") {
      const website = normalizeWebsite(body.website);

      if (!website) {
        return jsonError("请输入有效的 http 或 https 官网链接。");
      }

      if (!stringValue(institution.previousWebsite)) {
        institution.previousWebsite = stringValue(institution.website);
      }

      institution.website = website;
      institution.linkStatus = "needs_recheck";
      institution.lastCheckedAt = checkedAt;
      institution.linkCheckNote = "管理员手动更新官网链接，待重新校验。";
    }

    if (action === "markManuallyVerified") {
      institution.linkStatus = "manual_ok";
      institution.lastCheckedAt = checkedAt;
      institution.linkCheckNote =
        "自动检测受限，但管理员已人工确认链接可访问。";
    }

    if (action === "markUnavailable") {
      institution.linkStatus = "unavailable";
      institution.lastCheckedAt = checkedAt;
      institution.linkCheckNote =
        "管理员标记为暂无法访问，后续需继续复核。";
    }

    await writeFile(
      acceptedInstitutionsPath,
      `${JSON.stringify(institutions, null, 2)}\n`,
      "utf8",
    );

    return NextResponse.json({
      success: true,
      action,
      institution: sanitizeInstitutionForResponse(institution),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "机构链接更新失败。",
      500,
    );
  }
}
