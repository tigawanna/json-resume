import { CloudAlert, CloudCheck, RefreshCw, RefreshCwOff } from "lucide-react";
import { useEffect, useState } from "react";

type SyncPhase = "local" | "syncing" | "synced" | "error";

const PHASE_COPY: Record<SyncPhase, { label: string; detail: string }> = {
  local: {
    label: "On this machine",
    detail: "Edits stay in the browser. Nothing is waiting to leave.",
  },
  syncing: {
    label: "Copying up",
    detail: "Pushing the local events to the managed server.",
  },
  synced: {
    label: "Synced",
    detail: "The server has the same library as this browser.",
  },
  error: {
    label: "Push failed",
    detail: "The local library is unchanged. Retry when the link is back.",
  },
};

const PHASE_CLASS: Record<SyncPhase, string> = {
  local: "border-border bg-neutral/60 text-base-content",
  syncing: "border-primary/50 bg-primary/15 text-primary",
  synced: "border-primary bg-primary/20 text-primary",
  error: "border-error/60 bg-error/15 text-error",
};

export function LandingSyncDemo() {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<SyncPhase>("local");

  useEffect(() => {
    if (phase !== "syncing") return;
    const id = window.setTimeout(() => setPhase("synced"), 1100);
    return () => window.clearTimeout(id);
  }, [phase]);

  function toggle(next: boolean) {
    setEnabled(next);
    setPhase(next ? "syncing" : "local");
  }

  function failPush() {
    if (!enabled) return;
    setPhase("error");
  }

  function retry() {
    if (!enabled) return;
    setPhase("syncing");
  }

  const copy = PHASE_COPY[phase];
  const Icon =
    phase === "local" ? RefreshCwOff : phase === "syncing" ? RefreshCw : phase === "error" ? CloudAlert : CloudCheck;

  return (
    <div
      data-test="landing-sync-demo"
      data-sync-phase={phase}
      className={`flex h-full flex-col border p-5 transition-colors duration-300 md:p-6 ${PHASE_CLASS[phase]}`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`size-5 ${phase === "syncing" ? "motion-safe:animate-spin" : ""}`}
          strokeWidth={2.25}
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium">{copy.label}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-80">{copy.detail}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border border-current/15 px-3 py-2">
        <span className="font-mono text-xs">Managed sync</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          data-test="landing-sync-toggle"
          onClick={() => toggle(!enabled)}
          className={`relative h-6 w-11 shrink-0 transition-colors ${
            enabled
              ? "border-2 border-primary bg-primary"
              : "border-2 border-primary bg-base-300 outline outline-2 outline-offset-2 outline-primary"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-4 bg-base-100 shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
          <span className="sr-only">{enabled ? "Turn sync off" : "Turn sync on"}</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!enabled}
          onClick={retry}
          className="border border-current/30 px-3 py-1.5 font-mono text-xs enabled:hover:bg-base-100/40 disabled:opacity-40"
        >
          Sync now
        </button>
        <button
          type="button"
          disabled={!enabled || phase === "syncing"}
          onClick={failPush}
          className="border border-current/30 px-3 py-1.5 font-mono text-xs enabled:hover:bg-base-100/40 disabled:opacity-40"
        >
          Drop the link
        </button>
      </div>
    </div>
  );
}
