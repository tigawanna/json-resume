import { unwrapUnknownError } from "@/utils/errors";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const SAVE_DELAY_MS = 2000;

export type ResumeAutosaveStatus = "saved" | "pending" | "saving" | "error";
/**
 * Saves a section shortly after its snapshot changes.
 * `save` is read from a ref so a new function each render does not retrigger the timer.
 */
export function useResumeAutosave({
  fingerprint,
  savedFingerprint,
  canSave,
  save,
}: {
  fingerprint: string;
  savedFingerprint: string;
  canSave: boolean;
  save: () => Promise<unknown>;
}): ResumeAutosaveStatus {
  const dirty = fingerprint !== savedFingerprint;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty || !canSave) return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setError(false);
      void saveRef
        .current()
        .then(() => {
          if (mountedRef.current) setError(false);
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return;
          setError(true);
          toast.error("Failed to save", { description: unwrapUnknownError(err).message });
        })
        .finally(() => {
          if (mountedRef.current) setSaving(false);
        });
    }, SAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [canSave, dirty, fingerprint]);

  if (error) return "error";
  if (saving) return "saving";
  if (dirty) return "pending";
  return "saved";
}

/** Watches a draft object and autosaves it when it differs from the last saved copy. */
export function DraftAutosave<T>({
  value,
  saved,
  canSave,
  blocked,
  save,
}: {
  value: T;
  saved: T;
  canSave: boolean;
  blocked?: string;
  save: (value: T) => Promise<unknown>;
}) {
  const status = useResumeAutosave({
    fingerprint: JSON.stringify(value),
    savedFingerprint: JSON.stringify(saved),
    canSave,
    save: () => save(value),
  });
  return <AutosaveStatus status={status} blocked={canSave ? undefined : blocked} />;
}

export function AutosaveStatus({
  status,
  blocked,
}: {
  status: ResumeAutosaveStatus;
  /** Shown instead of "Unsaved" when the draft cannot be saved yet. */
  blocked?: string;
}) {
  let text = "Saved";
  if (status === "saving") text = "Saving…";
  else if (status === "error") text = "Could not save";
  else if (status === "pending") text = blocked ?? "Unsaved";

  return (
    <p className="text-muted-foreground text-xs" data-test="autosave-status">
      {text}
    </p>
  );
}
