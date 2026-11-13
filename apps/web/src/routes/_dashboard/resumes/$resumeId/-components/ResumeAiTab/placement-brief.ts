export type PlacementDepth = "honest" | "all-in" | "other";
export type PlacementInsertion = "weave" | "new-bullet" | "skills-list" | "other";

/** Answers collected before a tailor so the assistant does not guess where a skill belongs. */
export interface PlacementBrief {
  depth: PlacementDepth;
  depthNote: string;
  /**
   * "none", "other", and résumé skill ids. "none" is exclusive.
   * "other" can sit alongside specific skills.
   */
  skillChoices: string[];
  skillNote: string;
  /** Labels for the chosen résumé skills. Ignored for "none" and "other". */
  skillLabel: string;
  /**
   * "auto", "other", and experience ids. "auto" is exclusive.
   * "other" can sit alongside specific experiences.
   */
  experienceChoices: string[];
  experienceNote: string;
  /** Labels for the chosen experiences, including their ids. */
  experienceLabel: string;
  insertion: PlacementInsertion;
  insertionNote: string;
}

export const DEFAULT_PLACEMENT_BRIEF: PlacementBrief = {
  depth: "honest",
  depthNote: "",
  skillChoices: ["none"],
  skillNote: "",
  skillLabel: "",
  experienceChoices: ["auto"],
  experienceNote: "",
  experienceLabel: "",
  insertion: "weave",
  insertionNote: "",
};

const DEPTH_TEXT = {
  honest:
    "Keep it honest. Weave a new requirement in only when an existing role, project, or skill already supports it.",
  "all-in":
    "Go all in. The user asked to tailor to the max and disregard whether the résumé already shows the requirement.",
} as const;

const INSERTION_TEXT = {
  weave: "Weave it into a bullet that already describes this work.",
  "new-bullet": "Add a new bullet only if that role already did this work.",
  "skills-list": "Mention it in the skills list only. Do not add a bullet.",
} as const;

function noted(choice: string, note: string, fallback: string) {
  if (choice === "other") {
    const text = note.trim();
    return text || "The user picked Other and left it blank. Ask them before editing.";
  }
  return fallback;
}

/** Block appended to the user message. The assistant treats it as the placement decision. */
export function formatPlacementBrief(brief: PlacementBrief) {
  const depth =
    brief.depth === "other" ? noted("other", brief.depthNote, "") : DEPTH_TEXT[brief.depth];
  const skillIds = brief.skillChoices.filter((choice) => choice !== "none" && choice !== "other");
  const skillParts = [
    skillIds.length > 0 ? brief.skillLabel.trim() || "The selected skills" : "",
    brief.skillChoices.includes("other") ? noted("other", brief.skillNote, "") : "",
  ].filter(Boolean);
  const skill =
    skillParts.length > 0
      ? skillParts.join("; ")
      : "No specific skill to place. Improve what is already true.";
  const experienceIds = brief.experienceChoices.filter(
    (choice) => choice !== "auto" && choice !== "other",
  );
  const experienceParts = [
    experienceIds.length > 0 ? brief.experienceLabel.trim() || experienceIds.join(", ") : "",
    brief.experienceChoices.includes("other") ? noted("other", brief.experienceNote, "") : "",
  ].filter(Boolean);
  const experienceId = experienceIds.join(", ");
  const experienceText =
    experienceParts.length > 0
      ? experienceParts.join("; ")
      : "Choose the experience that already supports it. Do not force a home.";
  const insertion =
    brief.insertion === "other"
      ? noted("other", brief.insertionNote, "")
      : INSERTION_TEXT[brief.insertion];
  const depthLine = brief.depth === "all-in" ? "go all in" : depth;

  return [
    "Placement brief:",
    `- skill: ${skill}`,
    `- experience_id: ${experienceId || experienceText}`,
    `- insertion_note: ${insertion}`,
    `- source_evidence: ${experienceId ? experienceText : "not provided"}`,
    `- depth: ${depthLine}`,
  ].join("\n");
}
