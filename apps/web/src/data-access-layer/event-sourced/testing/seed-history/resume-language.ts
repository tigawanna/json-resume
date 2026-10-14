import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeLanguage(db: AppDb, index: number, updates: number) {
  const id = `resumeLanguage-${index}`;
  await persisted(
    db.collections.resumeLanguage.insert({
      id,
      name: `Language ${index}`,
      proficiency: "fluent",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeLanguage.update(id, (draft) => {
        draft.proficiency = `level ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
