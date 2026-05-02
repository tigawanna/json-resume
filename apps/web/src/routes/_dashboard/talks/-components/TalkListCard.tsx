import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TalkListItemDTO } from "@/data-access-layer/resume/talks/talk.types";
import { Mic, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { TalkEditForm } from "./TalkEditForm";

interface TalkListCardProps {
  talk: TalkListItemDTO;
  onDelete?: (id: string) => void;
}

export function TalkListCard({ talk, onDelete }: TalkListCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="flex flex-row items-start gap-2 py-6" data-test={`talk-card-${talk.id}`}>
        <CardHeader className="min-w-0 flex-1 space-y-0 p-0 px-6 pr-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <Mic className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{talk.title}</CardTitle>
              {talk.event && (
                <CardDescription className="mt-1 truncate text-xs">{talk.event}</CardDescription>
              )}
              {talk.date && <p className="text-muted-foreground mt-1 text-xs">{talk.date}</p>}
              {talk.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {talk.description}
                </p>
              )}
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {talk.resumeName}
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
            data-test="talk-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => onDelete?.(talk.id)}
            data-test="talk-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Talk</DialogTitle>
          </DialogHeader>
          <TalkEditForm talk={talk} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
