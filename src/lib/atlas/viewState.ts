export type AtlasViewState = {
  view: "timeline" | "network";
  focusNodeId?: string;
  highlightEdgeIds?: string[];
  periodId?: string;
  showInferred?: boolean;
};

export const defaultAtlasViewState: AtlasViewState = {
  view: "timeline",
  focusNodeId: "",
  highlightEdgeIds: [],
  periodId: "",
  showInferred: false,
};
