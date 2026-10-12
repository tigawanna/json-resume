import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  DEFAULT_STRESS_CONFIG,
  type ChatStressConfig,
  type StressPersistence,
} from "../-utils/fake-chat-stream";
import { ChatStressRun } from "./ChatStressRun";

type NumberSetting = "totalTokens" | "tokensPerSecond" | "tokensPerChunk" | "tokensPerMessage";

const NUMBER_SETTINGS: Array<{ key: NumberSetting; label: string; min: number; hint: string }> = [
  { key: "totalTokens", label: "Total tokens", min: 1, hint: "Whole run" },
  { key: "tokensPerSecond", label: "Tokens / second", min: 1, hint: "Target pace" },
  { key: "tokensPerChunk", label: "Tokens / chunk", min: 1, hint: "Per stream event" },
  { key: "tokensPerMessage", label: "Tokens / message", min: 0, hint: "0 = one giant message" },
];

const PERSISTENCE_OPTIONS: Array<{ value: StressPersistence; label: string }> = [
  { value: "local-db", label: "Local DB (like the résumé chat)" },
  { value: "local-storage", label: "localStorage (like the dashboard assistant)" },
  { value: "none", label: "None" },
];

function isPersistence(value: string): value is StressPersistence {
  return PERSISTENCE_OPTIONS.some((option) => option.value === value);
}

/**
 * Streams a scripted reply through the résumé chat's real client and UI, with no
 * model calls, and logs FPS to the console with the `[chat-stress]` prefix.
 */
export function ChatStressPage() {
  const [config, setConfig] = useState<ChatStressConfig>(DEFAULT_STRESS_CONFIG);
  const [persistence, setPersistence] = useState<StressPersistence>("local-db");
  const [running, setRunning] = useState(false);

  function setNumber(key: NumberSetting, raw: string, min: number) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setConfig((current) => ({ ...current, [key]: Math.max(min, Math.round(value)) }));
  }

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-4"
      style={{ height: "calc(100dvh - 6rem)" }}
      data-test="chat-stress-page"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Chat stress test</h1>
        <p className="text-sm text-muted-foreground">
          Streams fake thinking, markdown and tool calls through the résumé chat UI. Open the
          console and filter by <code>[chat-stress]</code>: one line a second, then a table and a
          summary when the run ends. Keep this tab visible while it runs.
        </p>
      </header>

      <fieldset
        disabled={running}
        className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 p-3 md:grid-cols-4 lg:grid-cols-7"
        data-test="chat-stress-settings"
      >
        {NUMBER_SETTINGS.map(({ key, label, min, hint }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`chat-stress-${key}`}>{label}</Label>
            <Input
              id={`chat-stress-${key}`}
              type="number"
              min={min}
              value={config[key]}
              onChange={(event) => setNumber(key, event.target.value, min)}
              data-test={`chat-stress-${key}`}
            />
            <span className="text-xs text-muted-foreground">{hint}</span>
          </div>
        ))}
        <div className="flex flex-col gap-2">
          <Label htmlFor="chat-stress-thinking">Thinking</Label>
          <Switch
            id="chat-stress-thinking"
            checked={config.thinking}
            onCheckedChange={(thinking) => setConfig((current) => ({ ...current, thinking }))}
            data-test="chat-stress-thinking"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="chat-stress-tool-calls">Tool calls</Label>
          <Switch
            id="chat-stress-tool-calls"
            checked={config.toolCalls}
            onCheckedChange={(toolCalls) => setConfig((current) => ({ ...current, toolCalls }))}
            data-test="chat-stress-tool-calls"
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
          <Label htmlFor="chat-stress-persistence">Persistence</Label>
          <NativeSelect
            id="chat-stress-persistence"
            value={persistence}
            onChange={(event) => {
              if (isPersistence(event.target.value)) setPersistence(event.target.value);
            }}
            data-test="chat-stress-persistence"
          >
            {PERSISTENCE_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </fieldset>

      <ChatStressRun
        key={persistence}
        config={config}
        persistence={persistence}
        onRunningChange={setRunning}
      />
    </div>
  );
}
