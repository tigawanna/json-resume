import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  wrapUpToolInputSchema,
  type WrapUpToolInput,
  type WrapUpToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";

/** Resolves the résumé names for the wrap-up card, dropping ids the model made up. */
export function wrapUpLocal(
  ctx: Pick<LocalToolContext, "db">,
  input: WrapUpToolInput,
): WrapUpToolOutput {
  const data = wrapUpToolInputSchema.parse(input);
  const seen = new Set<string>();
  const resumes: WrapUpToolOutput["resumes"] = [];
  const unknownResumeIds: string[] = [];

  for (const item of data.resumes) {
    const key = `${item.role}:${item.resumeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const resume = ctx.db.collections.resume.get(item.resumeId);
    if (!resume) {
      unknownResumeIds.push(item.resumeId);
      continue;
    }
    resumes.push({
      resumeId: resume.id,
      role: item.role,
      name: resume.name,
      ...(item.note ? { note: item.note } : {}),
    });
  }

  return { resumes, unknownResumeIds };
}
