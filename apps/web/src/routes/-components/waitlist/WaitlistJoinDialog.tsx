import { WaitlistJoinForm } from "./WaitlistJoinForm";
import type { WaitlistSource } from "@/data-access-layer/waitlist/waitlist-query-options";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Modal wrapper around the shared join form. The parent owns the open state.
 */
export function WaitlistJoinDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: WaitlistSource;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join the waitlist</DialogTitle>
          <DialogDescription>
            Pro features are in the works. Leave your email and we'll reach out when they open — no
            payment, no spam.
          </DialogDescription>
        </DialogHeader>
        <WaitlistJoinForm source={source} />
      </DialogContent>
    </Dialog>
  );
}
