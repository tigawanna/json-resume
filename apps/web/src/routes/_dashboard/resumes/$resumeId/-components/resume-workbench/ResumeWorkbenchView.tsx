import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { ResumeEditPanel } from "@/components/resume/ResumeEditPanel";
import { TemplatePicker } from "@/components/resume/TemplatePicker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  workbenchTabSchema,
  type WorkbenchTab,
} from "@/features/agentic-tools/resume-tool-schemas";
import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { EventSourcedResumeAiTab } from "../../../../-ai/-components/EventSourcedResumeAiTab";
import { ImportResumeJsonDialog } from "../ImportResumeJsonDialog";
import { ResumeActionsSheet } from "../ResumeActionsSheet";
import { ResumePreviewView } from "../ResumePreviewTab";
import { ResumePromptTab } from "../ResumePromptTab";
import { ResumeJsonTab } from "../resume-json-editor";
import {
  useResumeWorkbenchActions,
  useWorkbenchDocument,
  useWorkbenchTemplate,
} from "./ResumeWorkbenchProvider";

const WORKBENCH_TABS: Array<{ value: WorkbenchTab; label: string }> = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
  { value: "json", label: "JSON" },
  { value: "prompt", label: "Prompt" },
  { value: "ai", label: "AI" },
];

export function ResumeWorkbenchView({
  tab,
  lab,
  navExtra,
}: {
  tab: WorkbenchTab;
  /** Dev chat lab only. Production leaves this unset. */
  lab?: { connection: string; preset: string };
  /** Extra controls on the AI tab row, used by the chat lab. */
  navExtra?: ReactNode;
}) {
  const workspace = useResumeWorkspace();
  const { resume } = workspace;
  const { templateId, hasUnsavedChange: hasTemplateChange } = useWorkbenchTemplate();
  const { goToTab, pickTemplate } = useResumeWorkbenchActions();
  const doc = useWorkbenchDocument();

  async function handleSaveTemplate() {
    try {
      await workspace.updateMetadata({
        name: resume.name,
        fullName: resume.fullName,
        headline: resume.headline,
        description: resume.description,
        templateId,
      });
      toast.success("Template saved");
    } catch (err: unknown) {
      toast.error("Failed to save template", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  if (tab === "ai") {
    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
        data-test="resume-workbench"
      >
        <nav
          className="flex h-10 shrink-0 items-center gap-1 border-b border-border/60 px-3"
          data-test="resume-workbench-ai-nav"
        >
          {WORKBENCH_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => void goToTab(item.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                item.value === "ai" && "bg-base-200 text-foreground",
              )}
              data-test={item.value === "prompt" ? "resume-prompt-tab-trigger" : undefined}
            >
              {item.label}
            </button>
          ))}
          {navExtra ? <div className="ml-auto">{navExtra}</div> : null}
        </nav>
        <div className="min-h-0 flex-1">
          <EventSourcedResumeAiTab lab={lab} />
        </div>
        <ImportResumeJsonDialog />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-24" data-test="resume-workbench">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to="/resumes">
              <ArrowLeft className="size-4" />
              Résumés
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{resume.name}</h1>
          {resume.headline ? (
            <p className="text-muted-foreground mt-1 truncate text-sm">{resume.headline}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ResumeActionsSheet />
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

      <TemplatePicker selected={templateId} onSelect={pickTemplate} />

      <Tabs
        value={tab}
        onValueChange={(value) => void goToTab(workbenchTabSchema.catch("edit").parse(value))}
        className="w-full"
      >
        <TabsList className="w-[95%]">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="prompt" data-test="resume-prompt-tab-trigger">
            Prompt
          </TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" forceMount className="mt-4 data-[state=inactive]:hidden">
          <ResumeEditPanel />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ResumePreviewView resumeName={resume.name} selectedTemplate={templateId} doc={doc} />
        </TabsContent>

        <TabsContent
          value="json"
          forceMount
          className="mt-4 data-[state=inactive]:hidden max-w-[98%]"
        >
          <ResumeJsonTab />
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <ResumePromptTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <EventSourcedResumeAiTab lab={lab} />
        </TabsContent>
      </Tabs>

      <ImportResumeJsonDialog />
    </div>
  );
}
