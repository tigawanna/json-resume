import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteLinkFn } from "./link.functions";

export const deleteLinkMutationOptions = mutationOptions({
  mutationFn: async (linkId: string) => deleteLinkFn({ data: { id: linkId } }),
  onSuccess(_, __, ___, ctx) {
    ctx.client.invalidateQueries({
      queryKey: [queryKeyPrefixes.links, queryKeyPrefixes.resumes],
    });
    toast.success("Link deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete link", {
      description: unwrapUnknownError(err).message,
    });
  },
});
