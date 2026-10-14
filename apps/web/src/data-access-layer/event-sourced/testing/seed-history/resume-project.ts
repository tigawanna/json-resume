import type { AppDb } from "../../collection";
import { parentStamp, persisted } from "./history";

export async function seedResumeProject(db: AppDb, index: number, updates: number) {
  const id = `resumeProject-${index}`;
  await persisted(
    db.collections.resumeProject.insert({
      id,
      name: `Project ${index}`,
      url: `https://example.com/${index}`,
      homepageUrl: "",
      description: "",
      tech: "[]",
      sortOrder: 0,
      ...parentStamp,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resumeProject.update(id, (draft) => {
        draft.description = `Description ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
