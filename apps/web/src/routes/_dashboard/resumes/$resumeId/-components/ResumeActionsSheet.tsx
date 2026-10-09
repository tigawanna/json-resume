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
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/library-resolve";
import { useViewer } from "@/data-access-layer/auth/viewer";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { useNavigate } from "@tanstack/react-router";
import { FileUp, GitFork, PanelRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cloneResume } from "@/data-access-layer/event-sourced/clone-resume";
import { PublishResumeButton } from "./PublishResumeButton";
import { ResumeHistory } from "./ResumeHistory";

interface ResumeActionsSheetProps {
  db: AppDb;
  resumeId: string;
  title: string;
  document: ResumeDocumentV1;
  onImportJson: () => void;
}

export function ResumeActionsSheet({
  db,
  resumeId,
  title,
  document,
  onImportJson,
}: ResumeActionsSheetProps) {
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleClone() {
    const userId = viewer.user?.id;
    if (!userId) {
      toast.error("You must be signed in to clone a résumé");
      return;
    }
    try {
      const result = cloneResume(db, resumeId);
      toast.success(`Cloned as “${result.name}”`);
      setOpen(false);
      void navigate({
        to: "/resumes/$resumeId",
        params: { resumeId: result.resumeId },
        search: { tab: "edit" },
      });
    } catch (err: unknown) {
      toast.error("Failed to clone résumé", { description: unwrapUnknownError(err).message });
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-test="resume-actions-btn">
          <PanelRight className="size-4" />
          Actions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md" data-test="resume-actions-sheet">
        <SheetHeader>
          <SheetTitle>Résumé actions</SheetTitle>
          <SheetDescription className="truncate">{title}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Share
            </h3>
            <PublishResumeButton
              sourceResumeId={resumeId}
              title={title}
              document={document}
              className="w-full justify-start"
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Copy & import
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleClone}
              data-test="clone-resume-btn"
            >
              <GitFork className="size-4" />
              Clone
            </Button>
            <p className="text-xs text-base-content/60">
              Same library entries, separate choice of what this résumé shows.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setOpen(false);
                onImportJson();
              }}
              data-test="import-resume-json-btn"
            >
              <FileUp className="size-4" />
              Import JSON
            </Button>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              History
            </h3>
            <ResumeHistory db={db} resumeId={resumeId} onOpenFull={() => setOpen(false)} />
          </section>

          <section className="mt-auto flex flex-col gap-2 rounded-lg border border-error/30 p-3">
            <h3 className="text-xs font-medium tracking-wide text-error uppercase">Danger zone</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start gap-2"
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
