import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SummaryListItemDTO } from "@/data-access-layer/resume/summaries/summary.types";
import { FileText, ListOrdered, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { SummaryEditForm } from "./SummaryEditForm";

interface SummaryListCardProps {
  summary: SummaryListItemDTO;
  onDelete?: (id: string) => void;
}

export function SummaryListCard({ summary, onDelete }: SummaryListCardProps) {
  const [open, setOpen] = useState(false);
  const updatedLabel = new Date(summary.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Card className="h-full gap-4 py-5" data-test={`summary-card-${summary.id}`}>
        <CardHeader className="grid-cols-[1fr_auto] items-center gap-3 pb-0">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="text-primary size-5 shrink-0" />
            <CardTitle className="text-base">Summary</CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => setOpen(true)}
              data-test="summary-edit-btn"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => onDelete?.(summary.id)}
              data-test="summary-delete-btn"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {summary.text}
          </p>
        </CardContent>
        <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Badge
            variant="secondary"
            className="text-xs"
            title="Display order on resume (higher = appears first)"
          >
            <ListOrdered className="mr-1 size-3" />#{summary.sortOrder}
          </Badge>
          <p className="text-muted-foreground text-xs">Updated {updatedLabel}</p>
        </CardFooter>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Summary</DialogTitle>
          </DialogHeader>
          <SummaryEditForm summary={summary} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
