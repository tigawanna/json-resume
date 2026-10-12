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
  {
    command: "/cover-letter",
    label: "Cover letter",
    instruction:
      "Write a cover letter for this resume and its job (follow the cover_letter playbook) and save it with save_cover_letter. If I attached a previous cover letter, keep its voice and strongest stories but rewrite the company, role, and specifics to fit this job.",
  },
  {
    command: "/answer-questions",
    label: "Answer application questions",
    instruction:
      "These are questions from the application form for this resume's job (follow the application_questions playbook). Draft a starting-point answer for each, reusing stories from my past answers, mark the details only I know as [[...]], and save them with save_application_answers.",
  },
];

/** Accepts the command with or without its slash (space-resolved chips drop it). */
export function directiveByCommand(command: string): ResumeAiDirective | undefined {
  const normalized = command.startsWith("/") ? command : `/${command}`;
  return DIRECTIVES.find((directive) => directive.command === normalized);
}

/** `#tags` the composer offers; values match `get_resume`'s `sections`. */
export const SECTION_TAGS = [
  { value: "header", label: "Header", description: "Name, headline, contacts and links" },
  { value: "summary", label: "Summary", description: "Professional summary" },
  { value: "experience", label: "Experience", description: "Roles and their bullets" },
  { value: "education", label: "Education", description: "Degrees and courses" },
  { value: "projects", label: "Projects", description: "Side and portfolio projects" },
  { value: "talks", label: "Talks", description: "Talks and presentations" },
  { value: "skills", label: "Skills", description: "Skill groups" },
  { value: "notes", label: "Notes", description: "Cover-letter notes" },
  { value: "job", label: "Job", description: "The linked job description" },
] as const;
