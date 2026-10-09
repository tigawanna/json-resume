import { ResumeJsonTab } from "@/components/resume/resume-json-editor";
import { ResumeWorkspaceProvider } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { ResumeEditPanel } from "@/components/resume/ResumeEditPanel";
import { TemplatePicker } from "@/components/resume/TemplatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { asTemplateId } from "@/data-access-layer/event-sourced/assemble-resume-detail";
import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/event-sourced-resume-workspace";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { safeParseResumeJson, type TemplateId } from "@/features/resume/resume-schema";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, FileX, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { EventSourcedResumeAiTab } from "../../-ai/-components/EventSourcedResumeAiTab";
import { ResumeActionsSheet } from "./-components/ResumeActionsSheet";
import { ResumePreviewView } from "./-components/ResumePreviewTab";
import { useEventSourcedResumeDetail } from "./-hooks/use-event-sourced-resume-detail";

const tabsList = ["edit", "preview", "json", "ai"] as const;
const tabSchema = z.enum(tabsList).default("edit").catch("edit");

export const Route = createFileRoute("/_dashboard/resumes/$resumeId/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => z.object({ tab: tabSchema }).parse(search),
  head: () => ({
    meta: [{ title: "Résumé workbench", description: "Local-first résumé workbench" }],
  }),
});

function RouteComponent() {
  const { resumeId } = Route.useParams();
  return <EventSourcedResumeWorkbench key={resumeId} resumeId={resumeId} />;
}

function EventSourcedResumeWorkbench({ resumeId }: { resumeId: string }) {
  const { db, detail, snapshots, isLoading } = useEventSourcedResumeDetail(resumeId);
  const router = useRouter();
  const { tab } = Route.useSearch();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  function navigateToTab(value: string) {
    void router.navigate({
      to: ".",
      search: (prev) => ({ ...prev, tab: value as z.infer<typeof tabSchema> }),
      replace: true,
    });
  }

  if (isLoading) {
    return <RouterPendingComponent />;
  }

  if (!detail) {
    return (
      <Empty className="border-border/40 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX />
          </EmptyMedia>
          <EmptyTitle>Résumé not found</EmptyTitle>
          <EmptyDescription>
            This local résumé doesn&apos;t exist or may have been deleted.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/resumes">
              <ArrowLeft className="size-4" />
              Back to résumés
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const templateId = selectedTemplate ?? asTemplateId(detail.templateId);
  const workspace = createEventSourcedResumeWorkspace(db, { ...detail, templateId }, snapshots);
  const doc = resumeDetailToDocument({ ...detail, templateId });
  const hasTemplateChange = templateId !== asTemplateId(detail.templateId);
  const resume = detail;

  async function handleSaveTemplate() {
    try {
      await workspace.updateMetadata({
        name: resume.name,
        fullName: resume.fullName,
        headline: resume.headline,
        description: resume.description,
        jobDescription: resume.jobDescription,
        jobId: resume.jobId ?? null,
        templateId,
      });
      toast.success("Template saved");
    } catch (err: unknown) {
      toast.error("Failed to save template", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  async function handleImport() {
    const result = safeParseResumeJson(importText);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    try {
      await workspace.replaceDocument(result.data);
      toast.success("Résumé imported from JSON");
      setImportText("");
      setImportError(null);
      setImportOpen(false);
      navigateToTab("edit");
    } catch (err: unknown) {
      setImportError(unwrapUnknownError(err).message);
    }
  }

  return (
    <ResumeWorkspaceProvider value={workspace}>
      <div className="flex w-full flex-col gap-6 pb-24" data-test="resume-workbench">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
              <Link to="/resumes">
                <ArrowLeft className="size-4" />
                Résumés
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{detail.name}</h1>
            {detail.headline ? (
              <p className="text-muted-foreground mt-1 truncate text-sm">{detail.headline}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ResumeActionsSheet
              db={db}
              resumeId={resumeId}
              title={detail.name}
              document={doc}
              onImportJson={() => setImportOpen(true)}
            />
            <Button
              type="button"
              onClick={() => void handleSaveTemplate()}
              disabled={!hasTemplateChange}
              className="gap-2"
              size="sm"
              data-test="resume-save-button"
            >
              <Save className="size-4" />
              {hasTemplateChange ? "Save template" : "Saved"}
            </Button>
          </div>
        </div>

        <TemplatePicker selected={templateId} onSelect={setSelectedTemplate} />

        <Tabs value={tab} onValueChange={navigateToTab} className="w-full">
          <TabsList className="w-[95%]">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" forceMount className="mt-4 data-[state=inactive]:hidden">
            <ResumeEditPanel resumeId={resumeId} />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <ResumePreviewView resumeName={detail.name} selectedTemplate={templateId} doc={doc} />
          </TabsContent>

          <TabsContent
            value="json"
            forceMount
            className="mt-4 data-[state=inactive]:hidden max-w-[98%]"
          >
            <ResumeJsonTab />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <EventSourcedResumeAiTab
              resumeId={resumeId}
              jobDescription={detail.jobDescription ?? ""}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Resume JSON</DialogTitle>
              <DialogDescription>
                Paste a résumé JSON document to replace this résumé's contents.
              </DialogDescription>
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
            {importError ? <p className="text-destructive text-xs">{importError}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={() => void handleImport()} disabled={!importText.trim()}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResumeWorkspaceProvider>
  );
}
