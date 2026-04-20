import { ResumeJsonTab } from "@/components/resume/resume-json-editor";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { resumeDetailQueryOptions, resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { updateResumeMeta } from "@/data-access-layer/resume/resume.functions";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { TemplateId } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { File, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { NewResumeButton } from "../-components/NewResumeButton";
import { PromptTab } from "./-components/PromptTab";
import { ResumeEditTab } from "./-components/ResumeEditTab";
import { ResumePreviewTab } from "./-components/ResumePreviewTab";
import { TemplatePicker } from "./-components/TemplatePicker";

const tabsList = ["edit", "preview", "json", "prompt"] as const;
const tabSchema = z.enum(tabsList).default("edit").catch("edit");

export const Route = createFileRoute("/_dashboard/resumes/$resumeId/")({
  component: RouteComponent,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(resumeDetailQueryOptions(params.resumeId)),
  head: () => ({
    meta: [{ title: "Edit Resume", description: "Resume workbench" }],
  }),
  validateSearch: (search) => z.object({ tab: tabSchema }).parse(search),
  ssr: false,
});

// ─── Route Component ────────────────────────────────────────

function RouteComponent() {
  const { resumeId } = Route.useParams();
  const { data: serverResume } = useSuspenseQuery(resumeDetailQueryOptions(resumeId));

  const { data: resume } = useLiveSuspenseQuery((q) =>
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

  const router = useRouter();
  const { tab } = Route.useSearch();

  function navigateToTab(value: string) {
    void router.navigate({
      to: ".",
      search: (prev) => ({ ...prev, tab: value as z.infer<typeof tabSchema> }),
      replace: true,
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateResumeMeta({ data: { id: resumeId, templateId: selectedTemplate } });
    },
   async onSuccess(_,__,___,ctx) {
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        templateId: selectedTemplate,
      });
     await ctx.client.invalidateQueries(resumeListQueryOptions)
      toast.success("Template saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const displayResume = resume ?? serverResume;

  if (!displayResume) {
    return <p className="text-muted-foreground py-8 text-center">Resume not found.</p>;
  }

  const doc = resumeDetailToDocument(displayResume);
  const hasTemplateChange = selectedTemplate !== initialTemplateId;

  if (!resume) {
    return (
      <div className="flex w-full h-screen flex-col gap-6 pb-24">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <File />
            </EmptyMedia>
            <EmptyTitle>Resume not found</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t created any resumes yet. Get started by creating your first resume.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <NewResumeButton />
          </EmptyContent>
        </Empty>
      </div>
    );
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
      <Tabs value={tab} onValueChange={navigateToTab} className="w-full">
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
            disabled={saveMutation.isPending || !hasTemplateChange}
            className="gap-2"
            size="sm"
            data-test="resume-save-button">
            <Save className="size-4" />
            {saveMutation.isPending ? "Saving..." : hasTemplateChange ? "Save template" : "Saved"}
          </Button>
        </div>

        <TabsContent value="edit" forceMount className="mt-4 data-[state=inactive]:hidden">
          <ResumeEditTab resumeId={resumeId} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ResumePreviewTab resumeId={resumeId} selectedTemplate={selectedTemplate} doc={doc} />
        </TabsContent>

        <TabsContent value="json" forceMount className="mt-4 data-[state=inactive]:hidden">
          <ResumeJsonTab resumeId={resumeId} />
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <PromptTab resumeId={resumeId} doc={doc} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
