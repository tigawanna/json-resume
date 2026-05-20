import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteEducationFn } from "./education.functions";

export const deleteEducationMutationOptions = mutationOptions({
  mutationFn: async (educationId: string) => deleteEducationFn({ data: { id: educationId } }),
  onSuccess(_, __, ___, ctx) {
    toast.success("Education deleted");
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.education] });
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
  },
  onError(err: unknown) {
    toast.error("Failed to delete education", {
      description: unwrapUnknownError(err).message,
    });
  },
});
