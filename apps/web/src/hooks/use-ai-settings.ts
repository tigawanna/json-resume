import { useState } from "react";
import type { AiCredentials, AiSettings, AiStorageType } from "@/types/ai-settings";

const STORAGE_TYPE_KEY = "ai_storage_type";
const CREDENTIALS_KEY = "ai_credentials";

function getStorage(type: AiStorageType): Storage {
  return type === "session" ? sessionStorage : localStorage;
}

function readSettings(): AiSettings | null {
  try {
    const storageType = (localStorage.getItem(STORAGE_TYPE_KEY) as AiStorageType) ?? "local";
    const raw = getStorage(storageType).getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const credentials = JSON.parse(raw) as AiCredentials;
    return { ...credentials, storageType };
  } catch {
    return null;
  }
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings | null>(readSettings);

  function saveSettings(next: AiSettings) {
    const { storageType, ...credentials } = next;
    if (settings && settings.storageType !== storageType) {
      getStorage(settings.storageType).removeItem(CREDENTIALS_KEY);
    }
    localStorage.setItem(STORAGE_TYPE_KEY, storageType);
    getStorage(storageType).setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    setSettings(next);
  }

  function clearSettings() {
    if (settings) {
      getStorage(settings.storageType).removeItem(CREDENTIALS_KEY);
    }
    localStorage.removeItem(STORAGE_TYPE_KEY);
    setSettings(null);
  }

  return { settings, saveSettings, clearSettings };
}
