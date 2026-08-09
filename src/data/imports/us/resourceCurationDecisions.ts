export type ResourceCurationDecisionValue =
  | "keep"
  | "needs_enrichment"
  | "needs_review"
  | "exclude"
  | "hidden"
  | "move_to_institution";

export type ResourceCurationDecision = {
  resourceId: string;
  decision: ResourceCurationDecisionValue;
  hiddenFromLibrary?: boolean;
  reason?: string;
  reviewedAt?: string;
  reviewer?: string;
  notes?: string;
};

export const resourceCurationDecisions: ResourceCurationDecision[] = [];
