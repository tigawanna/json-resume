import type { ChipSegment, Segment } from "@/components/prompt-area/types";
import type { LibrarySection } from "@/features/agentic-tools/resume-tool-schemas";
import { z } from "zod";
import { directiveByCommand } from "./resume-ai-directives";

export type AttachKind = "resume" | LibrarySection;

/** What the `+` sheet can attach, in picker order. `section` is the tool section name. */
export const ATTACH_KINDS = [
  { kind: "resume", label: "Résumés", heading: "Referenced resumes" },
  { kind: "experience", label: "Experiences", heading: "Referenced experiences" },
  { kind: "experience_bullet", label: "Bullets", heading: "Referenced bullets" },
  { kind: "education", label: "Education", heading: "Referenced education" },
  { kind: "projects", label: "Projects", heading: "Referenced projects" },
  { kind: "talks", label: "Talks", heading: "Referenced talks" },
  { kind: "skills", label: "Skills", heading: "Referenced skills" },
  { kind: "summary", label: "Summaries", heading: "Referenced summaries" },
] as const satisfies ReadonlyArray<{ kind: AttachKind; label: string; heading: string }>;

const attachKindSchema = z.enum(ATTACH_KINDS.map((entry) => entry.kind));

/** `data` on an `@` chip. Typed `@` mentions predate `kind` and are résumés. */
const attachChipDataSchema = z.object({
  kind: attachKindSchema.default("resume"),
  id: z.string(),
  name: z.string(),
});

export type AttachChipData = z.infer<typeof attachChipDataSchema>;

export function attachChip(data: AttachChipData) {
  const label = data.name.length > 40 ? `${data.name.slice(0, 39).trimEnd()}…` : data.name;
  return { trigger: "@", value: data.id, displayText: `@${label}`, data };
}

export function readAttachChip(chip: ChipSegment): AttachChipData {
  const parsed = attachChipDataSchema.safeParse(chip.data);
  return parsed.success
    ? parsed.data
    : { kind: "resume", id: chip.value, name: chip.displayText.replace(/^@/, "") };
}

export function attachedChips(segments: Segment[]): AttachChipData[] {
  return segments.flatMap((segment) =>
    segment.type === "chip" && segment.trigger === "@" ? [readAttachChip(segment)] : [],
  );
}

/** True when the segments contain any non-whitespace text or chip. */
export function hasText(segments: Segment[]) {
  return segments.some((segment) => segment.type === "chip" || segment.text.trim().length > 0);
}

/**
 * Serialize segments into the outgoing prompt. Text and chips render inline
 * (chips as their display text), followed by one block per extra: directive
 * instructions, focus sections, and one reference block per attached type.
 */
export function serializeSegments(segments: Segment[]) {
  const inline = segments
    .map((segment) => (segment.type === "text" ? segment.text : segment.displayText))
    .join("")
    .trim();
  if (!inline) return "";

  const parts = [inline];

  const directiveLines = segments
    .flatMap((segment) =>
      segment.type === "chip" && segment.trigger === "/" ? [segment.value] : [],
    )
    .map((value) => directiveByCommand(value))
    .filter((directive) => directive !== undefined)
    .map((directive) => `${directive.command}: ${directive.instruction}`);
  if (directiveLines.length > 0) parts.push([...new Set(directiveLines)].join("\n"));

  const sectionTags = [
    ...new Set(
      segments.flatMap((segment) =>
        segment.type === "chip" && segment.trigger === "#" ? [segment.value] : [],
      ),
    ),
  ];
  if (sectionTags.length > 0) {
    parts.push(
      `Focus sections: ${sectionTags.join(", ")} (read them with get_resume sections and keep changes to them).`,
    );
  }

  const attached = attachedChips(segments);
  for (const { kind, heading } of ATTACH_KINDS) {
    const seen = new Set<string>();
    const lines = attached.flatMap((item) => {
      if (item.kind !== kind || seen.has(item.id)) return [];
      seen.add(item.id);
      return kind === "resume"
        ? [`- "${item.name}" (id: ${item.id})`]
        : [`- "${item.name}" (section: ${kind}, id: ${item.id})`];
    });
    if (lines.length > 0) parts.push(`${heading}:\n${lines.join("\n")}`);
  }

  return parts.join("\n\n");
}
