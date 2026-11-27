import { talkViewSchema } from "../tool-schemas/resume/view.ts";

/** Project `tech` is a JSON array string, or comma-separated text in older rows. */
export function parseTech(tech: string): string[] {
  try {
    const parsed: unknown = JSON.parse(tech);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return tech
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

/** Talk `links` is a JSON array string of `{ label, url }`. */
export function parseTalkLinks(links: string): Array<{ label: string; url: string }> {
  try {
    const parsed = talkViewSchema.shape.links.safeParse(JSON.parse(links));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
