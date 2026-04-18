import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContacts } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ContactsFormProps {
  resume: ResumeDetailDTO;
}

interface ContactRow {
  type: string;
  value: string;
  label: string;
}

export function ContactsForm({ resume }: ContactsFormProps) {
  const [contacts, setContacts] = useState<ContactRow[]>(
    resume.contacts.map((c) => ({ type: c.type, value: c.value, label: c.label })),
  );

  const mutation = useMutation({
    mutationFn: async () => updateContacts({ data: { resumeId: resume.id, contacts } }),
    onSuccess() {
      toast.success("Contacts saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save contacts", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  function addContact() {
    setContacts((prev) => [...prev, { type: "email", value: "", label: "" }]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof ContactRow, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  return (
    <div className="flex flex-col gap-4" data-test="contacts-form">
      {contacts.map((contact, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="w-28">
            <Label className="text-xs">Type</Label>
            <Input
              value={contact.type}
              onChange={(e) => updateContact(index, "type", e.target.value)}
              placeholder="email"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Value</Label>
            <Input
              value={contact.value}
              onChange={(e) => updateContact(index, "value", e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="w-28">
            <Label className="text-xs">Label</Label>
            <Input
              value={contact.label}
              onChange={(e) => updateContact(index, "label", e.target.value)}
              placeholder="Email"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => removeContact(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addContact}>
          <Plus className="mr-1 size-3" /> Add Contact
        </Button>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Save Contacts
        </Button>
      </div>
    </div>
  );
}
