import { cn } from "@/lib/utils";
import { createHighlighter } from "@tanstack/highlight/core";
import * as languages from "@tanstack/highlight/languages";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";
import type { ResumeAiRole } from "./resume-ai-types";

import { createThemeCss } from "@tanstack/highlight/theme";
import { githubDarkTheme } from "@tanstack/highlight/themes/github-dark";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

const themeCss = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
  darkSelector: ".dark",
});
const highlighter = createTanStackMarkdownHighlighter(
  createHighlighter({
    languages: Object.values(languages),
  }),
);

// TODO the code highlighting just doent work as expected, it should be fixed it might have smeting todo with @apps/web/src/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiMessage.tsx:111

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

export function ChatText({ content }: { content: string; role: ResumeAiRole }) {
  return (
    <div className={cn("resume-ai-markdown space-y-2 text-sm leading-6 wrap-break-word")}>
      <style>{themeCss}</style>
      <Markdown highlighter={highlighter} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
