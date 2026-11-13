/** A skill file: YAML front matter, then the instructions. */

export interface SkillFrontMatter {
  name: string;
  description: string;
  /** Markdown after the closing `---`. */
  body: string;
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function unquote(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
}

function quote(value: string) {
  if (value === "" || /[:#\n"'&]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function hasSkillFrontMatter(markdown: string) {
  return FRONT_MATTER.test(markdown);
}

export function parseSkillMarkdown(markdown: string): SkillFrontMatter {
  const match = FRONT_MATTER.exec(markdown);
  if (!match) return { name: "", description: "", body: markdown.trim() };
  const fields = new Map<string, string>();
  for (const line of match[1].split("\n")) {
    const splitAt = line.indexOf(":");
    if (splitAt === -1) continue;
    fields.set(line.slice(0, splitAt).trim(), unquote(line.slice(splitAt + 1)));
  }
  return {
    name: fields.get("name") ?? "",
    description: fields.get("description") ?? "",
    body: match[2].trim(),
  };
}

export function composeSkillMarkdown(input: { name: string; description: string; body: string }) {
  return [
    "---",
    `name: ${quote(input.name.trim())}`,
    `description: ${quote(input.description.trim())}`,
    "---",
    "",
    input.body.trim(),
    "",
  ].join("\n");
}

/**
 * The document the editor and the assistant see. Plain text from before front
 * matter existed is wrapped so the headers are always there.
 */
export function skillDocument(skill: { name: string; body: string; description?: string }) {
  if (hasSkillFrontMatter(skill.body)) return skill.body.trimEnd() + "\n";
  return composeSkillMarkdown({
    name: skill.name,
    description: skill.description ?? "",
    body: skill.body,
  });
}

/** First useful line for a list, skipping the front matter. */
export function skillExcerpt(skill: { name: string; body: string }) {
  const parsed = parseSkillMarkdown(skillDocument(skill));
  if (parsed.description.trim()) return parsed.description.trim();
  const line = parsed.body.split("\n").find((entry) => entry.trim().length > 0);
  return line?.trim() ?? "";
}
