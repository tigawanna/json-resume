import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/better-auth/client";
import { useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, Key, Loader, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ApiKeyRecord {
  id: string;
  name: string | null;
  prefix: string | null;
  createdAt: Date;
  lastUsedAt?: Date | null;
}

interface ApiKeysSectionProps {
  apiKeys: ApiKeyRecord[];
}

export function ApiKeysSection({ apiKeys }: ApiKeysSectionProps) {
  return (
    <Card data-test="api-keys-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" />
              API Keys
            </CardTitle>
            <CardDescription className="mt-1">
              Create API keys to access your data programmatically. Use them
              with the MCP server or any HTTP client.
            </CardDescription>
          </div>
          <CreateApiKeyDialog />
        </div>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-sm text-base-content/60 py-4 text-center">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {apiKeys.map((apiKey) => (
              <ApiKeyRow key={apiKey.id} apiKey={apiKey} />
            ))}
          </div>
        )}

        <McpConfigSnippet />
      </CardContent>
    </Card>
  );
}

function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async (keyName: string) => {
      const { data, error } = await authClient.apiKey.create({ name: keyName });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess(result) {
      setCreatedKey(result.key);
      toast.success("API key created");
    },
    onError(err: unknown) {
      toast.error("Failed to create API key", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["api-keys"]] },
  });

  const handleClose = () => {
    setOpen(false);
    setName("");
    setCreatedKey(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 size-4" />
          New key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Give your key a descriptive name so you know where it's used.
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-base-content/80">
              Copy this key now — you won't be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-base-200 px-3 py-2 text-xs font-mono break-all">
                {createdKey}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              placeholder="e.g. Claude Desktop, Cursor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-test="api-key-name-input"
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={!name.trim() || mutation.isPending}
                onClick={() => mutation.mutate(name.trim())}
              >
                {mutation.isPending && (
                  <Loader className="mr-2 size-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKeyRecord }) {
  const revokeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.apiKey.delete({ keyId: apiKey.id });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess() {
      toast.success("API key revoked");
    },
    onError(err: unknown) {
      toast.error("Failed to revoke key", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["api-keys"]] },
  });

  return (
    <div
      className="flex items-center justify-between rounded-md border px-4 py-3"
      data-test="api-key-row"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{apiKey.name ?? "Unnamed"}</span>
          {apiKey.prefix && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              {apiKey.prefix}...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
          </span>
          {apiKey.lastUsedAt && (
            <span>
              Last used{" "}
              {formatDistanceToNow(new Date(apiKey.lastUsedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-destructive hover:text-destructive"
        disabled={revokeMutation.isPending}
        onClick={() => revokeMutation.mutate()}
      >
        {revokeMutation.isPending ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </div>
  );
}

function McpConfigSnippet() {
  const [copied, setCopied] = useState(false);

  const snippet = `{
  "mcpServers": {
    "json-resume": {
      "url": "${window.location.origin}/api/mcp"
    }
  }
}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Copied config snippet");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">MCP Client Config</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
          {copied ? (
            <Check className="mr-1 size-3 text-green-500" />
          ) : (
            <Copy className="mr-1 size-3" />
          )}
          Copy
        </Button>
      </div>
      <p className="text-xs text-base-content/60">
        Paste this into your Claude Desktop or Cursor MCP config. The MCP
        client will handle OAuth authentication automatically — you'll be
        prompted to log in via your browser when you first connect.
      </p>
      <pre className="rounded-md bg-base-200 p-3 text-xs font-mono overflow-x-auto">
        {snippet}
      </pre>
    </div>
  );
}
