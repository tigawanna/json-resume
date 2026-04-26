import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listExperiences } from "@/data-access-layer/resume/experiences/experience.functions";
import { deleteExperienceMutationOptions } from "@/data-access-layer/resume/experiences/experience.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { Route } from "..";
import { ExperienceListCard } from "./ExperienceListCard";

export function ExperienceList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.experiences, "page", cursor, dir ?? "after", sq],
    queryFn: () => listExperiences({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteExperienceMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="experience-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="experience-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <Briefcase className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No experiences found. Add experiences to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="experience-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="experience-list">
        {data.items.map((experience) => (
          <ExperienceListCard
            key={experience.id}
            experience={experience}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
