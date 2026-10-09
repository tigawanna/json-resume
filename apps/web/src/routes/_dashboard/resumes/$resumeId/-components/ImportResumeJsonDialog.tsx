import { useResumeImport } from "@/components/resume/resume-import/use-resume-import";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
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
import { safeParseResumeJson } from "@/features/resume/resume-schema";
import { extractJsonObject } from "@/utils/extract-json";
import { useState } from "react";

interface ImportResumeJsonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportResumeJsonDialog({
  open,
  onOpenChange,
  onImported,
}: ImportResumeJsonDialogProps) {
  const workspace = useResumeWorkspace();
  const { importDocument, reviewDialog } = useResumeImport(workspace, { onApplied: onImported });
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    const result = safeParseResumeJson(extractJsonObject(text));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText("");
    setError(null);
    onOpenChange(false);
    importDocument(result.data);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-test="import-resume-json-dialog">
          <DialogHeader>
            <DialogTitle>Import Resume JSON</DialogTitle>
            <DialogDescription>
              Paste a résumé JSON document to replace this résumé&apos;s contents. Items already in
              your library are reused, and differences are shown for review.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder='{"version": 1, "meta": {...}, ...}'
            spellCheck={false}
            className="border-input min-h-50 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none"
            data-test="import-resume-json-input"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleImport} disabled={!text.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {reviewDialog}
    </>
  );
}
