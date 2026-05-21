import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteContactFn } from "./contact.functions";

export const deleteContactMutationOptions = mutationOptions({
  mutationFn: async (contactId: string) => deleteContactFn({ data: { id: contactId } }),
  onSuccess(_, __, ___, ctx) {
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.contacts] });
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    toast.success("Contact deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete contact", {
      description: unwrapUnknownError(err).message,
    });
  },
});
