import { Button } from "@/components/ui/button";
import { asTemplateId } from "@/data-access-layer/event-sourced/assemble-resume-detail";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { useResumePdf } from "@/features/resume/use-resume-pdf";
import { cn } from "@/lib/utils";
import { useEventSourcedResumeDetail } from "@/routes/_dashboard/resumes/$resumeId/-hooks/use-event-sourced-resume-detail";
import { FileText, Loader2, Maximize2, Minimize2, PanelRightClose, X } from "lucide-react";

type ResumeDetail = NonNullable<ReturnType<typeof useEventSourcedResumeDetail>["detail"]>;

export type LivePreviewLayout = "panel" | "maximized" | "rail" | "sheet";

interface ResumeAiLivePreviewProps {
  resumeId: string;
  layout: LivePreviewLayout;
  onMinimize: () => void;
  onRestore: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function ResumeAiLivePreview({
  resumeId,
  layout,
  onMinimize,
  onRestore,
  onMaximize,
  onClose,
}: ResumeAiLivePreviewProps) {
  const { detail, isLoading } = useEventSourcedResumeDetail(resumeId);

  if (layout === "rail") {
    return (
      <div
        className="flex h-full flex-col items-center gap-2 border-l border-border/60 bg-base-200/40 py-2"
        data-test="resume-ai-preview-rail"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRestore}
          aria-label="Show résumé preview"
          data-test="resume-ai-preview-restore"
        >
          <FileText className="size-4" />
        </Button>
        <span className="text-base-content/60 text-xs [writing-mode:vertical-rl]">Preview</span>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col bg-base-100",
        layout !== "sheet" && "border-l border-border/60",
      )}
      aria-label="Live résumé preview"
      data-test="resume-ai-preview"
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <FileText className="text-base-content/50 size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {detail?.name ?? "Résumé preview"}
        </span>
        {layout === "panel" ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMinimize}
              aria-label="Minimize preview"
              data-test="resume-ai-preview-minimize"
            >
              <PanelRightClose className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMaximize}
              aria-label="Maximize preview"
              data-test="resume-ai-preview-maximize"
            >
              <Maximize2 className="size-4" />
            </Button>
          </>
        ) : null}
        {layout === "maximized" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRestore}
            aria-label="Show chat beside preview"
            data-test="resume-ai-preview-unmaximize"
          >
            <Minimize2 className="size-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close preview"
          data-test="resume-ai-preview-close"
        >
          <X className="size-4" />
        </Button>
      </header>
      {detail ? (
        <LivePreviewDocument detail={detail} />
      ) : (
        <div className="text-base-content/60 flex flex-1 items-center justify-center p-6 text-sm">
          {isLoading ? <Loader2 className="size-6 animate-spin" /> : "This résumé isn't available."}
        </div>
      )}
    </section>
  );
}

function LivePreviewDocument({ detail }: { detail: ResumeDetail }) {
  const templateId = asTemplateId(detail.templateId);
  const doc = resumeDetailToDocument({ ...detail, templateId });
  const { blobUrl, generating, fileLabel } = useResumePdf({
    doc,
    templateId,
    resumeName: detail.name,
    debounceMs: 800,
  });

  return (
    <div className="relative min-h-0 flex-1 bg-base-200/40 p-2">
      {blobUrl ? (
        <iframe
          src={`${blobUrl}#view=FitH`}
          title={fileLabel}
          className="h-full w-full rounded-md border bg-white"
          data-test="resume-ai-preview-iframe"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-base-content/40 size-6 animate-spin" />
        </div>
      )}
      {generating && blobUrl ? (
        <span
          className="bg-base-100/90 text-base-content/70 absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs shadow-sm"
          data-test="resume-ai-preview-updating"
        >
          <Loader2 className="size-3 animate-spin" />
          Updating
        </span>
      ) : null}
    </div>
  );
}
