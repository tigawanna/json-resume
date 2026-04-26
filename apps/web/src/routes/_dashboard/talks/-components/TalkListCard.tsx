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
      <Card className="group relative" data-test={`talk-card-${talk.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Mic className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{talk.title}</CardTitle>
              {talk.event && (
                <CardDescription className="mt-1 text-xs">{talk.event}</CardDescription>
              )}
              {talk.date && <p className="text-muted-foreground mt-1 text-xs">{talk.date}</p>}
              {talk.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {talk.description}
                </p>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {talk.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(true)}
            data-test="talk-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
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
