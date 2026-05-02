import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LinkListItemDTO } from "@/data-access-layer/resume/links/link.types";
import { ExternalLink, LinkIcon, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { LinkEditForm } from "./LinkEditForm";

interface LinkListCardProps {
  link: LinkListItemDTO;
  onDelete?: (id: string) => void;
}

export function LinkListCard({ link, onDelete }: LinkListCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="flex flex-row items-start gap-2 py-6" data-test={`link-card-${link.id}`}>
        <CardHeader className="min-w-0 flex-1 space-y-0 p-0 px-6 pr-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <LinkIcon className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{link.label}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                <ExternalLink className="size-3 shrink-0" />
                <span className="truncate">{link.url}</span>
              </CardDescription>
              {link.icon && (
                <p className="text-muted-foreground mt-1 truncate text-xs">Icon: {link.icon}</p>
              )}
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {link.resumeName}
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
            data-test="link-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => onDelete?.(link.id)}
            data-test="link-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
          </DialogHeader>
          <LinkEditForm link={link} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
