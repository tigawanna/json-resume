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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Settings Dialog                                                    */
/* ------------------------------------------------------------------ */

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treeShowValues: boolean;
  setTreeShowValues: (v: boolean) => void;
  treeShowCounts: boolean;
  setTreeShowCounts: (v: boolean) => void;
  editorShowDescriptions: boolean;
  setEditorShowDescriptions: (v: boolean) => void;
  editorShowCounts: boolean;
  setEditorShowCounts: (v: boolean) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  treeShowValues,
  setTreeShowValues,
  treeShowCounts,
  setTreeShowCounts,
  editorShowDescriptions,
  setEditorShowDescriptions,
  editorShowCounts,
  setEditorShowCounts,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Choose what the JSON tree and editor panes display.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Tree</h4>
            <div className="space-y-2 pl-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tree-values">Values</Label>
                <Switch
                  id="tree-values"
                  checked={treeShowValues}
                  onCheckedChange={setTreeShowValues}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tree-counts">Property counts</Label>
                <Switch
                  id="tree-counts"
                  checked={treeShowCounts}
                  onCheckedChange={setTreeShowCounts}
                />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Editor</h4>
            <div className="space-y-2 pl-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editor-descriptions">Descriptions</Label>
                <Switch
                  id="editor-descriptions"
                  checked={editorShowDescriptions}
                  onCheckedChange={setEditorShowDescriptions}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="editor-counts">Property counts</Label>
                <Switch
                  id="editor-counts"
                  checked={editorShowCounts}
                  onCheckedChange={setEditorShowCounts}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Paste Dialog                                                       */
/* ------------------------------------------------------------------ */

interface PasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
}

export function PasteDialog({ open, onOpenChange, onSubmit }: PasteDialogProps) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (text.trim()) onSubmit(text);
    setText("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paste Resume JSON</DialogTitle>
          <DialogDescription>
            Paste a résumé JSON document to load it into the editor.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"version": 1, "meta": {...}, ...}'
          spellCheck={false}
          className="border-input min-h-50 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!text.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
