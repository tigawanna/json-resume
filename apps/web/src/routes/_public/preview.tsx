import { ResumeEditPanel } from "@/components/resume/ResumeEditPanel";
import { ResumeJsonTab } from "@/components/resume/resume-json-editor";
import { ResumeWorkspaceProvider } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { createLocalResumeWorkspace } from "@/components/resume/resume-workspace/local-resume-workspace";
import {
  localResumeCollection,
  persistLocalResume,
} from "@/components/resume/resume-workspace/local-resume-collection";
import { createLocalResumeDetail } from "@/components/resume/resume-workspace/resume-workspace-utils";
import { ResumePdfPreviewCard } from "@/features/resume/ResumePdfPreviewCard";
import {
  createDefaultResume,
  safeParseResumeJson,
  type ResumeDocumentV1,
  type TemplateId,
} from "@/features/resume/resume-schema";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { PromptCopySection } from "@/components/resume/PromptCopySection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatePicker } from "@/components/resume/TemplatePicker";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { FileUp, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const tabsList = ["edit", "preview", "json", "prompt"] as const;
const tabSchema = z.enum(tabsList).default("edit").catch("edit");

export const Route = createFileRoute("/_public/preview")({
  component: RouteComponent,
  validateSearch: (search) => z.object({ tab: tabSchema }).parse(search),
  head: () => ({
    meta: [
      {
        title: "Local Resume Workbench",
        description: "Build and export a resume locally without an account",
      },
    ],
  }),
});

function RouteComponent() {
  const { data: localResumes } = useLiveSuspenseQuery((q) =>
    q.from({ resume: localResumeCollection }),
  );

  const [seedAttempted, setSeedAttempted] = useState(false);

  useEffect(() => {
    if (seedAttempted || localResumes.length > 0) return;
    setSeedAttempted(true);
    void persistLocalResume(createLocalResumeDetail(createDefaultResume()));
  }, [localResumes.length, seedAttempted]);

  const resume = localResumes[0];

  if (!resume) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Preparing your local workbench...</p>
      </div>
    );
  }

  return <LocalWorkbench resumeId={resume.id} />;
}

function LocalWorkbench({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const { tab } = Route.useSearch();
  const { data: resume } = useLiveSuspenseQuery(
    (q) =>
      q
        .from({ resume: localResumeCollection })
        .where(({ resume }) => eq(resume.id, resumeId))
        .findOne(),
    [resumeId],
  );

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    resume?.templateId ?? "classic",
  );
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  if (!resume) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">Local resume not found.</p>
      </div>
    );
  }

  const currentResume = resume;
  const workspace = createLocalResumeWorkspace(currentResume);
  const doc = resumeDetailToDocument({ ...currentResume, templateId: selectedTemplate });
  const hasTemplateChange = selectedTemplate !== currentResume.templateId;

  function navigateToTab(value: string) {
    void router.navigate({
      to: ".",
      search: (prev) => ({ ...prev, tab: value as z.infer<typeof tabSchema> }),
      replace: true,
    });
  }

  async function saveTemplate() {
    await workspace.updateMetadata({
      name: currentResume.name,
      fullName: currentResume.fullName,
      headline: currentResume.headline,
      description: currentResume.description,
      jobDescription: currentResume.jobDescription,
      templateId: selectedTemplate,
    });
    toast.success("Template saved locally");
  }

  async function handleImportJson() {
    const result = safeParseResumeJson(importText);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    await workspace.replaceDocument(result.data);
    toast.success("Resume imported from JSON");
    setImportText("");
    setImportError(null);
    setImportOpen(false);
    navigateToTab("edit");
  }

  async function handleApplyPromptResult(newDoc: ResumeDocumentV1) {
    await workspace.replaceDocument(newDoc);
    toast.success("Resume updated — switching to editor");
    navigateToTab("edit");
  }

  return (
    <ResumeWorkspaceProvider value={workspace}>
      <div
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6"
        data-test="local-resume-workbench"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">Local Resume Workbench</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Stored in this browser. No account needed.
            </p>
          </div>

          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <FileUp className="size-4" />
            Import JSON
          </Button>
        </div>

        <TemplatePicker selected={selectedTemplate} onSelect={setSelectedTemplate} />

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
              onClick={() => void saveTemplate()}
              disabled={!hasTemplateChange}
              className="gap-2"
              size="sm"
              data-test="local-resume-save-template"
            >
              <Save className="size-4" />
              {hasTemplateChange ? "Save template" : "Saved"}
            </Button>
          </div>

          <TabsContent value="edit" forceMount className="mt-4 data-[state=inactive]:hidden">
            <ResumeEditPanel resumeId={currentResume.id} />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <ResumePdfPreviewCard
              doc={doc}
              templateId={selectedTemplate}
              resumeName={currentResume.name}
            />
          </TabsContent>

          <TabsContent value="json" forceMount className="mt-4 data-[state=inactive]:hidden">
            <ResumeJsonTab resumeId={currentResume.id} />
          </TabsContent>

          <TabsContent value="prompt" className="mt-4">
            <div className="mx-auto max-w-3xl">
              <PromptCopySection
                doc={doc}
                jobDescription={currentResume.jobDescription ?? ""}
                onApplyResult={handleApplyPromptResult}
                isApplying={false}
              />
            </div>
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
              <Button onClick={() => void handleImportJson()} disabled={!importText.trim()}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResumeWorkspaceProvider>
  );
}
