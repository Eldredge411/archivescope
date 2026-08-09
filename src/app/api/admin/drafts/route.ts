import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";
import type {
  DraftReviewStatus,
  EntityTypeConfidence,
  ResourceDraft,
  TargetEntityType,
} from "@/types/ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DraftSource = {
  sourceKey: string;
  filePath: string;
  labelZh: string;
};

type ResourceDraftWithSource = ResourceDraft & {
  draftSourceKey: string;
  draftSourceLabelZh: string;
  reviewInsight?: DraftReviewInsight | null;
};

type DraftReviewInsight = Record<string, unknown> & {
  draftId?: string;
  draftSourceKey?: string;
};

type DraftUpdateItem = {
  id?: string;
  draftSourceKey?: string;
  reviewStatus?: DraftReviewStatus;
  targetEntityType?: TargetEntityType;
  entityTypeConfidence?: EntityTypeConfidence;
  classificationReason?: string;
};

type FailedDraftUpdateItem = DraftUpdateItem & {
  message: string;
};

type DraftSourceState = {
  source: DraftSource;
  drafts: ResourceDraft[];
  readError?: string;
  changed: boolean;
  updatedItems: ResourceDraftWithSource[];
};

type DraftSourceReadResult = {
  source: DraftSource;
  drafts: ResourceDraft[];
  error?: string;
};

const draftSources: DraftSource[] = [
  {
    sourceKey: "federal-register",
    filePath: join(
      process.cwd(),
      "src/data/drafts/us/federalRegisterDrafts.json",
    ),
    labelZh: "Federal Register",
  },
  {
    sourceKey: "nara-web",
    filePath: join(process.cwd(), "src/data/drafts/us/naraWebDrafts.json"),
    labelZh: "NARA 官网",
  },
  {
    sourceKey: "nara-catalog",
    filePath: join(process.cwd(), "src/data/drafts/us/naraCatalogDrafts.json"),
    labelZh: "NARA Catalog",
  },
  {
    sourceKey: "manual-url",
    filePath: join(process.cwd(), "src/data/drafts/us/manualUrlDrafts.json"),
    labelZh: "手动网址",
  },
];

const draftReviewInsightsPath = join(
  process.cwd(),
  "src/data/imports/us/draftReviewInsights.json",
);

const reviewStatuses: DraftReviewStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "needs_review",
  "published",
];

const targetEntityTypes: TargetEntityType[] = [
  "resource",
  "institution",
  "unknown",
];

const entityTypeConfidences: EntityTypeConfidence[] = [
  "high",
  "medium",
  "low",
];

function attachDraftSource(
  draft: ResourceDraft,
  source: DraftSource,
  insight?: DraftReviewInsight | null,
): ResourceDraftWithSource {
  return {
    ...draft,
    draftSourceKey: source.sourceKey,
    draftSourceLabelZh: source.labelZh,
    reviewInsight: insight ?? null,
  };
}

function getInsightKey(draftId?: string, draftSourceKey?: string) {
  return `${draftSourceKey ?? ""}:${draftId ?? ""}`;
}

async function readDraftReviewInsights() {
  try {
    const fileContent = await readFile(draftReviewInsightsPath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      return new Map<string, DraftReviewInsight>();
    }

    return new Map(
      (parsed as DraftReviewInsight[])
        .map((insight) => [
          getInsightKey(String(insight.draftId ?? ""), String(insight.draftSourceKey ?? "")),
          insight,
        ] as const)
        .filter(([key]) => !key.startsWith(":") && !key.endsWith(":")),
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return new Map<string, DraftReviewInsight>();
    }

    throw error;
  }
}

