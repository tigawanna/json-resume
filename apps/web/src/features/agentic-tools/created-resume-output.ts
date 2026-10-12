export interface CreatedResumeOutput {
  resumeId: string;
  name?: string;
}

export const createdResumeToolNames = new Set([
  "create_resume",
  "clone_resume",
  "tailor_resume_for_job",
]);

export function getCreatedResumeOutput(part: {
  name: string;
  output?: unknown;
}): CreatedResumeOutput | null {
  if (!createdResumeToolNames.has(part.name)) return null;
  const { output } = part;
  if (!output || typeof output !== "object" || !("resumeId" in output)) return null;
  if (typeof output.resumeId !== "string") return null;

  return {
    resumeId: output.resumeId,
    ...("name" in output && typeof output.name === "string" ? { name: output.name } : {}),
  };
}
