import { log as standaloneLog } from "evlog";

export function requestLog(): {
  set: (fields: Record<string, unknown>) => void;
  warn: (message: string) => void;
} | null {
  return null;
}

export function logFields(message: string, fields: Record<string, unknown>) {
  standaloneLog.info({ message, ...fields });
}
