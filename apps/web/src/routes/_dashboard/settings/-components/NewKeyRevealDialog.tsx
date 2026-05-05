import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface NewKeyRevealDialogProps {
  apiKey: string | null;
  onClose: () => void;
}

export function NewKeyRevealDialog({ apiKey, onClose }: NewKeyRevealDialogProps) {
  async function copyToClipboard() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard");
  }

  return (
    <Dialog open={Boolean(apiKey)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" data-test="new-key-reveal-dialog">
        <DialogHeader>
          <DialogTitle>Your new API key</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p className="text-sm">
              This key will only be shown once. Copy it now and store it safely — you will not be
              able to view it again.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={apiKey ?? ""}
              readOnly
              className="font-mono text-sm"
              data-test="new-key-value"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              data-test="copy-api-key-btn"
            >
              <Copy className="size-4" />
            </Button>
          </div>

          <Button onClick={onClose} data-test="new-key-done-btn">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
