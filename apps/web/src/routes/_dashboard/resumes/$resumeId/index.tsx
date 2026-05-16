import { ResumeJsonTab } from "@/components/resume/resume-json-editor";
import { ResumeWorkspaceProvider } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { createRemoteResumeWorkspace } from "@/components/resume/resume-workspace/remote-resume-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { resumeAiChatQueryOptions } from "@/data-access-layer/resume/ai-chat/ai-chat.query-options";
import { resumeDetailQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { replaceResumeDoc } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { safeParseResumeJson, TemplateId } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, File, FileUp, FileX, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { NewResumeButton } from "../-components/NewResumeButton";
import { ResumeAiTab } from "./-components/ResumeAiTab";
import { PromptTab } from "./-components/PromptTab";
import { ResumeEditTab } from "./-components/ResumeEditTab";
import { ResumePreviewTab } from "./-components/ResumePreviewTab";
import { TemplatePicker } from "./-components/TemplatePicker";

const tabsList = ["edit", "preview", "json", "prompt", "ai"] as const;
const tabSchema = z.enum(tabsList).default("edit").catch("edit");

export const Route = createFileRoute("/_dashboard/resumes/$resumeId/")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const [resume] = await Promise.all([
      context.queryClient.ensureQueryData(resumeDetailQueryOptions(params.resumeId)),
      context.queryClient
        .ensureQueryData(resumeAiChatQueryOptions(params.resumeId))
        .catch(() => null),
    ]);
    return resume;
  },
  head: () => ({
    meta: [{ title: "Edit Resume", description: "Resume workbench" }],
  }),
  validateSearch: (search) => z.object({ tab: tabSchema }).parse(search),
  ssr: false,
});

// ─── Route Component ────────────────────────────────────────

function RouteComponent() {
  const { resumeId } = Route.useParams();
  return <ResumeWorkbench key={resumeId} resumeId={resumeId} />;
}

// ─── Workbench ───────────────────────────────────────────────
// useLiveSuspenseQuery is the first hook so the interactive UI is only
// mounted after resumeCollection is in ready state for this resumeId.

interface ResumeWorkbenchProps {
  resumeId: string;
}

