import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { contactsCollection } from "@/data-access-layer/resume/contacts/contact.collection";
import type { ContactListItemDTO } from "@/data-access-layer/resume/contacts/contact.types";
import { editContact } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const CONTACT_TYPE_OPTIONS = ["email", "phone", "location", "address", "website"];

const contactEditOpts = formOptions({
  defaultValues: { type: "", value: "", label: "" },
});

interface ContactEditFormProps {
  contact: ContactListItemDTO;
  onSuccess?: () => void;
}

export function ContactEditForm({ contact, onSuccess }: ContactEditFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof contactEditOpts.defaultValues) =>
      editContact({ data: { id: contact.id, ...values } }),
    onSuccess(data, values) {
      toast.success("Contact saved");
      contactsCollection.utils.writeUpdate({ ...contact, ...values });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save contact", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.contacts], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...contactEditOpts,
    defaultValues: {
      type: contact.type,
      value: contact.value,
      label: contact.label,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="type"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Type is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Type</Label>
            <Combobox
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value ?? "")}
            >
              <ComboboxInput
                placeholder="Select or type..."
                showTrigger
                showClear
                disabled={false}
              />
              <ComboboxContent>
                <ComboboxList>
                  {CONTACT_TYPE_OPTIONS.map((option) => (
                    <ComboboxItem key={option} value={option}>
                      {option}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        )}
      </form.AppField>
      <form.AppField
        name="value"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Value is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField name="label">
        {(field) => (
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              placeholder="Optional display label"
            />
          </div>
        )}
      </form.AppField>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
