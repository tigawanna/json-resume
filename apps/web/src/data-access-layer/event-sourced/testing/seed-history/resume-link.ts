import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeLink(db: AppDb, index: number, updates: number) {
  const id = `resumeLink-${index}`;
  await persisted(
    db.collections.resumeLink.insert({
      id,
      label: `Link ${index}`,
      url: `https://example.com/link/${index}`,
      icon: null,
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeLink.update(id, (draft) => {
        draft.label = `Link ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
