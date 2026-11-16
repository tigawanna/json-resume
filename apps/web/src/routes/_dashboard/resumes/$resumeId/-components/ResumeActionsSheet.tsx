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
  SheetFooter,
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
import { isCreditDenial } from "@/data-access-layer/event-sourced/resume/resume-credit-guard";
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

  async function handleClone() {
    const userId = viewer.user?.id;
    if (!userId) {
      toast.error("You must be signed in to clone a résumé");
      return;
    }
    try {
      const result = await cloneResume(db, resumeId);
      toast.success(`Cloned as “${result.name}”`);
      closeDialog();
      void navigate({
        to: "/resumes/$resumeId",
        params: { resumeId: result.resumeId },
        search: { tab: "edit" },
      });
    } catch (err: unknown) {
      // The guard already opened the out-of-credits dialog.
      if (isCreditDenial(err)) return;
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
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        data-test="resume-actions-sheet"
      >
        <SheetHeader className="border-b pr-12">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SheetTitle className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Résumé actions
            </SheetTitle>
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
          <SheetDescription className="sr-only">
            Clone, import, export or delete “{title}”.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Copy & files
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2 px-2.5"
                onClick={handleClone}
                title="Clone keeps the same library entries"
                data-test="clone-resume-btn"
              >
                <GitFork className="text-base-content/70 size-4" />
                Clone
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2 px-2.5"
                onClick={() => openDialog("import-json")}
                title="Import replaces this résumé from JSON"
                data-test="import-resume-json-btn"
              >
                <FileUp className="text-base-content/70 size-4" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2 px-2.5"
                onClick={() => void handleExportJson()}
                title="Copy JSON puts the current document on the clipboard"
                data-test="export-resume-json-btn"
              >
                <ClipboardCopy className="text-base-content/70 size-4" />
                Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2 px-2.5"
                disabled={savingPdf}
                onClick={() => void handleSavePdf()}
                data-test="save-resume-pdf-btn"
              >
                <FileDown className="text-base-content/70 size-4" />
                {savingPdf ? "Saving…" : "Save PDF"}
              </Button>
              {viewer.user?.id ? (
                <PublishResumeButton
                  sourceResumeId={resumeId}
                  title={title}
                  document={resumeDocument}
                  className="col-span-2 h-9 justify-start gap-2 px-2.5 text-sm"
                />
              ) : null}
            </div>
          </section>

          <section className="mt-auto flex min-h-0 flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              History
            </h3>
            <ResumeHistory db={db} resumeId={resumeId} onOpenFull={closeDialog} />
          </section>
        </div>

        <SheetFooter className="border-t px-4 py-3">
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
                  Removes this résumé and its choices of what to show. Experiences, projects, skills
                  and other library entries stay for your other résumés.
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
