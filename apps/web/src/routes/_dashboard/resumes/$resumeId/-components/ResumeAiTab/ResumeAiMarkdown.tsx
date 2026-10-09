import { cn } from "@/lib/utils";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";
import { createHighlighter } from "@tanstack/highlight/core";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import * as languages from "@tanstack/highlight/languages";
import type { ResumeAiRole } from "./resume-ai-types";

const highlighter = createTanStackMarkdownHighlighter(
  createHighlighter({
    languages: Object.values(languages),
  }),
);

const components = {
  table: (props) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg ring-1 ring-[color-mix(in_oklch,currentColor_14%,transparent)]">
      <table {...props} className="w-full border-collapse text-left text-xs" />
    </div>
  ),
  thead: (props) => (
    <thead {...props} className="bg-[color-mix(in_oklch,currentColor_7%,transparent)]" />
  ),
  th: (props) => (
    <th
      {...props}
      className="border-b border-[color-mix(in_oklch,currentColor_14%,transparent)] px-3 py-2 align-top font-semibold"
    />
  ),
  td: (props) => (
    <td
      {...props}
      className="border-t border-[color-mix(in_oklch,currentColor_10%,transparent)] px-3 py-2 align-top"
    />
  ),
} satisfies MarkdownComponents;

export function ChatText({ content, role }: { content: string; role: ResumeAiRole }) {
  return (
    <div
      className={cn(
        "resume-ai-markdown space-y-2 text-sm leading-6 wrap-break-word",
        role === "user" ? "text-primary-foreground" : "text-foreground",
      )}
    >
      <Markdown highlighter={highlighter} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
