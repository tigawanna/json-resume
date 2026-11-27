import {
  adminEventLogControllerDropBackup,
  adminEventLogControllerEmpty,
  adminEventLogControllerProject,
  adminEventLogControllerRebuildAll,
  adminEventLogControllerRebuildUser,
  adminEventLogControllerRestoreBackup,
  adminEventLogControllerSquash,
} from "@/services/nest/client";

export function restoreEventLogBackup({ table }: { table: string }) {
  return adminEventLogControllerRestoreBackup({ path: { table } });
}

export function dropEventLogBackup({ table, confirm }: { table: string; confirm: string }) {
  return adminEventLogControllerDropBackup({
    path: { table },
    body: { table, confirm },
  });
}

export function emptyEventLog({ confirm, rebuild }: { confirm: string; rebuild?: boolean }) {
  return adminEventLogControllerEmpty({ body: { confirm, rebuild } });
}

export function projectPendingEvents() {
  return adminEventLogControllerProject();
}

export function rebuildAllEventLogs() {
  return adminEventLogControllerRebuildAll();
}

export function rebuildEventLog({ userId }: { userId: string }) {
  return adminEventLogControllerRebuildUser({ path: { userId } });
}

export function squashEventLog({
  userId,
  retentionMs,
  dryRun,
}: {
  userId?: string;
  retentionMs?: number;
  dryRun?: boolean;
}) {
  return adminEventLogControllerSquash({
    body: { userId, retentionMs, dryRun },
  });
}
