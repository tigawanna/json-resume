import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeCertification(db: AppDb, index: number, updates: number) {
  const id = `resumeCertification-${index}`;
  await persisted(
    db.collections.resumeCertification.insert({
      id,
      name: `Cert ${index}`,
      issuer: `Issuer ${index}`,
      date: "2024",
      url: "",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeCertification.update(id, (draft) => {
        draft.date = `2024-${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
