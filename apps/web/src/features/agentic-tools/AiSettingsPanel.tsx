import { useState } from "react";
import { KeyRound, Settings, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { OPENROUTER_MODELS, type OpenRouterModel } from "./openrouter-models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import type { AiSettings, AiStorageType } from "@/types/ai-settings";

const DEFAULT_MODEL: OpenRouterModel = "deepseek/deepseek-chat-v3-0324";

interface AiSettingsPanelProps {
  settings: AiSettings | null;
  onSave: (settings: AiSettings) => void;
  onClear: () => void;
}

export function AiSettingsPanel({ settings, onSave, onClear }: AiSettingsPanelProps) {
  const [open, setOpen] = useState(!settings);
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
  const [model, setModel] = useState<OpenRouterModel>(settings?.model ?? DEFAULT_MODEL);
  const [storageType, setStorageType] = useState<AiStorageType>(settings?.storageType ?? "local");
  const [showKey, setShowKey] = useState(false);

  function handleSave() {
    if (!apiKey.trim()) return;
    onSave({ apiKey: apiKey.trim(), model, storageType });
    setOpen(false);
  }

  function handleClear() {
    setApiKey("");
    setModel(DEFAULT_MODEL);
    setStorageType("local");
    onClear();
    setOpen(true);
  }

  const isConfigured = !!settings;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          <Settings className="size-4 text-muted-foreground" />
          AI Provider Settings
          {isConfigured && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-normal text-green-700 dark:text-green-400">
              Configured · {settings.model.split("/").pop()}
            </span>
          )}
          {!isConfigured && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-normal text-destructive">
              API key required
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-api-key">OpenRouter API Key</Label>
            <div className="relative">
              <Input
                id="ai-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="pr-9"
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
              Your key is stored only in your browser and sent directly to OpenRouter. It is never
              saved on our servers.{" "}
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
            <Label>Model</Label>
            <Combobox value={model} onValueChange={(v) => v && setModel(v as OpenRouterModel)}>
              <ComboboxInput placeholder="Search models..." showClear={false} className="w-full" />
              <ComboboxContent className="w-full">
                <ComboboxList>
                  <ComboboxEmpty>No models found.</ComboboxEmpty>
                  {OPENROUTER_MODELS.map((m) => (
                    <ComboboxItem key={m} value={m}>
                      {m}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Key storage</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStorageType("local")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                  storageType === "local"
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Local storage
                <span className="block text-xs font-normal opacity-70">Persists across tabs</span>
              </button>
              <button
                type="button"
                onClick={() => setStorageType("session")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                  storageType === "session"
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Session storage
                <span className="block text-xs font-normal opacity-70">Cleared on tab close</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!apiKey.trim()}
              size="sm"
              className="gap-2"
            >
              <KeyRound className="size-3.5" />
              Save settings
            </Button>
            {isConfigured && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
