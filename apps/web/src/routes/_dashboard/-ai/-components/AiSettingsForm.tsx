import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { openRouterModelEndpointsQueryOptions } from "@/lib/openrouter/endpoints";
import { ModelPicker } from "@/lib/openrouter/ModelPicker";
import { ProviderRoutingPicker } from "@/lib/openrouter/ProviderRoutingPicker";
import {
  DEFAULT_AI_ROUTING,
  DEFAULT_MODEL,
  resolveRouting,
  type AiRouting,
} from "@/lib/openrouter/routing";
import { useOpenRouterModels } from "@/lib/openrouter/models";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useEventSourcedAiSettings } from "../-hooks/use-event-sourced-ai-settings";
import {
  DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT,
  EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS,
} from "../-utils/system-prompt";

interface AiSettingsFormProps {
  apiKeyRejected?: boolean;
  /** "connection" keeps only the key and model, for quick setup. */
  variant?: "full" | "connection";
  bodyClassName?: string;
  footerClassName?: string;
  onSaved?: () => void;
}

/**
 * Edits the AI settings every assistant shares (stored in the local database and synced).
 * Drafts start from the saved values when it mounts, so remount it to discard edits.
 */
export function AiSettingsForm({
  apiKeyRejected = false,
  variant = "full",
  bodyClassName,
  footerClassName,
  onSaved,
}: AiSettingsFormProps) {
  const aiSettings = useEventSourcedAiSettings();
  const { settings, systemPrompt, isCustomSystemPrompt, slopGuard } = aiSettings;
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
  const [model, setModel] = useState(settings?.model ?? DEFAULT_MODEL);
  const [routing, setRouting] = useState<AiRouting>(settings?.routing ?? DEFAULT_AI_ROUTING);
  const [promptDraft, setPromptDraft] = useState(systemPrompt);
  const [slopGuardDraft, setSlopGuardDraft] = useState(slopGuard);
  const [showKey, setShowKey] = useState(false);
  const promptDirty = promptDraft !== systemPrompt;
  const isFull = variant === "full";

  const { data: models } = useOpenRouterModels();
  const { data: endpoints } = useQuery({
    ...openRouterModelEndpointsQueryOptions(model),
    enabled: model.length > 0,
  });

  function handleModelChange(next: string) {
    if (next === model) return;
    setModel(next);
    if (routing.mode === "custom") setRouting({ ...routing, providers: [] });
  }

  function handleSave() {
    if (!apiKey.trim() || !model) return;
    aiSettings.saveSettings({
      apiKey: apiKey.trim(),
      model,
      storageType: "local",
      routing: resolveRouting(
        model,
        isFull ? routing : (settings?.routing ?? DEFAULT_AI_ROUTING),
        endpoints,
        models?.find((candidate) => candidate.id === model),
      ),
    });
    if (isFull && promptDirty) aiSettings.saveSystemPrompt(promptDraft);
    if (isFull && slopGuardDraft !== slopGuard) aiSettings.saveSlopGuard(slopGuardDraft);
    onSaved?.();
  }

  function handleClear() {
    aiSettings.clearSettings();
    setApiKey("");
  }

  return (
    <>
      <div className={cn("flex flex-col gap-6", bodyClassName)} data-test="ai-settings-form">
        <SettingsSection
          title="OpenRouter API key"
          aside={
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Get a key
            </a>
          }
        >
          {apiKeyRejected ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              data-test="event-sourced-api-key-invalid"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                Invalid API key. OpenRouter rejected the saved key. Check it for typos or create a
                new one at openrouter.ai/keys.
              </p>
            </div>
          ) : null}
          <div className="relative">
            <Input
              id="event-sourced-api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-or-v1-..."
              autoComplete="off"
              aria-label="OpenRouter API key"
              aria-invalid={apiKeyRejected || undefined}
              className={cn(
                "pr-11",
                apiKeyRejected &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40",
              )}
              data-test="event-sourced-api-key-input"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Model"
          aside={<span className="truncate font-mono text-xs">{model}</span>}
        >
          <ModelPicker value={model} onChange={handleModelChange} />
        </SettingsSection>

        {isFull ? (
          <SettingsSection title="Provider routing">
            <ProviderRoutingPicker modelId={model} value={routing} onChange={setRouting} />
          </SettingsSection>
        ) : null}

        {isFull ? (
          <>
            <SettingsSection
              title="Résumé assistant instructions"
              aside={isCustomSystemPrompt || promptDirty ? "Custom" : "Default"}
            >
              <Textarea
                id="event-sourced-system-prompt"
                value={promptDraft}
                onChange={(event) =>
                  setPromptDraft(event.target.value.slice(0, EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS))
                }
                rows={10}
                aria-label="System prompt"
                className="min-h-40 font-mono text-xs leading-5"
                data-test="event-sourced-system-prompt-input"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  {promptDraft.length.toLocaleString()} /{" "}
                  {EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS.toLocaleString()}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!isCustomSystemPrompt && !promptDirty}
                  onClick={() => {
                    aiSettings.resetSystemPrompt();
                    setPromptDraft(DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT);
                  }}
                  data-test="event-sourced-system-prompt-reset"
                >
                  Reset default
                </Button>
              </div>
            </SettingsSection>

            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="event-sourced-slop-guard">Slop guard</Label>
                <p className="text-muted-foreground text-xs">
                  Adds strict writing-style rules against filler, stock phrases, and empty polish.
                  Some models follow them too literally, so it is off by default.
                </p>
              </div>
              <Switch
                id="event-sourced-slop-guard"
                checked={slopGuardDraft}
                onCheckedChange={setSlopGuardDraft}
                data-test="event-sourced-slop-guard-toggle"
              />
            </div>
          </>
        ) : null}
      </div>

      <div className={cn("flex flex-row items-center justify-end gap-2", footerClassName)}>
        {settings ? (
          <Button type="button" variant="ghost" size="sm" className="mr-auto" onClick={handleClear}>
            Clear key
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={!apiKey.trim() || !model}
          onClick={handleSave}
          data-test="event-sourced-ai-settings-save"
        >
          <KeyRound className="size-3.5" />
          Save
        </Button>
      </div>
    </>
  );
}

function SettingsSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Label className="shrink-0">{title}</Label>
        {aside ? <span className="text-muted-foreground min-w-0 text-xs">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}
