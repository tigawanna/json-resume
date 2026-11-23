import { adminUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";

/** Picker that links a waitlist entry to an existing account. */
export function LinkAccountDialog({
  open,
  onOpenChange,
  onLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (userId: string) => void;
}) {
  const { data: users, isPending } = useQuery(adminUsersQueryOptions);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link an account</DialogTitle>
          <DialogDescription>
            Match this waitlist entry to an account by email. Accounts also link automatically on
            sign-up or dashboard load.
          </DialogDescription>
        </DialogHeader>
        {isPending ? (
          <Spinner className="size-5" />
        ) : (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger data-test="waitlist-link-user-select">
              <SelectValue placeholder="Choose an account" />
            </SelectTrigger>
            <SelectContent>
              {(users ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedUserId}
            onClick={() => onLink(selectedUserId)}
            data-test="waitlist-link-confirm"
          >
            <Check className="size-4" /> Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
