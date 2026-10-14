import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeContact(db: AppDb, index: number, updates: number) {
  const id = `resumeContact-${index}`;
  await persisted(
    db.collections.resumeContact.insert({
      id,
      type: "email",
      value: `person${index}@example.com`,
      label: "",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeContact.update(id, (draft) => {
        draft.label = `Label ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
