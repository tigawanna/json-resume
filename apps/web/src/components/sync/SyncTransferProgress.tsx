import { useSyncTransferProgress } from "@/data-access-layer/event-sourced/sync-progress";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Meter({ value, testId }: { value: number | null; testId: string }) {
  const indeterminate = value == null;
  return (
    <div
      className="bg-primary/15 relative h-1.5 overflow-hidden rounded-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
      data-test={testId}
    >
      <div
        className={cn(
          "bg-primary h-full rounded-full",
          indeterminate ? "w-2/5 animate-pulse" : "transition-[width] duration-300",
        )}
        style={indeterminate ? undefined : { width: `${value}%` }}
      />
    </div>
  );
}

export function SyncTransferProgress() {
  const progress = useSyncTransferProgress();

  const uploadValue =
    progress.uploadTotal === 0
      ? progress.uploadActive
        ? null
        : 0
      : Math.min(100, Math.round((progress.uploadDone / progress.uploadTotal) * 100));
  const uploadDetail = [
    progress.uploadTotal > 0 ? `${progress.uploadDone} of ${progress.uploadTotal}` : "Waiting",
    progress.uploadChunkEvents > 0
      ? `sending ${progress.uploadChunkEvents} · ${formatBytes(progress.uploadChunkBytes)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const downloadValue = progress.downloadHasMore || progress.downloadReceived === 0 ? null : 100;
  const downloadDetail =
    progress.downloadReceived === 0
      ? "Starting"
      : progress.downloadHasMore
        ? `${progress.downloadReceived} events, more coming`
        : `${progress.downloadReceived} events`;

  return (
    <div className="flex w-full flex-col gap-4" data-test="sync-transfer-progress">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-medium">Upload</span>
          <span className="text-muted-foreground tabular-nums">{uploadDetail}</span>
        </div>
        <Meter value={uploadValue} testId="sync-upload-progress" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-medium">Download</span>
          <span className="text-muted-foreground tabular-nums">{downloadDetail}</span>
        </div>
        <Meter value={downloadValue} testId="sync-download-progress" />
      </div>
    </div>
  );
}