async function readDrafts(source: DraftSource) {
  try {
    const fileContent = await readFile(source.filePath, "utf8");
    const parsed = JSON.parse(fileContent) as unknown;

    return Array.isArray(parsed) ? (parsed as ResourceDraft[]) : [];
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

async function writeDrafts(source: DraftSource, drafts: ResourceDraft[]) {
  await mkdir(dirname(source.filePath), { recursive: true });
  await writeFile(
    source.filePath,
    `${JSON.stringify(drafts, null, 2)}\n`,
    "utf8",
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function hasPatchFields(value: {
  reviewStatus?: DraftReviewStatus;
  targetEntityType?: TargetEntityType;
  entityTypeConfidence?: EntityTypeConfidence;
  classificationReason?: string;
}) {
  return (
    value.reviewStatus !== undefined ||
    value.targetEntityType !== undefined ||
    value.entityTypeConfidence !== undefined ||
    value.classificationReason !== undefined
  );
}

function buildDraftPatch(
  value: DraftUpdateItem,
): Partial<
  Pick<
    ResourceDraft,
    | "reviewStatus"
    | "targetEntityType"
    | "entityTypeConfidence"
    | "classificationReason"
  >
> {
  const patch: Partial<
    Pick<
      ResourceDraft,
      | "reviewStatus"
      | "targetEntityType"
      | "entityTypeConfidence"
      | "classificationReason"
    >
  > = {};

  if (value.reviewStatus !== undefined) {
    patch.reviewStatus = value.reviewStatus;
  }

  if (value.targetEntityType !== undefined) {
    patch.targetEntityType = value.targetEntityType;
  }

  if (value.entityTypeConfidence !== undefined) {
    patch.entityTypeConfidence = value.entityTypeConfidence;
  }

  if (value.classificationReason !== undefined) {
    patch.classificationReason = String(value.classificationReason);
  }

  return patch;
}

function validatePatchFields(value: DraftUpdateItem) {
  if (
    value.reviewStatus !== undefined &&
    !reviewStatuses.includes(value.reviewStatus)
  ) {
    return "审核状态不在允许范围内。";
  }

  if (
    value.targetEntityType !== undefined &&
    !targetEntityTypes.includes(value.targetEntityType)
  ) {
    return "归属类型不在允许范围内。";
  }

  if (
    value.entityTypeConfidence !== undefined &&
    !entityTypeConfidences.includes(value.entityTypeConfidence)
  ) {
    return "归属判断置信度不在允许范围内。";
  }

  return "";
}

async function readDraftSource(source: DraftSource): Promise<DraftSourceReadResult> {
  try {
    const drafts = await readDrafts(source);

    return {
      source,
      drafts,
    };
  } catch (error) {
    return {
      source,
      drafts: [],
      error: `${source.labelZh}（${source.filePath}）：${getErrorMessage(error)}`,
    };
  }
}

async function readDraftSourceState(
  source: DraftSource,
): Promise<DraftSourceState> {
  try {
    const drafts = await readDrafts(source);

    return {
      source,
      drafts,
      changed: false,
      updatedItems: [],
    };
  } catch (error) {
    return {
      source,
      drafts: [],
      readError: getErrorMessage(error),
      changed: false,
      updatedItems: [],
    };
  }
}

function getTargetStates(
  sourceStates: DraftSourceState[],
  draftSourceKey?: string,
) {
  if (!draftSourceKey) {
    return sourceStates;
  }

  return sourceStates.filter((state) => state.source.sourceKey === draftSourceKey);
}

function updateDraftInStates({
  item,
  patch,
  sourceStates,
  updatedAt,
}: {
  item: DraftUpdateItem;
  patch: DraftUpdateItem;
  sourceStates: DraftSourceState[];
  updatedAt: string;
}) {
  if (!item.id) {
    return {
      updatedItem: null,
      failedItem: {
        ...item,
        message: "缺少草稿 id。",
      } satisfies FailedDraftUpdateItem,
    };
  }

  const validationError = validatePatchFields(patch);

  if (validationError) {
    return {
      updatedItem: null,
      failedItem: {
        ...item,
        message: validationError,
      } satisfies FailedDraftUpdateItem,
    };
  }

  if (!hasPatchFields(patch)) {
    return {
      updatedItem: null,
      failedItem: {
        ...item,
        message: "缺少可更新字段。",
      } satisfies FailedDraftUpdateItem,
    };
  }

  const targetStates = getTargetStates(sourceStates, item.draftSourceKey);

  if (item.draftSourceKey && targetStates.length === 0) {
    return {
      updatedItem: null,
      failedItem: {
        ...item,
        message: "草稿来源不在允许范围内。",
      } satisfies FailedDraftUpdateItem,
    };
  }

  const readableStates = targetStates.filter((state) => !state.readError);

  for (const state of readableStates) {
    const draftIndex = state.drafts.findIndex((draft) => draft.id === item.id);

    if (draftIndex === -1) {
      continue;
    }

    const updatedDraft = {
      ...state.drafts[draftIndex],
      ...buildDraftPatch(patch),
      updatedAt,
    };

    state.drafts[draftIndex] = updatedDraft;
    state.changed = true;

    const updatedItem = attachDraftSource(updatedDraft, state.source);
    state.updatedItems.push(updatedItem);

    return {
      updatedItem,
      failedItem: null,
    };
  }

  const sourceReadError = targetStates.find((state) => state.readError)?.readError;

  return {
    updatedItem: null,
    failedItem: {
      ...item,
      message: sourceReadError
        ? `草稿源读取失败：${sourceReadError}`
        : "未找到对应草稿。",
    } satisfies FailedDraftUpdateItem,
  };
}

async function writeChangedSourceStates(sourceStates: DraftSourceState[]) {
  const failedItems: FailedDraftUpdateItem[] = [];

  for (const state of sourceStates) {
    if (!state.changed) {
      continue;
    }

    try {
      await writeDrafts(state.source, state.drafts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      failedItems.push(
        ...state.updatedItems.map((updatedItem) => ({
          id: updatedItem.id,
          draftSourceKey: state.source.sourceKey,
          message: `草稿状态写入失败：${message}`,
        })),
      );
    }
  }

  return failedItems;
}

export async function GET() {
  const [sourceResults, reviewInsightByKey] = await Promise.all([
    Promise.all(draftSources.map((source) => readDraftSource(source))),
    readDraftReviewInsights(),
  ]);
  const drafts = sourceResults.flatMap((result) =>
    result.drafts.map((draft) =>
      attachDraftSource(
        draft,
        result.source,
        reviewInsightByKey.get(getInsightKey(draft.id, result.source.sourceKey)),
      ),
    ),
  );
  const errors = sourceResults
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error));

  if (errors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `部分草稿文件读取失败：${errors.join("；")}`,
        drafts,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(drafts);
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      reviewStatus?: DraftReviewStatus;
      draftSourceKey?: string;
      targetEntityType?: TargetEntityType;
      entityTypeConfidence?: EntityTypeConfidence;
      classificationReason?: string;
      items?: DraftUpdateItem[];
    };
    const bodyPatch: DraftUpdateItem = {
      reviewStatus: body.reviewStatus,
      targetEntityType: body.targetEntityType,
      entityTypeConfidence: body.entityTypeConfidence,
      classificationReason: body.classificationReason,
    };
    const bodyPatchValidationError = validatePatchFields(bodyPatch);

    if (bodyPatchValidationError) {
      return NextResponse.json(
        { success: false, error: bodyPatchValidationError },
        { status: 400 },
      );
    }

    if (!hasPatchFields(bodyPatch) && !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: "缺少可更新字段。" },
        { status: 400 },
      );
    }

    if (Array.isArray(body.items)) {
      const sourceStates = await Promise.all(
        draftSources.map((source) => readDraftSourceState(source)),
      );
      const updatedAt = new Date().toISOString();
      const updateResults = body.items.map((item) => {
        const itemPatch: DraftUpdateItem = {
          reviewStatus: item.reviewStatus ?? bodyPatch.reviewStatus,
          targetEntityType: item.targetEntityType ?? bodyPatch.targetEntityType,
          entityTypeConfidence:
            item.entityTypeConfidence ?? bodyPatch.entityTypeConfidence,
          classificationReason:
            item.classificationReason ?? bodyPatch.classificationReason,
        };

        return updateDraftInStates({
          item,
          patch: itemPatch,
          sourceStates,
          updatedAt,
        });
      });
      const failedItems = updateResults
        .map((result) => result.failedItem)
        .filter((item): item is FailedDraftUpdateItem => Boolean(item));
      const stagedUpdatedItems = updateResults
        .map((result) => result.updatedItem)
        .filter((item): item is ResourceDraftWithSource => Boolean(item));
      const writeFailedItems = await writeChangedSourceStates(sourceStates);
      const writeFailedKeys = new Set(
        writeFailedItems.map(
          (item) => `${item.draftSourceKey ?? ""}:${item.id ?? ""}`,
        ),
      );
      const updatedItems = stagedUpdatedItems.filter(
        (item) => !writeFailedKeys.has(`${item.draftSourceKey}:${item.id}`),
      );

      return NextResponse.json({
        success: true,
        updatedCount: updatedItems.length,
        failedItems: [...failedItems, ...writeFailedItems],
        updatedItems,
      });
    }

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "缺少草稿 id。" },
        { status: 400 },
      );
    }

    const sourcesToSearch = body.draftSourceKey
      ? draftSources.filter((source) => source.sourceKey === body.draftSourceKey)
      : draftSources;

    if (body.draftSourceKey && sourcesToSearch.length === 0) {
      return NextResponse.json(
        { success: false, error: "草稿来源不在允许范围内。" },
        { status: 400 },
      );
    }

    for (const source of sourcesToSearch) {
      const drafts = await readDrafts(source);
      const draftIndex = drafts.findIndex((draft) => draft.id === body.id);

      if (draftIndex === -1) {
        continue;
      }

      const validationError = validatePatchFields(bodyPatch);

      if (validationError) {
        return NextResponse.json(
          { success: false, error: validationError },
          { status: 400 },
        );
      }

      if (!hasPatchFields(bodyPatch)) {
        return NextResponse.json(
          { success: false, error: "缺少可更新字段。" },
          { status: 400 },
        );
      }

      const updatedDraft = {
        ...drafts[draftIndex],
        ...buildDraftPatch(bodyPatch),
        updatedAt: new Date().toISOString(),
      };
      const updatedDrafts = [...drafts];
      updatedDrafts[draftIndex] = updatedDraft;

      try {
        await writeDrafts(source, updatedDrafts);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: `草稿状态写入失败：${getErrorMessage(error)}`,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        updatedCount: 1,
        failedItems: [],
        updatedItems: [attachDraftSource(updatedDraft, source)],
      });
    }

    return NextResponse.json(
      { success: false, error: "未找到对应草稿。" },
      { status: 404 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `草稿状态更新失败：${getErrorMessage(error)}`,
      },
      { status: 500 },
    );
  }
}
