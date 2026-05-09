import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModelPicker } from "./ModelPicker";
import type { AiSettings, AiStorageType } from "@/types/ai-settings";

const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";

interface AiProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AiSettings | null;
  onSave: (settings: AiSettings) => void;
  onClear: () => void;
}

export function AiProviderModal({
  open,
  onOpenChange,
  settings,
  onSave,
  onClear,
}: AiProviderModalProps) {
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
  const [model, setModel] = useState(settings?.model ?? DEFAULT_MODEL);
  const [storageType, setStorageType] = useState<AiStorageType>(settings?.storageType ?? "local");
  const [showKey, setShowKey] = useState(false);

  function handleOpen(next: boolean) {
    if (next) {
      setApiKey(settings?.apiKey ?? "");
      setModel(settings?.model ?? DEFAULT_MODEL);
      setStorageType(settings?.storageType ?? "local");
    }
    onOpenChange(next);
  }

  function handleSave() {
    if (!apiKey.trim() || !model) return;
    onSave({ apiKey: apiKey.trim(), model, storageType });
    onOpenChange(false);
  }

  function handleClear() {
    setApiKey("");
    setModel(DEFAULT_MODEL);
    setStorageType("local");
    onClear();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base">AI Provider Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modal-api-key">OpenRouter API Key</Label>
            <div className="relative">
              <Input
                id="modal-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="pr-9"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stored only in your browser, sent directly to OpenRouter.{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Get a key
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Key storage</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "local", label: "Local storage", hint: "Persists across tabs" },
                  { value: "session", label: "Session storage", hint: "Cleared on tab close" },
                ] as const
              ).map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStorageType(value)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    storageType === value
                      ? "border-primary bg-primary/5 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {label}
                  <span className="block text-xs font-normal opacity-70">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Model</Label>
            <ModelPicker value={model} onChange={setModel} />
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {settings && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim() || !model}
            size="sm"
            className="gap-2"
          >
            <KeyRound className="size-3.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
