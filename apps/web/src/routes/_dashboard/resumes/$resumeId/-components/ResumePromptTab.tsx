import { PromptCopySection } from "@/components/resume/PromptCopySection";
import { useResumeImport } from "@/components/resume/resume-import/use-resume-import";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { useSessionStorage } from "@/hooks/use-storage";
import { ArrowRight, TriangleAlert, X } from "lucide-react";

interface ResumePromptTabProps {
  doc: ResumeDocumentV1;
  jobDescription: string;
  onImported: () => void;
  onAddTargetJob: () => void;
}

/** Copy a tailoring prompt for any external LLM, then paste its JSON back to reconcile it. */
export function ResumePromptTab({
  doc,
  jobDescription,
  onImported,
  onAddTargetJob,
}: ResumePromptTabProps) {
  const workspace = useResumeWorkspace();
  const { importDocument, isImporting, reviewDialog } = useResumeImport(workspace, {
    onApplied: onImported,
  });
  const [noJobDismissed, setNoJobDismissed] = useSessionStorage(
    "resume-prompt-no-target-job-dismissed",
    false,
  );

  return (
    <div className="flex flex-col gap-4" data-test="resume-prompt-tab">
      {jobDescription.trim() || noJobDismissed ? null : (
        <div
          role="status"
          className="border-warning/40 bg-warning/10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border py-1.5 pr-1.5 pl-3 text-xs"
          data-test="prompt-no-target-job"
        >
          <TriangleAlert className="text-warning size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="text-warning font-medium">No target job linked.</span>{" "}
            <span className="text-muted-foreground">
              The prompt won&apos;t be tailored to a role.
            </span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-warning/40 h-7 gap-1 text-xs"
              onClick={onAddTargetJob}
              data-test="prompt-add-target-job"
            >
              Add target job
              <ArrowRight className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setNoJobDismissed(true)}
              aria-label="Dismiss"
              data-test="prompt-no-target-job-dismiss"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      <PromptCopySection
        doc={doc}
        jobDescription={jobDescription}
        onApplyResult={importDocument}
        isApplying={isImporting}
      />
      {reviewDialog}
    </div>
  );
}
