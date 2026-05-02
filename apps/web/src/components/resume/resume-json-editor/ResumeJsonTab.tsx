import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import {
  resumeDocumentV1Schema,
  safeParseResumeJson,
  type ResumeDocumentV1,
} from "@/features/resume/resume-schema";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { unwrapUnknownError } from "@/utils/errors";
import { buildSchemaPrompt } from "@/features/resume/resume-prompt";
import { useMutation } from "@tanstack/react-query";
import type { JsonValue } from "@visual-json/core";
import { DiffView, JsonEditor } from "@visual-json/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PasteDialog, SettingsDialog } from "./dialogs";
import { JsonToolbar } from "./json-toolbar";
import { VJ_THEME_VARS } from "./theme-vars";
import type { ViewMode } from "./types";

interface ResumeJsonTabProps {
  resumeId: string;
}

export function ResumeJsonTab({ resumeId }: ResumeJsonTabProps) {
  const { resume, replaceDocument } = useResumeWorkspace();

  const doc = resume ? resumeDetailToDocument(resume) : null;
  const [jsonValue, setJsonValue] = useState<JsonValue>({} as JsonValue);
  const [originalJson, setOriginalJson] = useState<JsonValue>({} as JsonValue);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rawText, setRawText] = useState("");
  const [rawError, setRawError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Tracks the validated pending doc ready for save
  const [pendingDoc, setPendingDoc] = useState<ResumeDocumentV1 | null>(null);

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

  // Sync editor state when the collection loads (on-demand) or updates externally
  const lastSyncedDocRef = useRef<string | null>(null);
  useEffect(() => {
    if (!doc) return;
    const docStr = JSON.stringify(doc);
    if (lastSyncedDocRef.current === docStr) return;
    lastSyncedDocRef.current = docStr;

    const asJson = doc as unknown as JsonValue;
    setJsonValue(asJson);
    setOriginalJson(structuredClone(asJson));
    setRawText(JSON.stringify(doc, null, 2));
    lastPropagatedRef.current = asJson;
    setPendingDoc(null);
  }, [doc]);

  // Validate debounced edits and mark as pending
  useEffect(() => {
    if (debouncedJson === lastPropagatedRef.current) return;
    const result = resumeDocumentV1Schema.safeParse(debouncedJson);
    if (result.success) {
      lastPropagatedRef.current = debouncedJson;
      setPendingDoc(result.data);
    }
  }, [debouncedJson]);

  // ─── Save mutation ──────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (docToSave: ResumeDocumentV1) => {
      await replaceDocument(docToSave);
    },
    onSuccess() {
      setPendingDoc(null);
      toast.success("JSON saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save JSON", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  function handleSave() {
    if (!pendingDoc) return;
    saveMutation.mutate(pendingDoc);
  }

  /* ---- helpers ---- */

  function loadAndValidateJson(text: string) {
    const result = safeParseResumeJson(text);
    if (result.ok) {
      setJsonValue(result.data as unknown as JsonValue);
      setRawText(JSON.stringify(result.data, null, 2));
      setRawError(null);
      setParseError(null);
      setPendingDoc(result.data);
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

  async function handleCopySchema() {
    try {
      await navigator.clipboard.writeText(buildSchemaPrompt());
      toast.success("Schema copied to clipboard");
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
    <div
      ref={dropRef}
      className="relative flex min-w-0 flex-col overflow-hidden px-4"
      data-test="resume-json-tab"
    >
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
        onCopySchema={handleCopySchema}
        onOpenSettings={() => setSettingsOpen(true)}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        hasChanges={pendingDoc !== null}
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
