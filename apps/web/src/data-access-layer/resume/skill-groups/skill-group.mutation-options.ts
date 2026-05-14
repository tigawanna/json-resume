import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteSkillGroupFn } from "./skill-group.functions";

export const deleteSkillGroupMutationOptions = mutationOptions({
  mutationFn: async (groupId: string) => deleteSkillGroupFn({ data: { id: groupId } }),
  onSuccess(_, __, ___, ctx) {
    ctx.client.invalidateQueries({
      queryKey: [queryKeyPrefixes.skillGroups, queryKeyPrefixes.resumes],
    });
    toast.success("Skill group deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete skill group", {
      description: unwrapUnknownError(err).message,
    });
  },
});
