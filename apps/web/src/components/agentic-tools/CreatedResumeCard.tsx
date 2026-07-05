import { Button } from "@/components/ui/button";
import type { CreatedResumeOutput } from "@/features/agentic-tools/created-resume-output";
import { Link } from "@tanstack/react-router";
import { Box, ExternalLink } from "lucide-react";

interface CreatedResumeCardProps {
  output: CreatedResumeOutput;
  dataTest?: string;
}

export function CreatedResumeCard({
  output,
  dataTest = "created-resume-card",
}: CreatedResumeCardProps) {
  return (
    <div
      className="rounded-lg bg-[color-mix(in_oklch,var(--color-success)_9%,var(--color-base-100))] p-3 text-sm ring-1 ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]"
      data-test={dataTest}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <Box className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {output.name ?? "New resume draft"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Created and ready to review.</p>
        </div>
        <Button asChild size="sm" className="h-8 shrink-0 gap-1.5 rounded-lg">
          <Link
            to="/resumes/$resumeId"
            params={{ resumeId: output.resumeId }}
            search={{ tab: "edit" }}
            data-test="open-created-resume"
          >
            Open
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
