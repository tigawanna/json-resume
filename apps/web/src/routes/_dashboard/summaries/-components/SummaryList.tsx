import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listSummaries } from "@/data-access-layer/resume/summaries/summary.functions";
import { deleteSummaryMutationOptions } from "@/data-access-layer/resume/summaries/summary.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Route } from "..";
import { SummaryListCard } from "./SummaryListCard";

export function SummaryList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.summaries, "page", cursor, dir ?? "after", sq],
    queryFn: () => listSummaries({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteSummaryMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="summary-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="summary-list-page">
        <div className="flex flex-col items-center justify-center gap-4 py-20 min-h-[min(380px,50dvh)]">
          <FileText className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No summaries found. Add summaries to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="summary-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="summary-list">
        {data.items.map((item) => (
          <SummaryListCard
            key={item.id}
            summary={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
