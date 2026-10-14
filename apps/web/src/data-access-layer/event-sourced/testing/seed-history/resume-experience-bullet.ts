import type { AppDb } from "../../collection";
import { childStamp, persisted } from "./history";

export async function seedResumeExperienceBullet(
  db: AppDb,
  index: number,
  experienceId: string,
  updates: number,
) {
  const id = `resumeExperienceBullet-${index}`;
  await persisted(
    db.collections.resumeExperienceBullet.insert({
      id,
      experienceId,
      text: "Bullet",
      sortOrder: 0,
      ...childStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeExperienceBullet.update(id, (draft) => {
        draft.text = `Bullet ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
