import { z } from "zod";

/** One bullet as the model sees it: the stable id and its current wording. */
export const experienceBulletSnapshotSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const experienceTitleSnapshotSchema = z.object({
  id: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  bullets: z.array(experienceBulletSnapshotSchema),
});

/** The immutable company + period a conversation is scoped to, plus every title under it. */
export const experienceGroupSnapshotSchema = z.object({
  company: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  titles: z.array(experienceTitleSnapshotSchema),
});

export type ExperienceGroupSnapshot = z.infer<typeof experienceGroupSnapshotSchema>;

/** Caps the forwarded snapshot so one huge library cannot blow the system prompt. */
export const EXPERIENCE_SNAPSHOT_MAX_CHARS = 40_000;

const BULLET_TEXT_MAX_CHARS = 500;

function clampText(text: string) {
  if (text.length <= BULLET_TEXT_MAX_CHARS) return text;
  return `${text.slice(0, BULLET_TEXT_MAX_CHARS - 3)}...`;
}

/** Grounded, id-carrying text block the system prompt embeds for the model. */
export function formatExperienceSnapshot(snapshot: ExperienceGroupSnapshot): string {
  const period = `${snapshot.startDate || "?"} -> ${snapshot.endDate || "?"}`;
  const lines = [`Company: ${snapshot.company}`, `Period: ${period}`];
  snapshot.titles.forEach((title, index) => {
    const location = title.location ? ` · ${title.location}` : "";
    lines.push(
      "",
      `Title ${index + 1}: ${title.role} (id ${title.id})`,
      `Dates: ${title.startDate} -> ${title.endDate}${location}`,
    );
    if (title.bullets.length === 0) {
      lines.push("  (no bullets yet)");
      return;
    }
    for (const bullet of title.bullets) {
      lines.push(`  - [${bullet.id}] ${bullet.text}`);
    }
  });
  return lines.join("\n");
}

/**
 * Clamps bullet wording, then halves the largest title's bullet list until the
 * formatted snapshot fits the char budget (a few coarse passes, not one pop per
 * check). Titles are dropped last; at least one title always survives so the
 * model keeps its anchor ids.
 */
export function limitExperienceSnapshot(
  snapshot: ExperienceGroupSnapshot,
): ExperienceGroupSnapshot {
  const titles = snapshot.titles.map((title) => ({
    ...title,
    bullets: title.bullets.map((bullet) => ({ ...bullet, text: clampText(bullet.text) })),
  }));
  let current: ExperienceGroupSnapshot = { ...snapshot, titles };

  const fits = () => formatExperienceSnapshot(current).length <= EXPERIENCE_SNAPSHOT_MAX_CHARS;
  if (fits()) return current;

  let guard = 64;
  while (!fits() && guard > 0) {
    guard -= 1;
    let biggest = -1;
    for (let i = 0; i < current.titles.length; i += 1) {
      const count = current.titles[i].bullets.length;
      if (count > 0 && (biggest === -1 || count > current.titles[biggest].bullets.length)) {
        biggest = i;
      }
    }
    if (biggest !== -1) {
      const next = [...current.titles];
      const keep = Math.floor(next[biggest].bullets.length / 2);
      next[biggest] = { ...next[biggest], bullets: next[biggest].bullets.slice(0, keep) };
      current = { ...current, titles: next };
      continue;
    }
    if (current.titles.length > 1) {
      current = { ...current, titles: current.titles.slice(0, -1) };
      continue;
    }
    break;
  }
  return current;
}
