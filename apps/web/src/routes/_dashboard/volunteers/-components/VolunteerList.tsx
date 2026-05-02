import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listVolunteers } from "@/data-access-layer/resume/volunteers/volunteer.functions";
import { deleteVolunteerMutationOptions } from "@/data-access-layer/resume/volunteers/volunteer.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Route } from "..";
import { VolunteerListCard } from "./VolunteerListCard";

export function VolunteerList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.volunteers, "page", cursor, dir ?? "after", sq],
    queryFn: () => listVolunteers({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteVolunteerMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="volunteer-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="volunteer-list-page">
        <div className="flex flex-col items-center justify-center gap-4 py-20 min-h-[min(380px,50dvh)]">
          <Heart className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No volunteer entries found. Add volunteer experience to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="volunteer-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="volunteer-list">
        {data.items.map((item) => (
          <VolunteerListCard
            key={item.id}
            volunteer={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
