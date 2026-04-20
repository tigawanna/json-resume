import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteExperienceFn } from "./experience.functions";

export const deleteExperienceMutationOptions = mutationOptions({
  mutationFn: async (experienceId: string) => deleteExperienceFn({ data: { id: experienceId } }),
  onSuccess() {
    toast.success("Experience deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete experience", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: { invalidates: [[queryKeyPrefixes.experiences]] },
});
