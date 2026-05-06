import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { apiKeysQueryOptions } from "@/data-access-layer/api-keys/api-keys-query-options";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { authClient } from "@/lib/better-auth/client";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { RouterErrorComponent } from "@/lib/tanstack/router/routerErrorComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiKeyCreateDialog } from "./ApiKeyCreateDialog";
import { ApiKeyListItem } from "./ApiKeyListItem";
import { NewKeyRevealDialog } from "./NewKeyRevealDialog";

export function ApiKeysSection() {
  const { data, isPending, error } = useQuery(apiKeysQueryOptions);
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

  if (isPending) return <RouterPendingComponent />;
  if (error) return <RouterErrorComponent error={error} />;

  if (keys.length === 0) {
    return (
      <Empty data-test="api-keys-empty" className="bg-base-300">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyRound />
          </EmptyMedia>
          <EmptyTitle>No API keys yet</EmptyTitle>
          <EmptyDescription>
            Create a key to access your resumes from AI agents and automation tools.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-test="create-api-key-btn"
        >
          <Plus className="mr-1 size-4" /> New Key
        </Button>
        <ApiKeyCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(key) => setRevealKey(key)}
        />
        <NewKeyRevealDialog apiKey={revealKey} onClose={() => setRevealKey(null)} />
      </Empty>
    );
  }

  return (
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
        {keys.map((key) => (
          <ApiKeyListItem
            key={key.id}
            apiKey={key}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </CardContent>
      <ApiKeyCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(key) => setRevealKey(key)}
      />
      <NewKeyRevealDialog apiKey={revealKey} onClose={() => setRevealKey(null)} />
    </Card>
  );
}
