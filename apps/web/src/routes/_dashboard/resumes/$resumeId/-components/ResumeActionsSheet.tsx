import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { unwrapUnknownError } from "@/utils/errors";
import { ResumePdfDocument } from "@/features/resume/resume-pdf";
import { resumePdfFileStem } from "@/features/resume/resume-pdf-filename";
import { Link, useNavigate } from "@tanstack/react-router";
import { pdf } from "@react-pdf/renderer";
import {
  ClipboardCopy,
  FileDown,
  FileUp,
  GitFork,
  PanelRight,
  RefreshCwOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cloneResume } from "@/data-access-layer/event-sourced/resume/clone-resume";
import { PublishResumeButton } from "./PublishResumeButton";
import { ResumeHistory } from "./ResumeHistory";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
  useWorkbenchDocument,
  useWorkbenchTemplate,
} from "./resume-workbench/ResumeWorkbenchProvider";

export function ResumeActionsSheet() {
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const db = useEventSourcedDb();
  const { resume } = useResumeWorkspace();
  const { id: resumeId, name: title } = resume;
  const resumeDocument = useWorkbenchDocument();
  const { templateId } = useWorkbenchTemplate();
  const [savingPdf, setSavingPdf] = useState(false);
  const open = useResumeWorkbench((state) => state.dialog === "actions");
  const { openDialog, closeDialog, setDialogOpen } = useResumeWorkbenchActions();

  function handleClone() {
    const userId = viewer.user?.id;
    if (!userId) {
      toast.error("You must be signed in to clone a résumé");
      return;
    }
    try {
      const result = cloneResume(db, resumeId);
      toast.success(`Cloned as “${result.name}”`);
      closeDialog();
      void navigate({
        to: "/resumes/$resumeId",
        params: { resumeId: result.resumeId },
        search: { tab: "edit" },
      });
    } catch (err: unknown) {
      toast.error("Failed to clone résumé", { description: unwrapUnknownError(err).message });
    }
  }

  async function handleExportJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(resumeDocument, null, 2));
      toast.success("Résumé JSON copied");
    } catch (err: unknown) {
      toast.error("Failed to copy résumé JSON", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  async function handleSavePdf() {
    setSavingPdf(true);
    try {
      const fileStem = resumePdfFileStem(title, resumeDocument);
      const blob = await pdf(
        <ResumePdfDocument doc={resumeDocument} templateId={templateId} pdfTitle={fileStem} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileStem}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF saved");
    } catch (err: unknown) {
      toast.error("Failed to save PDF", { description: unwrapUnknownError(err).message });
    } finally {
      setSavingPdf(false);
    }
  }

  async function handleDelete() {
    try {
      await navigate({ to: "/resumes", replace: true });
      deleteWithReferences(db, "resume", resumeId);
      toast.success(`Deleted “${title}”`);
    } catch (err: unknown) {
      toast.error("Failed to delete résumé", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => setDialogOpen("actions", next)}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-test="resume-actions-btn">
          <PanelRight className="size-4" />
          Actions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md" data-test="resume-actions-sheet">
        <SheetHeader className="pr-10">
          <SheetTitle className="sr-only">Résumé actions</SheetTitle>
          <div className="flex min-w-0 items-start gap-2">
            <SheetDescription
              data-signed-in={viewer.user?.id ? "true" : "false"}
              className="text-muted-foreground min-w-0 text-sm leading-snug font-normal whitespace-normal data-[signed-in=true]:text-base"
            >
              {title}
            </SheetDescription>
            {viewer.user?.id ? null : (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-7 w-auto shrink-0 gap-1 px-1.5"
                data-test="publish-resume-signin"
              >
                <Link
                  to="/auth"
                  search={{ returnTo: `/resumes/${resumeId}` }}
                  aria-label="Not signed in. Sign in to share"
                  title="Not signed in. Sign in to share"
                >
                  <RefreshCwOff className="text-base-content size-4" strokeWidth={2.25} />
                  <span className="text-xs font-medium">Sign in</span>
                </Link>
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-1 pb-10">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Copy & files
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="max-w-1/2 min-w-0 flex-[1_1_calc((100%-1rem)/3)] gap-1.5 px-2"
                onClick={handleClone}
                data-test="clone-resume-btn"
              >
                <GitFork className="size-4" />
                Clone
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="max-w-1/2 min-w-0 flex-[1_1_calc((100%-1rem)/3)] gap-1.5 px-2"
                onClick={() => openDialog("import-json")}
                data-test="import-resume-json-btn"
              >
                <FileUp className="size-4" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="max-w-1/2 min-w-0 flex-[1_1_calc((100%-1rem)/3)] gap-1.5 px-2"
                onClick={() => void handleExportJson()}
                data-test="export-resume-json-btn"
              >
                <ClipboardCopy className="size-4" />
                Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="max-w-1/2 min-w-0 flex-[1_1_calc((100%-1rem)/3)] gap-1.5 px-2"
                disabled={savingPdf}
                onClick={() => void handleSavePdf()}
                data-test="save-resume-pdf-btn"
              >
                <FileDown className="size-4" />
                {savingPdf ? "Saving…" : "Save PDF"}
              </Button>
              {viewer.user?.id ? (
                <PublishResumeButton
                  sourceResumeId={resumeId}
                  title={title}
                  document={resumeDocument}
                  className="max-w-1/2 min-w-0 flex-[1_1_calc((100%-1rem)/3)] justify-center gap-1.5 px-2 text-sm"
                />
              ) : null}
            </div>
            <p className="text-xs text-base-content/60">
              Clone keeps the same library entries. Import replaces this résumé from JSON. Copy JSON
              puts the current document on the clipboard.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              History
            </h3>
            <ResumeHistory db={db} resumeId={resumeId} onOpenFull={closeDialog} />
          </section>

          <section className="mt-auto flex flex-col gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="h-10 w-full justify-center gap-2"
                  data-test="delete-resume-btn"
                >
                  <Trash2 className="size-4" />
                  Delete résumé
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-test="delete-resume-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Removes this résumé and its choices of what to show. Experiences, projects,
                    skills and other library entries stay for your other résumés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void handleDelete()}
                    data-test="delete-resume-confirm"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
