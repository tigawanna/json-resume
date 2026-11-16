import type { AdminWaitlistEntry } from "@/data-access-layer/waitlist/waitlist-query-options";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, MoreHorizontal, Trash2, Undo2, UserPlus, UserRoundX } from "lucide-react";

export type WaitlistPatch = {
  status?: "joined" | "removed";
  userId?: string | null;
};

/** Row menu: copy email, link/unlink account, remove/restore. */
export function WaitlistRowActions({
  entry,
  isRemoved,
  onPatch,
  onOpenLinkDialog,
  onCopyEmail,
}: {
  entry: AdminWaitlistEntry;
  isRemoved: boolean;
  onPatch: (patch: WaitlistPatch) => void;
  onOpenLinkDialog: () => void;
  onCopyEmail: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Row actions"
          data-test="waitlist-row-actions"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onCopyEmail}>
          <Copy className="size-4" /> Copy email
        </DropdownMenuItem>
        {entry.userId ? (
          <DropdownMenuItem onSelect={() => onPatch({ userId: null })}>
            <UserRoundX className="size-4" /> Unlink account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onOpenLinkDialog}>
            <UserPlus className="size-4" /> Link account
          </DropdownMenuItem>
        )}
        {isRemoved ? (
          <DropdownMenuItem onSelect={() => onPatch({ status: "joined" })}>
            <Undo2 className="size-4" /> Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onSelect={() => onPatch({ status: "removed" })}>
            <Trash2 className="size-4" /> Remove
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
