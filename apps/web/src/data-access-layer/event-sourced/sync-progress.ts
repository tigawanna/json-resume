import { useSyncExternalStore } from "react";

export type SyncTransferProgress = {
  uploadActive: boolean;
  uploadDone: number;
  uploadTotal: number;
  uploadChunkEvents: number;
  uploadChunkBytes: number;
  downloadActive: boolean;
  downloadReceived: number;
  downloadHasMore: boolean;
};

const IDLE: SyncTransferProgress = {
  uploadActive: false,
  uploadDone: 0,
  uploadTotal: 0,
  uploadChunkEvents: 0,
  uploadChunkBytes: 0,
  downloadActive: false,
  downloadReceived: 0,
  downloadHasMore: false,
};

let current = IDLE;
const listeners = new Set<() => void>();

function emit(next: SyncTransferProgress) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncTransferProgress(): SyncTransferProgress {
  return current;
}

export function useSyncTransferProgress(): SyncTransferProgress {
  return useSyncExternalStore(subscribe, getSyncTransferProgress, getSyncTransferProgress);
}

export function beginSyncProgress(uploadTotal: number) {
  emit({
    ...IDLE,
    uploadActive: uploadTotal > 0,
    uploadTotal,
  });
}

export function noteUploadChunk(events: number, bytes: number) {
  emit({
    ...current,
    uploadActive: true,
    uploadChunkEvents: events,
    uploadChunkBytes: bytes,
  });
}

export function noteUploadRecorded(done: number, total: number) {
  const uploadTotal = Math.max(total, done);
  emit({
    ...current,
    uploadActive: uploadTotal > 0,
    uploadDone: Math.max(0, done),
    uploadTotal,
    uploadChunkEvents: 0,
    uploadChunkBytes: 0,
  });
}

export function beginDownloadPage() {
  if (current.downloadActive) return;
  emit({ ...current, downloadActive: true, downloadHasMore: true });
}

export function noteDownloadPage(count: number, hasMore: boolean) {
  emit({
    ...current,
    downloadActive: true,
    downloadReceived: current.downloadReceived + count,
    downloadHasMore: hasMore,
  });
}

export function finishSyncProgress() {
  emit(IDLE);
}
