import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeTalk(db: AppDb, index: number, updates: number) {
  const id = `resumeTalk-${index}`;
  await persisted(
    db.collections.resumeTalk.insert({
      id,
      title: `Talk ${index}`,
      event: `Event ${index}`,
      date: "2024",
      description: "",
      links: "[]",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeTalk.update(id, (draft) => {
        draft.description = `Description ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
