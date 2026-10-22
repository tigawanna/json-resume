import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EventSourcedDbProvider,
  useEventSourcedDb,
} from "@/data-access-layer/event-sourced/provider";
import {
  backupDownloadFilename,
  buildLocalBackup,
  parseLocalBackupJson,
  restoreLocalBackup,
} from "@/data-access-layer/event-sourced/recovery/local-backup";
import { unwrapUnknownError } from "@/utils/errors";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function LocalBackupControls() {
  const db = useEventSourcedDb();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const backup = buildLocalBackup(db);
      downloadJson(backupDownloadFilename(backup.exportedAt), JSON.stringify(backup, null, 2));
      const rowCount = Object.values(backup.collections).reduce(
        (sum, rows) => sum + rows.length,
        0,
      );
      toast.success("Local dataset exported", {
        description: `${rowCount} rows across ${Object.keys(backup.collections).length} collections`,
      });
    } catch (err: unknown) {
      toast.error("Export failed", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const backup = parseLocalBackupJson(text);
      const stats = restoreLocalBackup(db, backup);
      if (stats.failed > 0) {
        toast.error("Import finished with errors", {
          description: `Applied ${stats.applied}, skipped ${stats.skipped}, failed ${stats.failed}. Check the console.`,
        });
        return;
      }
      toast.success("Backup restored", {
        description: `Applied ${stats.applied} changes, skipped ${stats.skipped} existing rows`,
      });
    } catch (err: unknown) {
      toast.error("Import failed", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card data-test="local-backup-section">
      <CardHeader>
        <CardTitle>Local dataset backup</CardTitle>
        <CardDescription>
          Download this browser’s library as JSON. The file is a snapshot of every collection.
          Restore inserts rows that are not already in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Import is additive. Matching ids are left as they are. Older backups that stored a
          collection only in the event log still restore those rows.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
            disabled={exporting || importing}
            data-test="local-backup-export-btn"
          >
            <Download className="mr-2 size-4" />
            {exporting ? "Exporting…" : "Download JSON backup"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || importing}
            data-test="local-backup-import-btn"
          >
            <Upload className="mr-2 size-4" />
            {importing ? "Importing…" : "Restore from JSON"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-test="local-backup-file-input"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function LocalBackupSection() {
  return (
    <EventSourcedDbProvider
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Local dataset backup</CardTitle>
            <CardDescription>Opening the local database…</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LocalBackupControls />
    </EventSourcedDbProvider>
  );
}
