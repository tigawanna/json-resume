import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteVolunteerFn } from "./volunteer.functions";

export const deleteVolunteerMutationOptions = mutationOptions({
  mutationFn: async (volunteerId: string) => deleteVolunteerFn({ data: { id: volunteerId } }),
  onSuccess(_, __, ___, ctx) {
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.volunteers] });
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    toast.success("Volunteer entry deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete volunteer entry", {
      description: unwrapUnknownError(err).message,
    });
  },
});
