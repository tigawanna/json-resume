import { resumeRegistry } from "@/features/resume/resume-catalog";
import { cn } from "@/lib/utils";
import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";

/** A4 at 96 dpi, the size the component templates are laid out for. */
export const RESUME_PAPER_WIDTH = 794;
const RESUME_PAPER_MIN_HEIGHT = 1123;

export function ResumeComponentPaper({
  spec,
  theme,
  className,
}: {
  spec: Spec;
  theme: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto text-base-content", theme === "dark" && "dark", className)}
      style={{ width: RESUME_PAPER_WIDTH, minHeight: RESUME_PAPER_MIN_HEIGHT }}
      data-theme={theme}
    >
      <JSONUIProvider registry={resumeRegistry}>
        <Renderer spec={spec} registry={resumeRegistry} />
      </JSONUIProvider>
    </div>
  );
}
