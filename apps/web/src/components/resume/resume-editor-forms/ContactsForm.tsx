import { EntityPickerSheet } from "@/components/entity-picker/EntityPickerSheet";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { Library, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AutosaveStatus, useResumeAutosave } from "./use-resume-autosave";

interface ContactRow {
  /** Library row id when the contact exists, "" for a row not saved yet. */
  id: string;
  type: string;
  value: string;
  label: string;
}

type ContactPickerRow = { id: string; type: string; value: string; label: string };

function contactContent(rows: ContactRow[]) {
  return rows.map(({ type, value, label }) => ({ type, value, label }));
}

export function ContactsForm() {
  const { resume, updateContacts, searches } = useResumeWorkspace();
  const searchContacts = searches?.contacts;
  const saved =
    resume?.contacts.map((c) => ({ id: c.id, type: c.type, value: c.value, label: c.label })) ?? [];
  const savedKey = JSON.stringify(saved);

  const [contacts, setContacts] = useState<ContactRow[]>(saved);
  const [pickOpen, setPickOpen] = useState(false);

  useEffect(() => {
    if (JSON.stringify(contactContent(contacts)) !== JSON.stringify(contactContent(saved))) return;
    if (JSON.stringify(contacts) !== savedKey) setContacts(saved);
  }, [savedKey, contacts, saved]);

  const status = useResumeAutosave({
    fingerprint: JSON.stringify(contactContent(contacts)),
    savedFingerprint: JSON.stringify(contactContent(saved)),
    canSave: true,
    save: () => updateContacts(contactContent(contacts)),
  });

  if (!resume) return null;

  function addContact() {
    setContacts((prev) => [...prev, { id: "", type: "email", value: "", label: "" }]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof ContactRow, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function pickExisting(rows: ContactPickerRow[]) {
    const picked = rows.map((row) => ({
      id: row.id,
      type: row.type,
      value: row.value,
      label: row.label,
    }));
    setContacts((prev) => [...prev, ...picked]);
    toast.success(`Added ${picked.length} contact(s)`);
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
        {searchContacts && (
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
            <Library className="mr-1 size-3" /> Pick from Existing
          </Button>
        )}
      </div>
      <AutosaveStatus status={status} />

      {searchContacts && (
        <EntityPickerSheet<ContactPickerRow>
          open={pickOpen}
          onOpenChange={setPickOpen}
          title="Pick from Existing Contacts"
          description="Attach contacts from your library. Editing them updates every résumé that uses them."
          searchPlaceholder="Search by type, value or label…"
          multi
          attachedIds={contacts.map((contact) => contact.id).filter(Boolean)}
          getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "contacts", q]}
          getSearchQueryFn={(q) => () => searchContacts(q)}
          getItem={(contact) => ({
            id: contact.id,
            primary: contact.value,
            badge: contact.type || undefined,
            secondary: contact.label || undefined,
          })}
          onPick={pickExisting}
        />
      )}
    </div>
  );
}
