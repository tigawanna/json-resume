import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeExperience(db: AppDb, index: number, updates: number) {
  const id = `resumeExperience-${index}`;
  await persisted(
    db.collections.resumeExperience.insert({
      id,
      company: `Company ${index}`,
      role: "Engineer",
      startDate: "2020",
      endDate: "",
      location: "",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeExperience.update(id, (draft) => {
        draft.role = `Engineer ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
