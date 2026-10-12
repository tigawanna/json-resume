import { cn } from "@/lib/utils";
import { Markdown, type MarkdownComponents } from "@tanstack/markdown/react";
import { letterMarkdown } from "./cover-letter-format";

const components = {
  h1: (props) => <h1 {...props} className="mb-3 text-xl font-semibold" />,
  h2: (props) => <h2 {...props} className="mt-2 mb-2 text-lg font-semibold" />,
  h3: (props) => <h3 {...props} className="mb-1.5 font-semibold" />,
  p: (props) => <p {...props} className="mb-4" />,
  ul: (props) => <ul {...props} className="mb-4 list-disc space-y-1 pl-6" />,
  ol: (props) => <ol {...props} className="mb-4 list-decimal space-y-1 pl-6" />,
  blockquote: (props) => (
    <blockquote {...props} className="mb-4 border-l-2 border-base-content/20 pl-3 italic" />
  ),
  hr: (props) => <hr {...props} className="my-4 border-base-content/15" />,
  a: (props) => <a {...props} className="text-primary underline underline-offset-2" />,
  strong: (props) => <strong {...props} className="font-semibold" />,
} satisfies MarkdownComponents;

interface CoverLetterPaperProps {
  body: string;
  className?: string;
}

/** The letter on a letter-sized sheet, rendered from the same markdown as the PDF. */
export function CoverLetterPaper({ body, className }: CoverLetterPaperProps) {
  return (
    <article
      className={cn(
        "mx-auto w-full max-w-204 rounded-sm bg-base-100 px-8 py-10 text-[15px] leading-7 text-base-content shadow-sm ring-1 ring-base-content/10 sm:px-16 sm:py-14",
        className,
      )}
      data-test="cover-letter-paper"
    >
      {body.trim() ? (
        <div className="*:last:mb-0">
          <Markdown components={components} headingIds={false}>
            {letterMarkdown(body)}
          </Markdown>
        </div>
      ) : (
        <p className="text-base-content/50 italic">This cover letter is empty.</p>
      )}
    </article>
  );
}
