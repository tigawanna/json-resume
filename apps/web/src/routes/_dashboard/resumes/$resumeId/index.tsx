import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { resumeDetailQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { replaceResumeDoc, updateResumeMeta } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import {
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type ResumeDocumentV1,
  type TemplateId,
} from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { PromptCopySection } from "./-components/PromptCopySection";
import { ResumeEditTab } from "./-components/ResumeEditTab";
import { ResumeJsonTab } from "./-components/ResumeJsonTab";
import { ResumePreviewTab } from "./-components/ResumePreviewTab";

export const Route = createFileRoute("/_dashboard/resumes/$resumeId/")({
  component: ResumeWorkbench,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(resumeDetailQueryOptions(params.resumeId)),
  head: () => ({
    meta: [{ title: "Edit Resume", description: "Resume workbench" }],
  }),
});

// ─── Template Picker ────────────────────────────────────────

const TEMPLATE_DESCRIPTIONS: Record<TemplateId, string> = {
  classic: "Single column, centered headings",
  sidebar: "Two columns — main left, sidebar right",
  accent: "Single column with warm accent",
  modern: "Two columns with cool accent",
};

function TemplatePicker({
  selected,
  onSelect,
}: {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-test="template-picker">
      <h2 className="text-sm font-medium">Template</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATE_IDS.map((tid) => (
          <button
            key={tid}
            type="button"
            onClick={() => onSelect(tid)}
            className={twMerge(
              "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors",
              tid === selected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30",
            )}
            data-test={`template-${tid}`}
          >
            <span className="text-sm font-semibold">{TEMPLATE_LABELS[tid]}</span>
            <span className="text-muted-foreground text-xs">{TEMPLATE_DESCRIPTIONS[tid]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Workbench ──────────────────────────────────────────────

function ResumeWorkbench() {
  const { resumeId } = Route.useParams();
  const { data: resume } = useSuspenseQuery(resumeDetailQueryOptions(resumeId));

  if (!resume) {
    return <p className="text-muted-foreground py-8 text-center">Resume not found.</p>;
  }

  return <ResumeWorkbenchInner resume={resume} />;
}

function ResumeWorkbenchInner({ resume }: { resume: ResumeDetailDTO }) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    resume.templateId as TemplateId,
  );
  const [pendingDoc, setPendingDoc] = useState<ResumeDocumentV1 | null>(null);
  const initialTemplateRef = useRef(resume.templateId);

  const hasUnsavedChanges = pendingDoc !== null || selectedTemplate !== initialTemplateRef.current;

  // When resume data updates from server, reset pending state
  useEffect(() => {
    initialTemplateRef.current = resume.templateId;
    setSelectedTemplate(resume.templateId as TemplateId);
    setPendingDoc(null);
  }, [resume.id, resume.templateId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<unknown>[] = [];

      if (selectedTemplate !== initialTemplateRef.current) {
        promises.push(updateResumeMeta({ data: { id: resume.id, templateId: selectedTemplate } }));
      }

      if (pendingDoc) {
        promises.push(replaceResumeDoc({ data: { id: resume.id, doc: pendingDoc } }));
      }

      await Promise.all(promises);
    },
    onSuccess() {
      initialTemplateRef.current = selectedTemplate;
      setPendingDoc(null);
      toast.success("Resume saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const doc = pendingDoc ?? resumeDetailToDocument(resume);

  function handleImportDoc(imported: ResumeDocumentV1) {
    setPendingDoc(imported);
    setSelectedTemplate(imported.meta.templateId);
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-24" data-test="resume-workbench">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{resume.name}</h1>
          {resume.headline && (
            <p className="text-muted-foreground mt-1 text-sm">{resume.headline}</p>
          )}
        </div>
      </div>

      {/* Template Picker */}
      <TemplatePicker selected={selectedTemplate} onSelect={setSelectedTemplate} />

      {/* Tabs + Save */}
      <Tabs defaultValue="edit" className="w-full">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="flex-1">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="prompt">LLM Prompt</TabsTrigger>
          </TabsList>

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasUnsavedChanges}
            className="gap-2"
            size="sm"
            data-test="resume-save-button"
          >
            <Save className="size-4" />
            {saveMutation.isPending ? "Saving..." : hasUnsavedChanges ? "Save changes" : "Saved"}
          </Button>
        </div>

        <TabsContent value="edit" className="mt-4">
          <ResumeEditTab resume={resume} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ResumePreviewTab resume={resume} templateId={selectedTemplate} />
        </TabsContent>

        <TabsContent value="json" className="mt-4">
          <ResumeJsonTab resume={resume} onImport={handleImportDoc} />
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <div className="mx-auto max-w-3xl">
            <PromptCopySection doc={doc} jobDescription={resume.jobDescription} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
