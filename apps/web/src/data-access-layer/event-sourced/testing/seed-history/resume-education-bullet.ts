import type { AppDb } from "../../collection";
import { childStamp, persisted } from "./history";

export async function seedResumeEducationBullet(
  db: AppDb,
  index: number,
  educationId: string,
  updates: number,
) {
  const id = `resumeEducationBullet-${index}`;
  await persisted(
    db.collections.resumeEducationBullet.insert({
      id,
      educationId,
      text: "Bullet",
      sortOrder: 0,
      ...childStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeEducationBullet.update(id, (draft) => {
        draft.text = `Bullet ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
