import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeVolunteer(db: AppDb, index: number, updates: number) {
  const id = `resumeVolunteer-${index}`;
  await persisted(
    db.collections.resumeVolunteer.insert({
      id,
      organization: `Org ${index}`,
      role: "Helper",
      startDate: "2021",
      endDate: "",
      description: "",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeVolunteer.update(id, (draft) => {
        draft.role = `Helper ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
