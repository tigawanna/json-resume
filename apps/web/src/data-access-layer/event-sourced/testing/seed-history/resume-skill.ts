import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeSkill(db: AppDb, index: number, updates: number) {
  const id = `resumeSkill-${index}`;
  await persisted(
    db.collections.resumeSkill.insert({
      id,
      name: `Skill ${index}`,
      level: null,
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeSkill.update(id, (draft) => {
        draft.level = `level ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
