import {
  adminWaitlistUpdateMutationOptions,
  type AdminWaitlistEntry,
} from "@/data-access-layer/waitlist/waitlist-query-options";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatLocaleDate } from "@/utils/date-helpers";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LinkAccountDialog } from "./LinkAccountDialog";
import { WaitlistRowActions } from "./WaitlistRowActions";

/** One waitlist entry with its row actions. */
export function WaitlistRow({ entry }: { entry: AdminWaitlistEntry }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const updateMutation = useMutation(adminWaitlistUpdateMutationOptions());

  const isRemoved = entry.status === "removed";

  function patch(patch: { status?: "joined" | "removed"; userId?: string | null }) {
    updateMutation.mutate(
      { id: entry.id, patch },
      {
        onSuccess() {
          toast.success("Waitlist updated");
        },
        onError(error) {
          toast.error("Could not update the entry", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        },
      },
    );
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(entry.email);
      toast.success("Email copied");
    } catch {
      toast.error("Could not copy the email");
    }
  }

  return (
    <TableRow data-test="waitlist-row">
      <TableCell className="font-mono text-xs">{entry.email}</TableCell>
      <TableCell>{entry.name ?? "—"}</TableCell>
      <TableCell>
        {isRemoved ? (
          <Badge variant="outline">Removed</Badge>
        ) : (
          <Badge variant="secondary">Joined</Badge>
        )}
      </TableCell>
      <TableCell>
        {entry.userId ? (
          <Link
            to="/admin/users"
            className="link inline-flex items-center gap-1 text-xs"
            data-test="waitlist-open-user"
          >
            {entry.userEmail ?? "Open user"} <ArrowUpRight className="size-3" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatLocaleDate(entry.createdAt)}
      </TableCell>
      <TableCell>
        <WaitlistRowActions
          entry={entry}
          isRemoved={isRemoved}
          onPatch={patch}
          onOpenLinkDialog={() => setLinkDialogOpen(true)}
          onCopyEmail={() => void copyEmail()}
        />
      </TableCell>

      <LinkAccountDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onLink={(userId) => {
          patch({ userId });
          setLinkDialogOpen(false);
        }}
      />
    </TableRow>
  );
}
