import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import {
  eventsThatFit,
  getPresetPushLimits,
  resetSyncPushTuning,
  setSyncPushBatchSize,
  useSyncPushTuning,
} from "@/data-access-layer/event-sourced/sync-push-tuning";
import { useId, useState } from "react";

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${Math.round(bytes)} B`;
}

export function SyncBatchSizeControl({ disabled = false }: { disabled?: boolean }) {
  const db = useEventSourcedDb();
  const sliderId = useId();
  const tuning = useSyncPushTuning();
  const limits = db.getPushLimits();
  const preset = getPresetPushLimits(db);
  const batchSize = tuning.pushBatchSize ?? limits.pushBatchSize;
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? batchSize;

  const stats = tuning.stats;
  const fit = eventsThatFit(limits.maxPushBytes, stats);
  const effective = fit === null ? shown : Math.min(shown, fit);
  const tooLarge = stats?.lastTooLarge;
  const tuned =
    tuning.pushBatchSize !== undefined || tuning.maxPushBytes !== undefined || stats !== undefined;

  return (
    <div className="flex flex-col gap-3" data-test="sync-batch-size">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={sliderId} className="text-sm font-medium">
          Events per push request
        </Label>
        <span className="text-sm tabular-nums" data-test="sync-batch-size-value">
          {shown}
        </span>
      </div>
      <Slider
        id={sliderId}
        min={1}
        max={100}
        step={1}
        value={[shown]}
        disabled={disabled}
        onValueChange={([value]) => setDraft(value ?? null)}
        onValueCommit={([value]) => {
          if (value !== undefined) setSyncPushBatchSize(db, value);
          setDraft(null);
        }}
        data-test="sync-batch-size-slider"
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        {limits.maxPushBytes === null
          ? "No size cap; every request sends up to this many events."
          : fit === null
            ? `Requests also stop at ${formatBytes(limits.maxPushBytes)}, so large rows go out in smaller batches.`
            : `Requests stop at ${formatBytes(limits.maxPushBytes)}. Your events average ${formatBytes(stats?.avgEventBytes ?? 0)}, so about ${fit} fit; each request sends up to ${effective}.`}
      </p>
      {stats && stats.largestOkEvents > 0 ? (
        <p className="text-muted-foreground text-xs" data-test="sync-batch-size-history">
          Largest accepted request: {stats.largestOkEvents} events,{" "}
          {formatBytes(stats.largestOkBytes)}.
        </p>
      ) : null}
      {tooLarge ? (
        <p className="text-warning text-xs leading-relaxed" data-test="sync-batch-size-dropped">
          On {new Date(tooLarge.at).toLocaleString()} the server rejected {tooLarge.events} events (
          {formatBytes(tooLarge.bytes)}) as too large. Lowered to {tooLarge.droppedTo} events per
          request
          {tooLarge.droppedFrom !== tooLarge.droppedTo ? ` (from ${tooLarge.droppedFrom})` : ""} and
          a {formatBytes(tooLarge.maxBytesTo)} cap.
        </p>
      ) : null}
      {tuned ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => resetSyncPushTuning(db)}
          data-test="sync-batch-size-reset"
        >
          Reset to defaults ({preset.pushBatchSize} events
          {preset.maxPushBytes === null ? "" : `, ${formatBytes(preset.maxPushBytes)}`})
        </Button>
      ) : null}
    </div>
  );
}
