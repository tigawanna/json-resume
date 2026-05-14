import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteTalkFn } from "./talk.functions";

export const deleteTalkMutationOptions = mutationOptions({
  mutationFn: async (talkId: string) => deleteTalkFn({ data: { id: talkId } }),
  onSuccess(_, __, ___, ctx) {
    ctx.client.invalidateQueries({
      queryKey: [queryKeyPrefixes.talks, queryKeyPrefixes.resumes],
    });
    toast.success("Talk deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete talk", {
      description: unwrapUnknownError(err).message,
    });
  },
});
