import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { createHighlighter } from "@tanstack/highlight/core";
import * as languages from "@tanstack/highlight/languages";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import { streamingMarkdownExtension } from "@tanstack/markdown/extensions/streaming";
import {
  Markdown,
  type MarkdownComponentProps,
  type MarkdownComponents,
} from "@tanstack/markdown/react";
import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
const extensions = [streamingMarkdownExtension()];

function CodeBlock({ className, ...props }: MarkdownComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preRef.current?.textContent ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err: unknown) {
      toast.error("Could not copy code", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <div className="group/code relative my-3">
      <pre
        {...props}
        ref={preRef}
        className={cn(
          "th-code overflow-x-auto rounded-lg text-xs leading-5 ring-1 ring-[color-mix(in_oklch,currentColor_12%,transparent)]",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={copied ? "Copied" : "Copy code"}
        title={copied ? "Copied" : "Copy code"}
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-(--th-background) text-(--th-token) opacity-0 ring-1 ring-[color-mix(in_oklch,currentColor_15%,transparent)] transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
        data-test="resume-ai-code-copy"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

const components = {
  h1: (props) => (
    <h1 {...props} className="mt-5 mb-2 text-lg leading-7 font-semibold tracking-tight" />
  ),
  h2: (props) => (
    <h2
      {...props}
      className="mt-5 mb-2 border-b border-[color-mix(in_oklch,currentColor_12%,transparent)] pb-1 text-base leading-6 font-semibold tracking-tight"
    />
  ),
  h3: (props) => <h3 {...props} className="mt-4 mb-1.5 text-sm leading-6 font-semibold" />,
  h4: (props) => <h4 {...props} className="mt-3 mb-1 text-sm leading-6 font-medium" />,
  h5: (props) => (
    <h5
      {...props}
      className="mt-3 mb-1 text-xs leading-5 font-semibold tracking-wide uppercase opacity-80"
    />
  ),
  h6: (props) => (
    <h6
      {...props}
      className="mt-3 mb-1 text-xs leading-5 font-medium tracking-wide uppercase opacity-70"
    />
  ),
  p: (props) => <p {...props} className="my-2" />,
  ul: (props) => <ul {...props} className="my-2 list-disc space-y-1 pl-5 marker:text-current/50" />,
  ol: (props) => (
    <ol {...props} className="my-2 list-decimal space-y-1 pl-5 marker:text-current/60" />
  ),
  li: (props) => (
    <li
      {...props}
      className="pl-0.5 [&>ol]:my-1 [&>p]:my-1 [&>ul]:my-1 [&>input]:mr-1.5 [&>input]:align-middle"
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...props}
      className="my-3 border-l-2 border-[color-mix(in_oklch,currentColor_25%,transparent)] pl-3 italic opacity-85"
    />
  ),
  hr: (props) => (
    <hr {...props} className="my-4 border-[color-mix(in_oklch,currentColor_12%,transparent)]" />
  ),
  a: (props) => {
    const external = /^https?:\/\//.test(props.href ?? "");
    return (
      <a
        {...props}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="font-medium wrap-anywhere text-primary underline decoration-current/40 underline-offset-2 hover:decoration-current"
      />
    );
  },
  strong: (props) => <strong {...props} className="font-semibold" />,
  pre: CodeBlock,
  code: ({ className, ...props }) => (
    <code
      {...props}
      className={cn(
        className?.startsWith("language-")
          ? "font-mono"
          : "th-code-inline rounded bg-[color-mix(in_oklch,currentColor_8%,transparent)] px-1 py-0.5 font-mono text-[0.85em] wrap-anywhere",
        className,
      )}
    />
  ),
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
    <div
      className={cn(
        "resume-ai-markdown text-sm leading-6 wrap-break-word *:first:mt-0 *:last:mb-0",
      )}
    >
      <style href="resume-ai-highlight-theme" precedence="default">
        {themeCss}
      </style>
      <Markdown
        highlighter={highlighter}
        components={components}
        extensions={extensions}
        headingIds={false}
      >
        {content}
      </Markdown>
    </div>
  );
}
