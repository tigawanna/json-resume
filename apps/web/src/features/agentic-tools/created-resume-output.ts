export interface CreatedResumeOutput {
  resumeId: string;
  name?: string;
}

export const createdResumeToolNames = new Set([
  "create_resume_from_document",
  "clone_resume",
  "clone_current_resume",
]);

export function getCreatedResumeOutput(part: {
  name: string;
  output?: unknown;
}): CreatedResumeOutput | null {
  if (!createdResumeToolNames.has(part.name)) return null;
  if (!part.output || typeof part.output !== "object" || Array.isArray(part.output)) return null;

  const record = part.output as Record<string, unknown>;
  if (typeof record.resumeId !== "string") return null;

  return {
    resumeId: record.resumeId,
    ...(typeof record.name === "string" ? { name: record.name } : {}),
  };
}

export function getCreatedResumesFromParts(
  parts: ReadonlyArray<{ type: string; name?: string; output?: unknown }>,
): CreatedResumeOutput[] {
  const results: CreatedResumeOutput[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (part.type !== "tool-call" || !part.name) continue;
    const output = getCreatedResumeOutput({ name: part.name, output: part.output });
    if (!output || seen.has(output.resumeId)) continue;
    seen.add(output.resumeId);
    results.push(output);
  }

  return results;
}
