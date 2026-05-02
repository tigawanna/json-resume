import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SummaryListItemDTO } from "@/data-access-layer/resume/summaries/summary.types";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { SummaryEditForm } from "./SummaryEditForm";

interface SummaryListCardProps {
  summary: SummaryListItemDTO;
  onDelete?: (id: string) => void;
}

export function SummaryListCard({ summary, onDelete }: SummaryListCardProps) {
  const [open, setOpen] = useState(false);
  const preview = summary.text.length > 120 ? `${summary.text.slice(0, 120)}…` : summary.text;
  return (
    <>
      <Card
        className="flex flex-row items-start gap-2 py-6"
        data-test={`summary-card-${summary.id}`}
      >
        <CardHeader className="min-w-0 flex-1 space-y-0 p-0 px-6 pr-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-snug line-clamp-2">{preview}</CardTitle>
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {summary.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="flex shrink-0 flex-col gap-0.5 pr-6">
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
