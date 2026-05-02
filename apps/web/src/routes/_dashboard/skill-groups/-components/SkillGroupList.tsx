import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listSkillGroups } from "@/data-access-layer/resume/skill-groups/skill-group.functions";
import { deleteSkillGroupMutationOptions } from "@/data-access-layer/resume/skill-groups/skill-group.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { Route } from "..";
import { SkillGroupListCard } from "./SkillGroupListCard";

export function SkillGroupList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.skillGroups, "page", cursor, dir ?? "after", sq],
    queryFn: () => listSkillGroups({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteSkillGroupMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="skill-group-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="skill-group-list-page">
        <div className="flex flex-col items-center justify-center gap-4 py-20 min-h-[min(380px,50dvh)]">
          <Layers className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No skill groups found. Add skills to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="skill-group-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="skill-group-list">
        {data.items.map((item) => (
          <SkillGroupListCard
            key={item.id}
            skillGroup={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
