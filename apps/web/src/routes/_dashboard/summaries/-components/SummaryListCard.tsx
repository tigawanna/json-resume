import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="group relative" data-test={`summary-card-${summary.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <FileText className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base line-clamp-2">{preview}</CardTitle>
              <CardDescription className="mt-1 text-xs">
                <Badge variant="outline" className="text-xs">
                  {summary.resumeName}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
