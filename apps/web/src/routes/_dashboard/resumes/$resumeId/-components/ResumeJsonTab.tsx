import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import {
  resumeDocumentV1Schema,
  safeParseResumeJson,
  type ResumeDocumentV1,
  type TemplateId,
} from "@/features/resume/resume-schema";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { JsonValue } from "@visual-json/core";
import { DiffView, JsonEditor } from "@visual-json/react";
import {
  ClipboardPaste,
  Copy,
  Download,
  PanelLeft,
  PanelLeftClose,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ViewMode = "tree" | "diff" | "raw";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "diff", label: "Diff" },
  { id: "raw", label: "Raw" },
];

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

function SettingsDialog({
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

function PasteDialog({ open, onOpenChange, onSubmit }: PasteDialogProps) {
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

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/* ------------------------------------------------------------------ */

interface ToolbarProps {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  onPaste: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onOpenSettings: () => void;
}

function JsonToolbar({
  viewMode,
  setViewMode,
  sidebarOpen,
  setSidebarOpen,
  onPaste,
  onDownload,
  onCopy,
  onOpenSettings,
}: ToolbarProps) {
  return (
    <div className="border-border bg-background flex h-11 shrink-0 items-center gap-2 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-7 w-7 md:inline-flex"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
        {sidebarOpen ? (
          <PanelLeftClose className="h-3.5 w-3.5" />
        ) : (
          <PanelLeft className="h-3.5 w-3.5" />
        )}
      </Button>

      <div className="hidden items-center gap-2 md:flex">
        <div className="bg-border h-5 w-px" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onPaste}
          title="Paste JSON (validates as resume)">
          <ClipboardPaste className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDownload}
          title="Download">
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} title="Copy JSON">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(v) => {
          if (v) setViewMode(v as ViewMode);
        }}
        variant="outline"
        size="sm"
        className="ml-auto">
        {VIEW_MODES.map((m) => (
          <ToggleGroupItem key={m.id} value={m.id} className="px-3 text-xs">
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onOpenSettings}
        title="Settings">
        <Settings className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS variable mapping for visual-json to use our theme              */
/* ------------------------------------------------------------------ */

const VJ_THEME_VARS = {
  "--vj-bg": "var(--background)",
  "--vj-bg-panel": "var(--background)",
  "--vj-bg-hover": "var(--accent)",
  "--vj-bg-selected": "var(--primary)",
  "--vj-bg-selected-muted": "var(--accent)",
  "--vj-text-selected": "var(--primary-foreground)",
  "--vj-border": "var(--border)",
  "--vj-border-subtle": "var(--border)",
  "--vj-text": "var(--foreground)",
  "--vj-text-muted": "var(--muted-foreground)",
  "--vj-text-dim": "var(--muted-foreground)",
  "--vj-text-dimmer": "var(--muted-foreground)",
  "--vj-input-bg": "var(--input)",
  "--vj-input-border": "var(--border)",
  "--vj-accent": "var(--primary)",
  "--vj-accent-muted": "var(--accent)",
  "--vj-font": "var(--font-mono)",
} as React.CSSProperties;

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface ResumeJsonTabProps {
  resumeId: string;
  setPendingDoc: (doc: ResumeDocumentV1 | null) => void;
  setSelectedTemplate: (t: TemplateId) => void;
}

export function ResumeJsonTab({
  resumeId,
  setPendingDoc,
  setSelectedTemplate,
}: ResumeJsonTabProps) {
  const { data: resume } = useLiveQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const doc = resume ? resumeDetailToDocument(resume) : null;
  const [jsonValue, setJsonValue] = useState<JsonValue>((doc ?? {}) as JsonValue);
  const [originalJson] = useState<JsonValue>(structuredClone(doc ?? {}) as JsonValue);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rawText, setRawText] = useState(JSON.stringify(doc, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [treeShowValues, setTreeShowValues] = useState(false);
  const [treeShowCounts, setTreeShowCounts] = useState(false);
  const [editorShowDescriptions, setEditorShowDescriptions] = useState(false);
  const [editorShowCounts, setEditorShowCounts] = useState(false);

  // Paste dialog
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);

  // Debounce jsonValue changes so we don't validate on every keystroke
  const { debouncedValue: debouncedJson } = useDebouncedValue(jsonValue, 500);
  const lastPropagatedRef = useRef<JsonValue>(jsonValue);

  // Propagate valid edits back to parent (marks form dirty + updates pendingDoc)
  useEffect(() => {
    if (debouncedJson === lastPropagatedRef.current) return;
    const result = resumeDocumentV1Schema.safeParse(debouncedJson);
    if (result.success) {
      lastPropagatedRef.current = debouncedJson;
      setPendingDoc(result.data);
      setSelectedTemplate(result.data.meta.templateId);
    }
  }, [debouncedJson, setPendingDoc, setSelectedTemplate]);

  /* ---- helpers ---- */

  function importDoc(doc: ResumeDocumentV1) {
    setPendingDoc(doc);
    setSelectedTemplate(doc.meta.templateId);
  }

  function loadAndValidateJson(text: string) {
    const result = safeParseResumeJson(text);
    if (result.ok) {
      setJsonValue(result.data as unknown as JsonValue);
      setRawText(JSON.stringify(result.data, null, 2));
      setRawError(null);
      setParseError(null);
      importDoc(result.data);
      toast.success("Resume JSON imported");
    } else {
      setParseError(result.error);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      loadAndValidateJson(text);
    } catch {
      setPasteDialogOpen(true);
    }
  }

  function handleDownload() {
    const text = JSON.stringify(jsonValue, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(resume?.name ?? "resume").replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonValue, null, 2));
      toast.success("Copied to clipboard");
    } catch {
      // clipboard write failed silently
    }
  }

  function handleRawChange(newText: string) {
    setRawText(newText);
    try {
      const parsed = JSON.parse(newText);
      setRawError(null);
      setJsonValue(parsed);
    } catch (e: unknown) {
      setRawError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  /* ---- drag-drop ---- */

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    function handleDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setIsDragOver(true);
    }
    function handleDragLeave(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      if (e.relatedTarget === null || !el!.contains(e.relatedTarget as Node)) setIsDragOver(false);
    }
    function handleDrop(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") loadAndValidateJson(reader.result);
        };
        reader.readAsText(file);
      }
    }
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  });

  return (
    <div ref={dropRef} className="relative flex flex-col px-4" data-test="resume-json-tab">
      {/* Drag overlay */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="border-primary rounded-lg border-2 border-dashed p-8">
            <span className="text-foreground font-mono text-lg">Drop resume JSON file here</span>
          </div>
        </div>
      )}

      {/* Parse error banner */}
      {parseError && (
        <div className="border-border flex shrink-0 items-center justify-between border-b bg-red-100 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">
          <span>{parseError}</span>
          <button type="button" onClick={() => setParseError(null)}>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <JsonToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onPaste={handlePaste}
        onDownload={handleDownload}
        onCopy={handleCopy}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Editor area */}
      <div className="min-h-140 flex-1 overflow-hidden rounded-lg border">
        {viewMode === "raw" ? (
          <div className="bg-base-300 flex h-full flex-col min-h-[50vh]">
            {rawError && (
              <div className="border-border shrink-0 border-b bg-red-100 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">
                {rawError}
              </div>
            )}
            <textarea
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              spellCheck={false}
              className="text-foreground w-full flex-1 resize-none border-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
            />
          </div>
        ) : viewMode === "diff" ? (
          <DiffView originalJson={originalJson} currentJson={jsonValue} />
        ) : (
          <div className="flex h-full p-5" style={VJ_THEME_VARS}>
            <JsonEditor
              value={jsonValue}
              onChange={(v) => {
                setJsonValue(v);
                setRawText(JSON.stringify(v, null, 2));
              }}
              treeShowValues={treeShowValues}
              treeShowCounts={treeShowCounts}
              editorShowDescriptions={editorShowDescriptions}
              editorShowCounts={editorShowCounts}
              sidebarOpen={sidebarOpen}
              style={VJ_THEME_VARS}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        treeShowValues={treeShowValues}
        setTreeShowValues={setTreeShowValues}
        treeShowCounts={treeShowCounts}
        setTreeShowCounts={setTreeShowCounts}
        editorShowDescriptions={editorShowDescriptions}
        setEditorShowDescriptions={setEditorShowDescriptions}
        editorShowCounts={editorShowCounts}
        setEditorShowCounts={setEditorShowCounts}
      />
      <PasteDialog
        open={pasteDialogOpen}
        onOpenChange={setPasteDialogOpen}
        onSubmit={loadAndValidateJson}
      />
    </div>
  );
}
