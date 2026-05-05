import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Key, Trash2 } from "lucide-react";
import { useState } from "react";

export interface ApiKeyItem {
  id: string;
  name: string | null | undefined;
  start: string | null | undefined;
  prefix: string | null | undefined;
  permissions: Record<string, string[]> | null | undefined;
  createdAt: Date | string;
  enabled: boolean | null | undefined;
}

interface ApiKeyListItemProps {
  apiKey: ApiKeyItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function parsePermissionLabel(perms: Record<string, string[]> | null | undefined): string {
  if (!perms) return "No permissions";
  const resumePerms = perms.resumes ?? [];
  if (resumePerms.includes("write")) return "Read & Write";
  if (resumePerms.includes("read")) return "Read only";
  return "Custom";
}

export function ApiKeyListItem({ apiKey, onDelete, isDeleting }: ApiKeyListItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayKey = [apiKey.prefix, apiKey.start].filter(Boolean).join("_") + "...";
  const permLabel = parsePermissionLabel(apiKey.permissions);
  const createdDate = new Date(apiKey.createdAt).toLocaleDateString();

  function handleDeleteConfirm() {
    onDelete(apiKey.id);
    setConfirmDelete(false);
  }

  return (
    <Card data-test="api-key-item">
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Key className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{apiKey.name ?? "Unnamed key"}</p>
            <p className="text-muted-foreground font-mono text-xs">{displayKey}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {permLabel}
          </Badge>
          <p className="text-muted-foreground hidden text-xs lg:block">{createdDate}</p>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                data-test="api-key-confirm-delete"
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              data-test="api-key-delete-btn"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
