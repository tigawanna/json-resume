import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeNote(db: AppDb, index: number, updates: number) {
  const id = `resumeNote-${index}`;
  await persisted(
    db.collections.resumeNote.insert({
      id,
      label: `Note ${index}`,
      text: "Body",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeNote.update(id, (draft) => {
        draft.text = `Body ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
