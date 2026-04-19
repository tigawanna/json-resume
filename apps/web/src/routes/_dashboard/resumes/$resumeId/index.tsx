import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { resumeDetailQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { replaceResumeDoc, updateResumeMeta } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import {
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type ResumeDocumentV1,
  type TemplateId,
} from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useState } from "react";
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
  ssr:false
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
            data-test={`template-${tid}`}>
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
  const { data: serverResume } = useSuspenseQuery(resumeDetailQueryOptions(resumeId));

  // Read reactively from the collection (on-demand fetch triggered by the where clause)
  const { data: resume } = useLiveQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    (serverResume?.templateId as TemplateId) ?? "classic",
  );
  const [initialTemplateId] = useState<TemplateId>(
    (serverResume?.templateId as TemplateId) ?? "classic",
  );
  const [pendingDoc, setPendingDoc] = useState<ResumeDocumentV1 | null>(null);

  const displayResume = resume ?? serverResume;

  if (!displayResume) {
    return <p className="text-muted-foreground py-8 text-center">Resume not found.</p>;
  }

  const doc = pendingDoc ?? resumeDetailToDocument(displayResume);
  const hasUnsavedChanges = pendingDoc !== null || selectedTemplate !== initialTemplateId;

  return (
    <ResumeWorkbenchInner
      resumeId={resumeId}
      resume={displayResume}
      selectedTemplate={selectedTemplate}
      setSelectedTemplate={setSelectedTemplate}
      pendingDoc={pendingDoc}
      setPendingDoc={setPendingDoc}
      doc={doc}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
}

interface ResumeWorkbenchInnerProps {
  resumeId: string;
  resume: ResumeDetailDTO;
  selectedTemplate: TemplateId;
  setSelectedTemplate: (t: TemplateId) => void;
  pendingDoc: ResumeDocumentV1 | null;
  setPendingDoc: (doc: ResumeDocumentV1 | null) => void;
  doc: ResumeDocumentV1;
  hasUnsavedChanges: boolean;
}

function ResumeWorkbenchInner({
  resumeId,
  resume,
  selectedTemplate,
  setSelectedTemplate,
  pendingDoc,
  setPendingDoc,
  doc,
  hasUnsavedChanges,
}: ResumeWorkbenchInnerProps) {
  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<unknown>[] = [];

      if (selectedTemplate !== (resume.templateId as TemplateId)) {
        promises.push(updateResumeMeta({ data: { id: resumeId, templateId: selectedTemplate } }));
      }

      if (pendingDoc) {
        promises.push(replaceResumeDoc({ data: { id: resumeId, doc: pendingDoc } }));
      }

      await Promise.all(promises);
    },
    onSuccess() {
      setPendingDoc(null);
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        templateId: selectedTemplate,
      });
      toast.success("Resume saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

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
            data-test="resume-save-button">
            <Save className="size-4" />
            {saveMutation.isPending ? "Saving..." : hasUnsavedChanges ? "Save changes" : "Saved"}
          </Button>
        </div>

        <TabsContent value="edit" forceMount className="mt-4 data-[state=inactive]:hidden">
          <ResumeEditTab resumeId={resumeId} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ResumePreviewTab resumeId={resumeId} selectedTemplate={selectedTemplate} doc={doc} />
        </TabsContent>

        <TabsContent value="json" forceMount className="mt-4 data-[state=inactive]:hidden">
          <ResumeJsonTab
            resumeId={resumeId}
            setPendingDoc={setPendingDoc}
            setSelectedTemplate={setSelectedTemplate}
          />
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <PromptTab resumeId={resumeId} doc={doc} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PromptTab({ resumeId, doc }: { resumeId: string; doc: ResumeDocumentV1 }) {
  const { data: resume } = useLiveQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PromptCopySection doc={doc} jobDescription={resume?.jobDescription ?? ""} />
    </div>
  );
}
