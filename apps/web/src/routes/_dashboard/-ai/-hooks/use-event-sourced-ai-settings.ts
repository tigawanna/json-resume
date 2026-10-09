import {
  APP_SETTINGS_ID,
  readAppSettings,
  updateAppSettings,
} from "@/data-access-layer/event-sourced/app-settings";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { DEFAULT_AI_ROUTING } from "@/features/agentic-tools/openrouter-routing";
import type { AiSettings } from "@/types/ai-settings";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useRef } from "react";
import {
  DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT,
  EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS,
} from "../-utils/system-prompt";

const LEGACY_STORAGE_TYPE_KEY = "ai_storage_type";
const LEGACY_CREDENTIALS_KEY = "ai_credentials";
const LEGACY_SYSTEM_PROMPT_KEY = "event-sourced-resume-ai-system-prompt";
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";

function readLegacyAiSettings(): { apiKey: string; model: string } | null {
  try {
    const storageType =
      localStorage.getItem(LEGACY_STORAGE_TYPE_KEY) === "session" ? "session" : "local";
    const storage = storageType === "session" ? sessionStorage : localStorage;
    const raw = storage.getItem(LEGACY_CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { apiKey?: unknown; model?: unknown };
    if (typeof parsed.apiKey !== "string" || !parsed.apiKey.trim()) return null;
    return {
      apiKey: parsed.apiKey.trim(),
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model : DEFAULT_MODEL,
    };
  } catch {
    return null;
  }
}

function readLegacySystemPrompt(): string | null {
  try {
    const raw = localStorage.getItem(LEGACY_SYSTEM_PROMPT_KEY);
    if (!raw?.trim()) return null;
    return raw.slice(0, EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS);
  } catch {
    return null;
  }
}

export function useEventSourcedAiSettings() {
  const db = useEventSourcedDb();
  readAppSettings(db);
  const migratedRef = useRef(false);

  const { data } = useLiveQuery(
    (q) => q.from({ row: db.collections.settings }).where(({ row }) => eq(row.id, APP_SETTINGS_ID)),
    [],
  );
  const row = data?.[0] ?? readAppSettings(db);

  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    const current = readAppSettings(db);
    const patch: { aiApiKey?: string; aiModel?: string; aiSystemPrompt?: string } = {};

    if (!current.aiApiKey) {
      const legacy = readLegacyAiSettings();
      if (legacy) {
        patch.aiApiKey = legacy.apiKey;
        patch.aiModel = current.aiModel || legacy.model;
      }
    }
    if (current.aiSystemPrompt === undefined) {
      const legacyPrompt = readLegacySystemPrompt();
      if (legacyPrompt) patch.aiSystemPrompt = legacyPrompt;
    }
    if (Object.keys(patch).length > 0) updateAppSettings(db, patch);
  }, [db]);

  const apiKey = row.aiApiKey?.trim() ?? "";
  const model = row.aiModel?.trim() || DEFAULT_MODEL;
  const systemPrompt = row.aiSystemPrompt?.trim()
    ? row.aiSystemPrompt.slice(0, EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS)
    : DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT;

  const routing = row.aiRouting ?? DEFAULT_AI_ROUTING;

  const settings: AiSettings | null = apiKey
    ? { apiKey, model, storageType: "local", routing }
    : null;

  function saveSettings(next: AiSettings) {
    updateAppSettings(db, {
      aiApiKey: next.apiKey.trim(),
      aiModel: next.model,
      aiRouting: next.routing,
    });
  }

  function clearSettings() {
    updateAppSettings(db, { aiApiKey: "", aiModel: "", aiRouting: undefined });
  }

  function saveSystemPrompt(next: string) {
    const value = next.slice(0, EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS);
    updateAppSettings(db, {
      aiSystemPrompt: value.trim() === DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT ? "" : value,
    });
  }

  function resetSystemPrompt() {
    updateAppSettings(db, { aiSystemPrompt: "" });
  }

  return {
    settings,
    saveSettings,
    clearSettings,
    systemPrompt,
    saveSystemPrompt,
    resetSystemPrompt,
    isCustomSystemPrompt: Boolean(row.aiSystemPrompt?.trim()),
  };
}
