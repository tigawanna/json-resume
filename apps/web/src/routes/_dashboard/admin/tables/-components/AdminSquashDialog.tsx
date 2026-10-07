import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { useState } from "react";
import { SquashEventLogForm } from "../../-components/SquashEventLogForm";

export function AdminSquashDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="btn btn-outline btn-sm h-9" data-test="admin-event-log-squash">
          <Layers className="size-4" /> Squash
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-test="admin-squash-dialog">
        <DialogHeader>
          <DialogTitle>Squash the event log</DialogTitle>
          <DialogDescription>
            Keeps each row's latest event (the full row, or the delete that removed it) and drops
            the older events it replaced. Recent events stay so devices can still undo them.
          </DialogDescription>
        </DialogHeader>
        {open ? <SquashEventLogForm onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
