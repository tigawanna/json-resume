import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteEducationFn } from "./education.functions";

export const deleteEducationMutationOptions = mutationOptions({
  mutationFn: async (educationId: string) => deleteEducationFn({ data: { id: educationId } }),
  onSuccess() {
    toast.success("Education deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete education", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: { invalidates: [[queryKeyPrefixes.education]] },
});
