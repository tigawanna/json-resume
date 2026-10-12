export type ViewMode = "tree" | "diff" | "raw";

export const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "diff", label: "Diff" },
  { id: "raw", label: "Raw" },
];
