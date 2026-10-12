import { CreatedResumeCard } from "@/components/agentic-tools/CreatedResumeCard";
import {
  wrapUpToolInputSchema,
  type WrapUpResumeRole,
  type WrapUpToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import type { ToolProps } from "@tanstack/ai-react/ui";
import { Link } from "@tanstack/react-router";
import { FileText, Flag, LoaderCircle } from "lucide-react";
import { ChatText } from "./ResumeAiMarkdown";
import type { ResumeAiChatOptions } from "./resume-ai-chat-options";

const roleLabels: Record<WrapUpResumeRole, string> = {
  created: "Created",
  edited: "Edited",
  inspiration: "Inspired by",
};

function parseArguments(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** History restored from storage can carry only the raw arguments. */
function readSummary(part: ToolProps<ResumeAiChatOptions, "wrap_up">["part"]): string | null {
  if (part.input?.summary) return part.input.summary;
  const parsed = wrapUpToolInputSchema.safeParse(parseArguments(part.arguments));
  return parsed.success ? parsed.data.summary : null;
}

export function ResumeAiWrapUpTool({ part }: ToolProps<ResumeAiChatOptions, "wrap_up">) {
  const summary = readSummary(part);
  const resumes = part.output?.resumes ?? [];

  if (!summary) {
    return (
      <p
        className="flex items-center gap-2 text-xs text-muted-foreground"
        data-test="resume-ai-wrap-up-pending"
      >
        <LoaderCircle className="size-3.5 animate-spin" />
        Wrapping up…
      </p>
    );
  }

  const created = resumes.filter((resume) => resume.role === "created");
  const related = resumes.filter((resume) => resume.role !== "created");

  return (
    <section
      className="flex flex-col gap-3 rounded-xl bg-base-200/50 p-3 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]"
      data-test="resume-ai-wrap-up"
    >
      <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
        <Flag className="size-3.5" />
        Wrap-up
      </p>
      <ChatText content={summary} />
      {created.map((resume) => (
        <CreatedResumeCard
          key={resume.resumeId}
          output={{ resumeId: resume.resumeId, name: resume.name }}
          dataTest="resume-ai-wrap-up-created"
        />
      ))}
      {related.length > 0 ? (
        <ul className="flex flex-col gap-1.5" data-test="resume-ai-wrap-up-resumes">
          {related.map((resume) => (
            <RelatedResumeLink key={`${resume.role}:${resume.resumeId}`} resume={resume} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function RelatedResumeLink({ resume }: { resume: WrapUpToolOutput["resumes"][number] }) {
  return (
    <li>
      <Link
        to="/resumes/$resumeId"
        params={{ resumeId: resume.resumeId }}
        search={{ tab: "edit" }}
        className="group flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-base-content/5"
        data-test={`resume-ai-wrap-up-${resume.role}`}
      >
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="shrink-0 rounded-full bg-base-content/8 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
          {roleLabels[resume.role]}
        </span>
        <span className="truncate font-medium text-foreground group-hover:text-primary">
          {resume.name}
        </span>
        {resume.note ? (
          <span className="truncate text-xs text-muted-foreground">· {resume.note}</span>
        ) : null}
      </Link>
    </li>
  );
}
