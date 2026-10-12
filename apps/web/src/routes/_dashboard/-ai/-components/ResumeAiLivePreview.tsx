import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { RESUME_PAPER_WIDTH, ResumeComponentPaper } from "@/features/resume/ResumeComponentPaper";
import { resumeDocumentToSpec } from "@/features/resume/resume-to-spec";
import { useThemeContext } from "@/lib/tanstack/router/theme-provider";
import { cn } from "@/lib/utils";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
  useWorkbenchTemplate,
} from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import type { AiPreviewView } from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/resume-workbench-store";
import { useEventSourcedResumeDetail } from "@/routes/_dashboard/resumes/$resumeId/-hooks/use-event-sourced-resume-detail";
import {
  Eye,
  FileText,
  GitCompareArrows,
  Loader2,
  Mail,
  Maximize2,
  Minimize2,
  PanelRightClose,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { diffResumeJson, resumeDetailJson } from "../-utils/resume-json-diff";
import { ResumeAiCoverLetterPreview } from "./ResumeAiCoverLetterPreview";

type ResumeDetail = NonNullable<ReturnType<typeof useEventSourcedResumeDetail>["detail"]>;

export type LivePreviewLayout = "panel" | "maximized" | "rail" | "sheet";

function isLivePreviewView(value: string): value is AiPreviewView {
  return value === "preview" || value === "changes" || value === "cover-letter";
}

interface ResumeAiLivePreviewProps {
  layout: LivePreviewLayout;
  onMinimize: () => void;
  onRestore: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function ResumeAiLivePreview({
  layout,
  onMinimize,
  onRestore,
  onMaximize,
  onClose,
}: ResumeAiLivePreviewProps) {
  const resumeId = useResumeWorkbench((state) => state.ai.activeResumeId ?? state.resumeId);
  const isPageResume = useResumeWorkbench((state) => state.resumeId === resumeId);
  const baselineJson = useResumeWorkbench((state) => state.ai.turnBaselines[resumeId]);
  const view = useResumeWorkbench((state) => state.ai.previewView);
  const coverLetterId = useResumeWorkbench((state) => state.ai.coverLetterId);
  const { setPreviewView } = useResumeWorkbenchActions();
  const pageTemplate = useWorkbenchTemplate();
  const { detail, isLoading } = useEventSourcedResumeDetail(resumeId);
  const templateId = isPageResume ? pageTemplate.templateId : detail?.templateId;

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

  const currentJson = detail ? resumeDetailJson(detail) : null;
  const diff =
    baselineJson !== undefined && currentJson !== null
      ? diffResumeJson(baselineJson, currentJson)
      : null;

  return (
    <Tabs
      value={view}
      onValueChange={(value) => {
        if (isLivePreviewView(value)) setPreviewView(value);
      }}
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 bg-base-100",
        layout !== "sheet" && "border-l border-border/60",
      )}
      aria-label="Live résumé preview"
      data-test="resume-ai-preview"
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {detail?.name ?? "Résumé preview"}
        </span>
        <TabsList className="h-8">
          <TabsTrigger
            value="preview"
            className="gap-1.5 text-xs"
            data-test="resume-ai-preview-tab"
          >
            <Eye className="size-3.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="changes"
            className="gap-1.5 text-xs"
            data-test="resume-ai-changes-tab"
          >
            <GitCompareArrows className="size-3.5" />
            Changes
            {diff && diff.hunks.length > 0 ? (
              <span className="font-mono text-[0.7rem]">
                <span className="text-success">+{diff.added}</span>{" "}
                <span className="text-error">−{diff.removed}</span>
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="cover-letter"
            className="gap-1.5 text-xs"
            data-test="resume-ai-cover-letter-tab"
          >
            <Mail className="size-3.5" />
            Letter
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center">
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
        </div>
      </header>
      {view === "cover-letter" ? (
        <TabsContent value="cover-letter" className="mt-0 min-h-0 flex-1">
          <ResumeAiCoverLetterPreview coverLetterId={coverLetterId} resumeId={resumeId} />
        </TabsContent>
      ) : detail && templateId ? (
        <>
          <TabsContent value="preview" className="mt-0 min-h-0 flex-1">
            <LivePreviewPaper detail={{ ...detail, templateId }} />
          </TabsContent>
          <TabsContent value="changes" className="mt-0 min-h-0 flex-1">
            <LivePreviewChanges diff={diff} />
          </TabsContent>
        </>
      ) : (
        <div className="text-base-content/60 flex flex-1 items-center justify-center p-6 text-sm">
          {isLoading ? <Loader2 className="size-6 animate-spin" /> : "This résumé isn't available."}
        </div>
      )}
    </Tabs>
  );
}

function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

function LivePreviewPaper({ detail }: { detail: ResumeDetail }) {
  const { resolvedTheme } = useThemeContext();
  const [frameRef, frameWidth] = useElementWidth();
  const spec = resumeDocumentToSpec(resumeDetailToDocument(detail), detail.templateId);
  const zoom = frameWidth > 0 ? Math.min(1, frameWidth / RESUME_PAPER_WIDTH) : 1;

  return (
    <div className="h-full overflow-auto bg-base-200/40 p-3" data-test="resume-ai-preview-paper">
      <div ref={frameRef} className={cn(frameWidth === 0 && "invisible")}>
        <div style={{ zoom }}>
          <ResumeComponentPaper
            spec={spec}
            theme={resolvedTheme}
            className="rounded-sm bg-base-100 shadow-sm ring-1 ring-base-content/10"
          />
        </div>
      </div>
    </div>
  );
}

function LivePreviewChanges({ diff }: { diff: ReturnType<typeof diffResumeJson> | null }) {
  if (!diff || diff.hunks.length === 0) {
    return (
      <p
        className="text-base-content/60 flex h-full items-center justify-center p-6 text-center text-sm"
        data-test="resume-ai-changes-empty"
      >
        {diff
          ? "No changes to this résumé since your last message."
          : "Send a message and the assistant's edits to this résumé show up here."}
      </p>
    );
  }

  return (
    <div className="h-full overflow-auto" data-test="resume-ai-changes">
      <p className="text-base-content/60 border-b border-border/60 px-3 py-2 text-xs">
        Résumé JSON since your last message
      </p>
      <div className="font-mono text-xs leading-5">
        {diff.hunks.map((hunk) => (
          <div key={`${hunk.oldStart}:${hunk.newStart}`} className="border-b border-border/40">
            <div className="text-base-content/50 bg-base-200/60 px-3 py-0.5">
              Line {hunk.newStart}
            </div>
            {hunk.lines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  "flex px-3 whitespace-pre-wrap break-all",
                  line.kind === "add" && "bg-success/10 text-success",
                  line.kind === "remove" && "bg-error/10 text-error",
                  line.kind === "context" && "text-base-content/70",
                )}
                data-test={`resume-ai-changes-${line.kind}`}
              >
                <span className="w-4 shrink-0 select-none opacity-60">
                  {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}
                </span>
                <span className="min-w-0">{line.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