function ResumeWorkbench({ resumeId }: ResumeWorkbenchProps) {
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const { data: serverResume } = useSuspenseQuery(resumeDetailQueryOptions(resumeId));
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    (serverResume?.templateId as TemplateId) ?? "classic",
  );
  const [initialTemplateId] = useState<TemplateId>(
    (serverResume?.templateId as TemplateId) ?? "classic",
  );
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const router = useRouter();
  const { tab } = Route.useSearch();

  function navigateToTab(value: string) {
    void router.navigate({
      to: ".",
      search: (prev) => ({ ...prev, tab: value as z.infer<typeof tabSchema> }),
      replace: true,
    });
  }

  const displayResume = (resume ?? serverResume) as ResumeDetailDTO | null;
  const workspace = displayResume ? createRemoteResumeWorkspace(displayResume) : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspace || !displayResume) {
        throw new Error("Resume not found");
      }
      await workspace.updateMetadata({
        name: displayResume.name,
        fullName: displayResume.fullName,
        headline: displayResume.headline,
        description: displayResume.description,
        jobDescription: displayResume.jobDescription,
        templateId: selectedTemplate,
      });
    },
    onSuccess() {
      toast.success("Template saved");
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError(err: unknown) {
      toast.error("Failed to save", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (jsonText: string) => {
      const result = safeParseResumeJson(jsonText);
      if (!result.ok) throw new Error(result.error);
      await replaceResumeDoc({ data: { id: resumeId, doc: result.data } });
    },
    onSuccess() {
      void resumeCollection.utils.refetch();
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume imported from JSON");
      setImportText("");
      setImportError(null);
      setImportOpen(false);
      navigateToTab("edit");
    },
    onError(err: unknown) {
      setImportError(unwrapUnknownError(err).message);
    },
  });

  if (!displayResume) {
    return (
      <EmptyStateScene>
        <Empty className="relative z-10 border border-border/40 bg-background/75 backdrop-blur-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileX />
            </EmptyMedia>
            <EmptyTitle>Resume not found</EmptyTitle>
            <EmptyDescription>
              This resume doesn&apos;t exist or may have been deleted. Double-check the link or
              start fresh.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.history.back()}>
              <ArrowLeft className="size-4" />
              Go back
            </Button>
            <NewResumeButton />
          </EmptyContent>
        </Empty>
      </EmptyStateScene>
    );
  }
  if (!workspace) {
    return <p className="text-muted-foreground py-8 text-center">Resume workspace unavailable.</p>;
  }

  const doc = resumeDetailToDocument(displayResume);
  const hasTemplateChange = selectedTemplate !== initialTemplateId;

  if (!resume) {
    return (
      <EmptyStateScene>
        <Empty className="relative z-10 border border-border/40 bg-background/75 backdrop-blur-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <File />
            </EmptyMedia>
            <EmptyTitle>Resume unavailable</EmptyTitle>
            <EmptyDescription>
              This resume could not be loaded. It may have been removed or is no longer accessible.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.history.back()}>
              <ArrowLeft className="size-4" />
              Go back
            </Button>
            <NewResumeButton />
          </EmptyContent>
        </Empty>
      </EmptyStateScene>
    );
  }

  return (
    <ResumeWorkspaceProvider value={workspace}>
      <div className="flex w-full flex-col gap-6 pb-24" data-test="resume-workbench">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{resume.name}</h1>
            {resume.headline && (
              <p className="text-muted-foreground mt-1 truncate text-sm">{resume.headline}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="size-4" />
              Import JSON
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasTemplateChange}
              className="gap-2"
              size="sm"
              data-test="resume-save-button"
            >
              <Save className="size-4" />
              {saveMutation.isPending ? "Saving..." : hasTemplateChange ? "Save template" : "Saved"}
            </Button>
          </div>
        </div>

        {/* Template Picker */}
        <TemplatePicker selected={selectedTemplate} onSelect={setSelectedTemplate} />

        {/* Tabs */}
        <Tabs value={tab} onValueChange={navigateToTab} className="w-full">
          <TabsList className="w-[95%]">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="prompt">LLM Prompt</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" forceMount className="mt-4 data-[state=inactive]:hidden">
            <ResumeEditTab resumeId={resumeId} />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <ResumePreviewTab resumeId={resumeId} selectedTemplate={selectedTemplate} doc={doc} />
          </TabsContent>

          <TabsContent
            value="json"
            forceMount
            className="mt-4 data-[state=inactive]:hidden max-w-[98%]"
          >
            <ResumeJsonTab />
          </TabsContent>

          <TabsContent value="prompt" className="mt-4">
            <PromptTab resumeId={resumeId} doc={doc} />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <ResumeAiTab resumeId={resumeId} jobDescription={displayResume.jobDescription ?? ""} />
          </TabsContent>
        </Tabs>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Resume JSON</DialogTitle>
            </DialogHeader>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder='{"version": 1, "meta": {...}, ...}'
              spellCheck={false}
              className="border-input min-h-50 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none"
            />
            {importError && <p className="text-destructive text-xs">{importError}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => importMutation.mutate(importText)}
                disabled={!importText.trim() || importMutation.isPending}
              >
                {importMutation.isPending ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResumeWorkspaceProvider>
  );
}

// ─── Empty State Scene ────────────────────────────────────────

function EmptyStateScene({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl">
      <div
        className="animate-spin absolute size-[420px] rounded-[40%_60%_60%_40%/60%_30%_70%_40%] bg-linear-to-tr from-primary/25 via-primary/5 to-transparent blur-3xl"
        style={{ animationDuration: "22s" }}
      />
      <div
        className="absolute size-[280px] rounded-[60%_40%_30%_70%/60%_50%_60%_50%] bg-linear-to-bl from-primary/15 via-muted/30 to-transparent blur-2xl"
        style={{ animation: "spin 16s linear infinite reverse" }}
      />
      {children}
    </div>
  );
}
