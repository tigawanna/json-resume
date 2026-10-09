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
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { safeParseResumeJson, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { useNavigate } from "@tanstack/react-router";
import { FileUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createLocalResumeFromDocument } from "../../-ai/-utils/local-resume-tools";

function importedResumeNameFromDoc(doc: ResumeDocumentV1): string {
  const fullName = doc.header.fullName.trim();
  const headline = doc.header.headline.trim();
  if (fullName && headline) return `${fullName} – ${headline}`;
  return headline || fullName || "Imported Resume";
}

interface ImportResumeJsonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportResumeJsonDialog({ open, onOpenChange }: ImportResumeJsonDialogProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setImportText("");
    setImportError(null);
    setPending(false);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      setImportText(text);
      setImportError(null);
    } catch (err: unknown) {
      setImportError(unwrapUnknownError(err).message);
    }
  }

  async function handleImport() {
    const userId = viewer.user?.id;
    if (!userId) {
      setImportError("You must be signed in to import a résumé");
      return;
    }

    const parsed = safeParseResumeJson(importText);
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }

    setPending(true);
    try {
      const name = importedResumeNameFromDoc(parsed.data);
      const result = await createLocalResumeFromDocument(
        {
          db,
          resumeId: "",
          userId,
          navigateToResume: () => undefined,
        },
        { name, document: parsed.data },
      );
      toast.success("Résumé imported from JSON");
      reset();
      onOpenChange(false);
      void navigate({
        to: "/resumes/$resumeId",
        params: { resumeId: result.resumeId },
        search: { tab: "edit" },
      });
    } catch (err: unknown) {
      setImportError(unwrapUnknownError(err).message);
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import résumé JSON</DialogTitle>
          <DialogDescription>
            Paste a JSON Resume document (or upload a <code>.json</code> file). We’ll parse it into
            a new local résumé with sections attached.
          </DialogDescription>
        </DialogHeader>
        <label className="border-border hover:bg-muted/40 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
          <FileUp className="size-4" />
          Upload JSON file
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
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
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={() => void handleImport()} disabled={pending || !importText.trim()}>
            {pending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
