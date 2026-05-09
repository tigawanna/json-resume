import { useState } from "react";
import { Database, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden border-0 bg-[color-mix(in_oklch,var(--color-base-200)_92%,var(--color-base-content)_8%)] p-0 shadow-[0_28px_90px_color-mix(in_oklch,var(--color-base-content)_22%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_12%,transparent)] sm:max-w-2xl">
        <DialogHeader className="border-b border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">AI Provider Settings</DialogTitle>
              <DialogDescription className="mt-1 leading-6">
                Connect OpenRouter, choose how the key is stored, and pick the model that powers
                resume tailoring.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <section className="rounded-2xl bg-base-100/65 p-4 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <Label htmlFor="modal-api-key" className="text-sm font-semibold">
                  OpenRouter API Key
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Stored in this browser and sent only when a chat request is made.
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] px-2.5 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Browser only
              </span>
            </div>
            <div className="relative">
              <Input
                id="modal-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="h-12 rounded-xl border-0 bg-base-200 pr-11 shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] focus-visible:ring-primary/35"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] hover:text-foreground"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Get a key
              </a>
            </p>
          </section>

          <section className="rounded-2xl bg-base-100/65 p-4 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_12%,transparent)] text-primary">
                <Database className="size-4" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Key storage</Label>
                <p className="text-xs text-muted-foreground">Choose the persistence scope.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
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
                  className={cn(
                    "rounded-xl px-3 py-3 text-left text-sm transition-colors ring-1",
                    storageType === value
                      ? "bg-[color-mix(in_oklch,var(--color-primary)_13%,transparent)] font-medium text-primary ring-[color-mix(in_oklch,var(--color-primary)_28%,transparent)]"
                      : "bg-base-200/75 text-muted-foreground ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)] hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="block text-xs font-normal opacity-70">{hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-base-100/65 p-4 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
            <div className="mb-3">
              <Label className="text-sm font-semibold">Model</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a model for chat responses and resume edits.
              </p>
            </div>
            <ModelPicker value={model} onChange={setModel} />
          </section>
        </div>

        <DialogFooter className="border-t border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] bg-base-100/55 px-6 py-4">
          {settings && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="rounded-xl"
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim() || !model}
            size="sm"
            className="gap-2 rounded-xl"
          >
            <KeyRound className="size-3.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
