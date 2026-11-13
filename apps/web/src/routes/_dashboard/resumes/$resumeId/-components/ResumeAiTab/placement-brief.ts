export type PlacementDepth = "honest" | "all-in" | "other";
export type PlacementInsertion = "weave" | "new-bullet" | "skills-list" | "other";

/** Answers collected before a tailor so the assistant does not guess where a skill belongs. */
export interface PlacementBrief {
  depth: PlacementDepth;
  depthNote: string;
  /** "none", "other", or a résumé skill id. */
  skillChoice: string;
  skillNote: string;
  /** Label for a chosen résumé skill. Ignored for "none" and "other". */
  skillLabel: string;
  /** "auto", "other", or an experience id. */
  experienceChoice: string;
  experienceNote: string;
  /** Label for a chosen experience, including its id when one is selected. */
  experienceLabel: string;
  insertion: PlacementInsertion;
  insertionNote: string;
}

export const DEFAULT_PLACEMENT_BRIEF: PlacementBrief = {
  depth: "honest",
  depthNote: "",
  skillChoice: "none",
  skillNote: "",
  skillLabel: "",
  experienceChoice: "auto",
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
  let skill = "No specific skill to place. Improve what is already true.";
  if (brief.skillChoice === "other") skill = noted("other", brief.skillNote, "");
  else if (brief.skillChoice !== "none") {
    skill = brief.skillLabel.trim() || "The selected skill";
  }
  let experienceId = "";
  let experienceText = "Choose the experience that already supports it. Do not force a home.";
  if (brief.experienceChoice === "other") {
    experienceText = noted("other", brief.experienceNote, "");
  } else if (brief.experienceChoice !== "auto") {
    experienceId = brief.experienceChoice;
    experienceText = brief.experienceLabel.trim() || brief.experienceChoice;
  }
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
