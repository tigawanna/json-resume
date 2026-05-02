import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createResumeFromJsonMutationOptions } from "@/data-access-layer/resume/resume-mutatin-options";
import { useMutation } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { useState } from "react";

export function ImportResumeFromJsonButton() {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const importMutation = useMutation(createResumeFromJsonMutationOptions);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setJsonText("");
      setError(null);
    }
  }

  function handleImport() {
    setError(null);
    importMutation.mutate(jsonText, {
      onError(err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      },
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="mr-2 size-4" />
        Import JSON
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Resume from JSON</DialogTitle>
          </DialogHeader>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder='{"version": 1, "meta": {...}, ...}'
            spellCheck={false}
            className="border-input min-h-48 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleImport} disabled={!jsonText.trim() || importMutation.isPending}>
              {importMutation.isPending ? "Importing..." : "Import & Create Resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
