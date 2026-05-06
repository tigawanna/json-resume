import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createApiKeyFn } from "@/data-access-layer/api-keys/api-keys.functions";
import { IdePickerDialog } from "./IdePickerDialog";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DialogStep = "idle" | "creating" | "ready";

export function McpConnectSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("idle");
  const [apiKey, setApiKey] = useState<string | null>(null);

  const createKeyMutation = useMutation({
    mutationFn: () => createApiKeyFn({ data: { name: "MCP Connection", permission: "write" } }),
    onSuccess(data) {
      setApiKey(data.key);
      setStep("ready");
    },
    onError(err: unknown) {
      toast.error("Failed to create API key", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  function handleOpen() {
    setStep("idle");
    setApiKey(null);
    setDialogOpen(true);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setStep("idle");
      setApiKey(null);
    }
  }

  return (
    <>
      <Card data-test="mcp-connect-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>MCP Connection</CardTitle>
              <CardDescription>
                Connect your IDE to access and manage resumes with AI assistants.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleOpen} data-test="connect-mcp-btn">
              <Plug className="mr-1 size-4" /> Connect MCP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Model Context Protocol (MCP) lets AI assistants in Cursor and VS Code directly read and
            update your resume data. Authentication uses a standard API key — no OAuth flow
            required.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen && step !== "ready"} onOpenChange={handleClose}>
        <DialogContent data-test="mcp-create-key-dialog">
          <DialogHeader>
            <DialogTitle>Connect your IDE via MCP</DialogTitle>
            <DialogDescription>
              We'll create a dedicated API key for your IDE connection. Keep it safe — it grants
              read and write access to your resume data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-base-200/70 rounded-lg p-4 text-sm">
              <p className="font-medium">What this key allows</p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1">
                <li>Read all resume data</li>
                <li>Create and update resume sections</li>
              </ul>
            </div>
            <Button
              onClick={() => createKeyMutation.mutate()}
              disabled={createKeyMutation.isPending}
              data-test="mcp-create-key-btn"
            >
              {createKeyMutation.isPending ? "Creating key…" : "Create MCP API Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {apiKey && (
        <IdePickerDialog
          open={dialogOpen && step === "ready"}
          onOpenChange={handleClose}
          apiKey={apiKey}
        />
      )}
    </>
  );
}
