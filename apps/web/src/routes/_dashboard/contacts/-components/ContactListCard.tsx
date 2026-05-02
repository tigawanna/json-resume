import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ContactListItemDTO } from "@/data-access-layer/resume/contacts/contact.types";
import { Contact, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ContactEditForm } from "./ContactEditForm";

interface ContactListCardProps {
  contact: ContactListItemDTO;
  onDelete?: (id: string) => void;
}

export function ContactListCard({ contact, onDelete }: ContactListCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="group flex flex-col" data-test={`contact-card-${contact.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3 min-w-0">
            <Contact className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{contact.value}</CardTitle>
              <CardDescription className="mt-1 truncate text-xs">
                {contact.type}
                {contact.label ? ` · ${contact.label}` : ""}
              </CardDescription>
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {contact.resumeName}
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
            data-test="contact-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(contact.id)}
            data-test="contact-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </CardFooter>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactEditForm contact={contact} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
