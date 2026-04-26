import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="group relative" data-test={`contact-card-${contact.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Contact className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{contact.value}</CardTitle>
              <CardDescription className="mt-1 text-xs">
                {contact.type}
                {contact.label ? ` · ${contact.label}` : ""}
              </CardDescription>
              <Badge variant="outline" className="mt-2 text-xs">
                {contact.resumeName}
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
        </div>
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
