export interface ResumeAiDirective {
  command: string;
  label: string;
  instruction: string;
}

/** Slash-command directives the AI composer supports via `/`. */
export const DIRECTIVES: ResumeAiDirective[] = [
  {
    command: "/fit-analysis",
    label: "Fit analysis",
    instruction:
      "Analyze how well my resume fits the job description I provide. Call out strong matches, gaps, and missing keywords.",
  },
  {
    command: "/rewrite-summary",
    label: "Rewrite summary",
    instruction:
      "Rewrite my professional summary to be more impactful, concrete, and results-oriented.",
  },
  {
    command: "/improve-bullets",
    label: "Improve bullets",
    instruction:
      "Improve the bullet points in my most recent role with stronger action verbs and quantified achievements.",
  },
  {
    command: "/tailor",
    label: "Tailor resume",
    instruction:
      "Tailor this resume for the specific role I describe, aligning wording and emphasis with the job description.",
  },
];

export function directiveByCommand(command: string): ResumeAiDirective | undefined {
  return DIRECTIVES.find((directive) => directive.command === command);
}
