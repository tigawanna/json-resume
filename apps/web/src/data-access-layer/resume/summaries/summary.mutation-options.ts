import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteSummaryFn } from "./summary.functions";

export const deleteSummaryMutationOptions = mutationOptions({
  mutationFn: async (summaryId: string) => deleteSummaryFn({ data: { id: summaryId } }),
  onSuccess() {
    toast.success("Summary deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete summary", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: { invalidates: [[queryKeyPrefixes.summaries], [queryKeyPrefixes.resumes]] },
});
