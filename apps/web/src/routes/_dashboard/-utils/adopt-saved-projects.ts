import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { joinSearchable, libraryRowBase } from "./row-helpers";

/** Copy legacy shortlist rows into the resume project library. Idempotent by URL. */
export function adoptSavedProjects(db: AppDb) {
  const urls = new Set(db.collections.resumeProject.toArray.map((row) => row.url));

  for (const saved of db.collections.savedProject.toArray) {
    if (!saved.url || urls.has(saved.url)) continue;
    const base = libraryRowBase(saved.userId);
    db.collections.resumeProject.insert({
      ...base,
      name: saved.name,
      url: saved.url,
      homepageUrl: saved.homepageUrl,
      description: saved.description,
      tech: saved.tech,
      searchableText:
        saved.searchableText || joinSearchable(saved.name, saved.description, saved.tech),
    });
    urls.add(saved.url);
  }
}
