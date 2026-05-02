import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="group flex flex-col" data-test={`talk-card-${talk.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3 min-w-0">
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
        <CardFooter className="mt-auto flex justify-end gap-1 px-3 py-1 opacity-0 transition-opacity group-hover:opacity-100">
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
        </CardFooter>
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
