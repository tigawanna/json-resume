import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { openRouterModelEndpointsQueryOptions } from "@/data-access-layer/openrouter/model-endpoints";
import { ModelPicker } from "@/features/agentic-tools/ModelPicker";
import { ProviderRoutingPicker } from "@/features/agentic-tools/ProviderRoutingPicker";
import {
  DEFAULT_AI_ROUTING,
  resolveRouting,
  type AiRouting,
} from "@/features/agentic-tools/openrouter-routing";
import { useOpenRouterModels } from "@/hooks/use-openrouter-models";
import type { AiSettings } from "@/types/ai-settings";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { isLocalMode } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-types";
import {
  EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS,
  DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT,
} from "../-utils/system-prompt";

const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";

interface EventSourcedAiSettingsSheetProps {
  open: boolean;
  settings: AiSettings | null;
  systemPrompt: string;
  isCustomSystemPrompt: boolean;
  onOpenChange: (open: boolean) => void;
  onClearSettings: () => void;
  onSaveSettings: (settings: AiSettings) => void;
  onSaveSystemPrompt: (value: string) => void;
  onResetSystemPrompt: () => void;
}

export function EventSourcedAiSettingsSheet({
  open,
  settings,
  systemPrompt,
  isCustomSystemPrompt,
  onOpenChange,
  onClearSettings,
  onSaveSettings,
  onSaveSystemPrompt,
  onResetSystemPrompt,
}: EventSourcedAiSettingsSheetProps) {
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
  const [model, setModel] = useState(settings?.model ?? DEFAULT_MODEL);
  const [routing, setRouting] = useState<AiRouting>(settings?.routing ?? DEFAULT_AI_ROUTING);
  const [promptDraft, setPromptDraft] = useState(systemPrompt);
  const [showKey, setShowKey] = useState(false);
  const promptDirty = promptDraft !== systemPrompt;

  const { data: models } = useOpenRouterModels();
  const { data: endpoints } = useQuery({
    ...openRouterModelEndpointsQueryOptions(model),
    enabled: open && !isLocalMode && model.length > 0,
  });

  useEffect(() => {
    if (!open) return;
    setApiKey(settings?.apiKey ?? "");
    setModel(settings?.model ?? DEFAULT_MODEL);
    setRouting(settings?.routing ?? DEFAULT_AI_ROUTING);
    setPromptDraft(systemPrompt);
    setShowKey(false);
  }, [open, settings, systemPrompt]);

  function handleModelChange(next: string) {
    if (next === model) return;
    setModel(next);
    if (routing.mode === "custom") setRouting({ ...routing, providers: [] });
  }

  function handleSave() {
    if (!isLocalMode) {
      if (!apiKey.trim() || !model) return;
      onSaveSettings({
        apiKey: apiKey.trim(),
        model,
        storageType: "local",
        routing: resolveRouting(
          model,
          routing,
          endpoints,
          models?.find((candidate) => candidate.id === model),
        ),
      });
    }
    if (promptDirty) onSaveSystemPrompt(promptDraft);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-xl lg:max-w-2xl"
        data-test="event-sourced-ai-settings-sheet"
      >
        <SheetHeader className="border-border/60 border-b px-6 py-4">
          <SheetTitle>AI settings</SheetTitle>
          <SheetDescription>
            Key, model, provider routing, and system prompt. Stored in the local database and synced
            when sync is on.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {isLocalMode ? (
            <p className="text-muted-foreground text-sm">Using LM Studio. No API key required.</p>
          ) : (
            <>
              <SettingsSection title="OpenRouter API key">
                <div className="relative">
                  <Input
                    id="event-sourced-api-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-or-v1-..."
                    autoComplete="off"
                    aria-label="OpenRouter API key"
                    className="pr-11"
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

              <SettingsSection title="Provider routing">
                <ProviderRoutingPicker modelId={model} value={routing} onChange={setRouting} />
              </SettingsSection>
            </>
          )}

          <SettingsSection
            title="System prompt"
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
                  onResetSystemPrompt();
                  setPromptDraft(DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT);
                }}
                data-test="event-sourced-system-prompt-reset"
              >
                Reset default
              </Button>
            </div>
          </SettingsSection>
        </div>

        <SheetFooter className="border-border/60 flex-row justify-end border-t px-6 py-4">
          {settings && !isLocalMode ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-auto"
              onClick={onClearSettings}
            >
              Clear key
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={!isLocalMode && (!apiKey.trim() || !model)}
            onClick={handleSave}
            data-test="event-sourced-ai-settings-save"
          >
            <KeyRound className="size-3.5" />
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
