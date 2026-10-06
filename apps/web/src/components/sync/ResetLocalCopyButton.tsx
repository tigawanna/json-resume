import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetLocalCopy } from "@/data-access-layer/event-sourced/app-settings";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { unwrapUnknownError } from "@/utils/errors";
import { DatabaseBackup } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ResetLocalCopyButton({ disabled }: { disabled: boolean }) {
  const db = useEventSourcedDb();
  const [isResetting, setIsResetting] = useState(false);

  async function handleReset() {
    setIsResetting(true);
    try {
      const result = await resetLocalCopy(db);
      if (result.errors.length > 0) {
        toast.error("Local copy cleared, but pulling from the server failed", {
          description: `${result.errors.map((e) => e.message).join("; ")}. Press Sync now to retry.`,
        });
        return;
      }
      toast.success("Local copy rebuilt from the server", {
        description: `Removed ${result.removed} local rows, pulled ${result.pulled} events.`,
      });
    } catch (err: unknown) {
      toast.error("Could not reset local copy", { description: unwrapUnknownError(err).message });
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground w-fit"
          disabled={disabled || isResetting}
          data-test="reset-local-copy-btn"
        >
          <DatabaseBackup className="mr-2 size-4" />
          {isResetting ? "Rebuilding local copy…" : "Reset local copy"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent data-test="reset-local-copy-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Rebuild this device from the server?</AlertDialogTitle>
          <AlertDialogDescription>
            Pending changes are uploaded first. Then every synced row on this device is removed and
            downloaded again from the server. Nothing is deleted on the server or on your other
            devices. Your local settings stay as they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-test="reset-local-copy-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleReset()}
            data-test="reset-local-copy-confirm"
          >
            Rebuild local copy
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
