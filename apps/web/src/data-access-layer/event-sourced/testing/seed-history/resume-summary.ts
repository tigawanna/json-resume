import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeSummary(db: AppDb, index: number, updates: number) {
  const id = `resumeSummary-${index}`;
  await persisted(
    db.collections.resumeSummary.insert({
      id,
      text: `Summary ${index}`,
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeSummary.update(id, (draft) => {
        draft.text = `Summary ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
