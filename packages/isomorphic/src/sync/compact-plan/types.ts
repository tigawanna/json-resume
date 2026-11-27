export type Row = Record<string, unknown>;

export type CompactionOp = {
  collectionId: string;
  type: "update" | "delete";
  id: string;
  row: Row;
};

export type CompactionPlan = {
  ops: CompactionOp[];
  merged: Record<string, number>;
  /** Rows removed because no résumé layout reaches them, per collection (only with `prune`). */
  pruned: Record<string, number>;
};
