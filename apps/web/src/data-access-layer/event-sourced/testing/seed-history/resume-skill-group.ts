import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeSkillGroup(db: AppDb, index: number, updates: number) {
  const id = `resumeSkillGroup-${index}`;
  await persisted(
    db.collections.resumeSkillGroup.insert({
      id,
      name: `Group ${index}`,
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeSkillGroup.update(id, (draft) => {
        draft.name = `Group ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
