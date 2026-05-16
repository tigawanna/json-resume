import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { ResumeAiRole } from "./resume-ai-types";

function renderInlineMarkdown(text: string, role: ResumeAiRole, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const token = match[0];
    const key = `${keyPrefix}-inline-${matchIndex}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className={cn(
            "rounded px-1.5 py-0.5 text-[0.82em]",
            role === "user"
              ? "bg-primary-foreground/15 text-primary-foreground"
              : "bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] text-foreground",
          )}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "font-medium underline underline-offset-2",
              role === "user" ? "text-primary-foreground" : "text-primary",
            )}
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = match.index + token.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : text;
}

export function ChatText({ content, role }: { content: string; role: ResumeAiRole }) {
  const nodes: ReactNode[] = [];
  const lines = content.split("\n");
  let codeFence: { language: string; lines: string[] } | null = null;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    const key = `${index}-${trimmed.slice(0, 20)}`;

    if (trimmed.startsWith("```")) {
      if (codeFence) {
        nodes.push(
          <pre
            key={`${key}-code`}
            className="my-2 max-w-full overflow-x-auto rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] px-3 py-2 text-xs leading-5 text-foreground"
          >
            {codeFence.language && (
              <span className="mb-2 block text-[0.68rem] uppercase text-muted-foreground">
                {codeFence.language}
              </span>
            )}
            <code>{codeFence.lines.join("\n")}</code>
          </pre>,
        );
        codeFence = null;
      } else {
        codeFence = { language: trimmed.slice(3).trim(), lines: [] };
      }
      continue;
    }

    if (codeFence) {
      codeFence.lines.push(line);
      continue;
    }

    if (!trimmed) {
      nodes.push(<div key={key} className="h-1" />);
      continue;
    }

    if (trimmed === "---") {
      nodes.push(
        <div
          key={key}
          className="my-3 h-px bg-[color-mix(in_oklch,currentColor_18%,transparent)]"
        />,
      );
      continue;
    }

    if (trimmed.startsWith("#")) {
      const contentText = trimmed.replace(/^#{1,3}\s+/, "");
      nodes.push(
        <h3 key={key} className="pt-2 text-base font-semibold">
          {renderInlineMarkdown(contentText, role, key)}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      nodes.push(
        <blockquote
          key={key}
          className="rounded-md border-l-2 border-[color-mix(in_oklch,currentColor_42%,transparent)] bg-[color-mix(in_oklch,currentColor_7%,transparent)] px-3 py-2"
        >
          {renderInlineMarkdown(trimmed.replace(/^>\s?/, ""), role, key)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const isNumbered = /^\d+\.\s+/.test(trimmed);
      nodes.push(
        <div
          key={key}
          className={cn(
            "grid gap-2",
            isNumbered ? "grid-cols-[1.5rem_1fr]" : "grid-cols-[0.75rem_1fr]",
          )}
        >
          <span
            className={
              isNumbered
                ? "text-xs font-semibold opacity-55"
                : "mt-[0.6rem] size-1.5 rounded-full bg-current opacity-45"
            }
          >
            {isNumbered ? trimmed.match(/^\d+\./)?.[0] : ""}
          </span>
          <span>{renderInlineMarkdown(trimmed.replace(/^([-*]|\d+\.)\s+/, ""), role, key)}</span>
        </div>,
      );
      continue;
    }

    nodes.push(
      <p key={key} className="whitespace-pre-wrap">
        {renderInlineMarkdown(trimmed, role, key)}
      </p>,
    );
  }

  if (codeFence) {
    nodes.push(
      <pre
        key="open-code-fence"
        className="my-2 max-w-full overflow-x-auto rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] px-3 py-2 text-xs leading-5 text-foreground"
      >
        {codeFence.language && (
          <span className="mb-2 block text-[0.68rem] uppercase text-muted-foreground">
            {codeFence.language}
          </span>
        )}
        <code>{codeFence.lines.join("\n")}</code>
      </pre>,
    );
  }

  return (
    <div
      className={cn(
        "space-y-1.5 text-sm leading-6",
        role === "user" ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {nodes}
    </div>
  );
}
