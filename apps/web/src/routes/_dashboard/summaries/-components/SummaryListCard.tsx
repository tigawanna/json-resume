import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="group flex flex-col" data-test={`summary-card-${summary.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3 min-w-0">
            <FileText className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base line-clamp-2">{preview}</CardTitle>
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {summary.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="mt-auto flex justify-end gap-1 px-3 py-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(true)}
            data-test="summary-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(summary.id)}
            data-test="summary-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
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
