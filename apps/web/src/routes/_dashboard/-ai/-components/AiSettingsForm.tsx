import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { pingOpenRouter } from "@/lib/openrouter/api";
import { openRouterModelEndpointsQueryOptions } from "@/lib/openrouter/endpoints";
import { ModelPicker } from "@/lib/openrouter/ModelPicker";
import { useOpenRouterModels } from "@/lib/openrouter/models";
import { ProviderRoutingPicker } from "@/lib/openrouter/ProviderRoutingPicker";
import {
  DEFAULT_AI_ROUTING,
  DEFAULT_MODEL,
  resolveRouting,
  type AiRouting,
} from "@/lib/openrouter/routing";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Eye, EyeOff, Info, KeyRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

type PingState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ok"; reply: string }
  | { status: "error"; message: string };

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
  const [tipsOpen, setTipsOpen] = useState(() => apiKey.trim() === "");
  const pingKeyRef = useRef("");
  const [pingState, setPingState] = useState<PingState>({ status: "idle" });
  const promptDirty = promptDraft !== systemPrompt;

  useEffect(() => {
    if (localStorage.getItem(OPENROUTER_TIPS_DISMISSED_KEY) === "1") setTipsOpen(false);
  }, []);
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

  async function handlePing(key = apiKey.trim()) {
    if (!key || !model) return;
    pingKeyRef.current = key;
    setPingState({ status: "pending" });
    try {
      const reply = await pingOpenRouter({ apiKey: key, model });
      setPingState({ status: "ok", reply });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OpenRouter did not respond";
      setPingState({ status: "error", message });
    }
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
          {tipsOpen ? (
            <OpenRouterTips
              onDismiss={() => {
                localStorage.setItem(OPENROUTER_TIPS_DISMISSED_KEY, "1");
                setTipsOpen(false);
              }}
            />
          ) : null}
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Input
                id="event-sourced-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => {
                  const next = event.target.value;
                  setApiKey(next);
                  if (next.trim() !== pingKeyRef.current) setPingState({ status: "idle" });
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text").trim();
                  if (!pasted || !model) return;
                  void handlePing(pasted);
                }}
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
            <button
              type="button"
              onClick={() =>
                setTipsOpen((open) => {
                  if (open) localStorage.setItem(OPENROUTER_TIPS_DISMISSED_KEY, "1");
                  return !open;
                })
              }
              className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
              aria-label={tipsOpen ? "Hide OpenRouter tips" : "OpenRouter tips"}
              aria-expanded={tipsOpen}
              data-test="openrouter-tips-toggle"
            >
              <Info className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!apiKey.trim() || !model || pingState.status === "pending"}
              onClick={() => void handlePing()}
              data-test="event-sourced-api-key-ping"
            >
              {pingState.status === "pending" ? "Pinging…" : "Try key"}
            </Button>
            {pingState.status === "ok" ? (
              <p
                className="bg-success/15 text-success flex items-center gap-1.5 rounded-md px-2 py-1 text-sm"
                data-test="event-sourced-api-key-ping-ok"
              >
                <Check className="size-3.5" />
                Key works. OpenRouter replied: {pingState.reply}
              </p>
            ) : null}
            {pingState.status === "error" ? (
              <p
                className="bg-error/15 text-error flex items-center gap-1.5 rounded-md px-2 py-1 text-sm"
                data-test="event-sourced-api-key-ping-error"
              >
                <X className="size-3.5" />
                {pingState.message}
              </p>
            ) : null}
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
            <Accordion type="single" collapsible data-test="event-sourced-system-prompt-accordion">
              <AccordionItem value="instructions" className="border-0">
                <AccordionTrigger className="group py-1 hover:no-underline">
                  <span className="flex min-w-0 flex-1 flex-col gap-1 pr-2 text-left">
                    <span className="flex items-center justify-between gap-3">
                      <span>Résumé assistant instructions</span>
                      <span className="text-muted-foreground text-xs font-normal">
                        {isCustomSystemPrompt || promptDirty ? "Custom" : "Default"}
                      </span>
                    </span>
                    <span className="text-muted-foreground line-clamp-3 text-xs font-normal whitespace-pre-wrap group-data-[state=open]:hidden">
                      {promptDraft}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2">
                  <Textarea
                    id="event-sourced-system-prompt"
                    value={promptDraft}
                    onChange={(event) =>
                      setPromptDraft(
                        event.target.value.slice(0, EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS),
                      )
                    }
                    rows={16}
                    aria-label="System prompt"
                    className="field-sizing-fixed max-h-[50vh] min-h-80 resize-y font-mono text-xs leading-5"
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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

const OPENROUTER_TIPS_DISMISSED_KEY = "openrouter-key-tips-dismissed";

function OpenRouterTips({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="bg-base-200/70 relative rounded-lg px-3 py-2.5 pr-8 text-sm text-base-content/80"
      data-test="openrouter-tips"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-md"
        aria-label="Dismiss OpenRouter tips"
        data-test="openrouter-tips-dismiss"
      >
        <X className="size-3.5" />
      </button>
      <p className="mb-1.5 font-medium text-base-content">Before you rely on this key</p>
      <ul className="grid list-disc gap-1 pl-4">
        <li>
          Route through the model lab&apos;s official provider. Third-party hosts often drop tool
          calls.
        </li>
        <li>Pick a model that supports tool calls. The résumé agent cannot edit without them.</li>
        <li>
          Set a spend limit on the key at{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            openrouter.ai/keys
          </a>
          . Account balance can still be left after that cap is spent.
        </li>
      </ul>
    </div>
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
