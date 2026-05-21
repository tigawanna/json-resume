import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteLanguageFn } from "./language.functions";

export const deleteLanguageMutationOptions = mutationOptions({
  mutationFn: async (languageId: string) => deleteLanguageFn({ data: { id: languageId } }),
  onSuccess(_, __, ___, ctx) {
    toast.success("Language deleted");
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.languages] });
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
  },
  onError(err: unknown) {
    toast.error("Failed to delete language", {
      description: unwrapUnknownError(err).message,
    });
  },
});
