import { Button } from "@/components/ui/button";
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
import { Download, HardDrive, Upload } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
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
    <div className="flex flex-col gap-4" data-test="local-backup-section">
      <p className="text-muted-foreground text-sm">
        Import adds missing rows and leaves matching ids as they are.
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
    </div>
  );
}

export function LocalBackupSection() {
  return (
    <SettingsSection
      icon={HardDrive}
      title="Local backup"
      description="Download this browser’s library as JSON, or restore rows that are not already here."
    >
      <EventSourcedDbProvider
        fallback={<p className="text-muted-foreground text-sm">Opening the local database…</p>}
      >
        <LocalBackupControls />
      </EventSourcedDbProvider>
    </SettingsSection>
  );
}
