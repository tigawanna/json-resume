import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="group flex flex-col" data-test={`link-card-${link.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3 min-w-0">
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
        <CardFooter className="mt-auto flex justify-end gap-1 px-3 py-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(true)}
            data-test="link-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(link.id)}
            data-test="link-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </CardFooter>
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
