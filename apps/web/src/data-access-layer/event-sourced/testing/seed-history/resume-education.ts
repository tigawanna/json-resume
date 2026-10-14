import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeEducation(db: AppDb, index: number, updates: number) {
  const id = `resumeEducation-${index}`;
  await persisted(
    db.collections.resumeEducation.insert({
      id,
      school: `School ${index}`,
      degree: "BSc",
      field: "CS",
      startDate: "2016",
      endDate: "2020",
      description: "",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeEducation.update(id, (draft) => {
        draft.degree = `BSc ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
