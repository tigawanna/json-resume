import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiKeysQueryOptions } from "@/data-access-layer/api-keys/api-keys-query-options";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { authClient } from "@/lib/better-auth/client";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiKeyCreateDialog } from "./ApiKeyCreateDialog";
import { ApiKeyListItem } from "./ApiKeyListItem";
import { NewKeyRevealDialog } from "./NewKeyRevealDialog";

export function ApiKeysSection() {
  const { data } = useSuspenseQuery(apiKeysQueryOptions);
  const keys = data?.apiKeys ?? [];
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await authClient.apiKey.delete({ keyId });
      if (error) throw new Error(error.message);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.apiKeys] });
      toast.success("API key deleted");
    },
    onError(err: unknown) {
      toast.error("Failed to delete API key", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  return (
    <>
      <Card data-test="api-keys-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Generate keys to access your resumes from AI agents and automation tools.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-test="create-api-key-btn"
            >
              <Plus className="mr-1 size-4" /> New Key
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {!keys || keys.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-10 text-center"
              data-test="api-keys-empty"
            >
              <KeyRound className="text-muted-foreground size-10" />
              <p className="text-muted-foreground text-sm">
                No API keys yet. Create one to get started.
              </p>
            </div>
          ) : (
            keys.map((key) => (
              <ApiKeyListItem
                key={key.id}
                apiKey={key}
                onDelete={(id) => deleteMutation.mutate(id)}
                isDeleting={deleteMutation.isPending}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ApiKeyCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(key) => setRevealKey(key)}
      />

      <NewKeyRevealDialog apiKey={revealKey} onClose={() => setRevealKey(null)} />
    </>
  );
}
