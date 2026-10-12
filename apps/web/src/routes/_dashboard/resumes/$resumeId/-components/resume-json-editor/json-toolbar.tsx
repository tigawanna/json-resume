import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ClipboardPaste,
  Copy,
  Download,
  FileJson,
  PanelLeft,
  PanelLeftClose,
  Save,
  Settings,
} from "lucide-react";
import { VIEW_MODES, type ViewMode } from "./types";

interface JsonToolbarProps {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  onPaste: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onCopySchema: () => void;
  onOpenSettings: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function JsonToolbar({
  viewMode,
  setViewMode,
  sidebarOpen,
  setSidebarOpen,
  onPaste,
  onDownload,
  onCopy,
  onCopySchema,
  onOpenSettings,
  onSave,
  isSaving,
  hasChanges,
}: JsonToolbarProps) {
  return (
    <div className="border-border bg-background flex h-11 shrink-0 items-center gap-2 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-7 w-7 md:inline-flex"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
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
          title="Paste JSON (validates as resume)"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDownload}
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} title="Copy JSON">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCopySchema}
          title="Copy JSON schema (for LLM prompts)"
        >
          <FileJson className="h-3.5 w-3.5" />
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
        className="ml-auto"
      >
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
        title="Settings"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>

      <div className="bg-border h-5 w-px" />

      <Button
        size="sm"
        className="gap-1.5"
        onClick={onSave}
        disabled={isSaving || !hasChanges}
        data-test="json-save-button"
      >
        <Save className="size-3.5" />
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
