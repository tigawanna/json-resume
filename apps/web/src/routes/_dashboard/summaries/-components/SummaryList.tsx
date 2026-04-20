import { summariesCollection } from "@/data-access-layer/resume/summaries/summary.collection";
import { deleteSummaryMutationOptions } from "@/data-access-layer/resume/summaries/summary.mutation-options";
import { ilike, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Route } from "..";
import { SummaryListCard } from "./SummaryListCard";

export function SummaryList() {
  const { sq } = Route.useSearch();
  const { data: items } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ summary: summariesCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ summary }) => ilike(summary.text, pattern));
      }
      return query;
    },
    [sq],
  );
  const deleteMutation = useMutation(deleteSummaryMutationOptions);
  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="summary-list-page">
      <div className="flex-1" data-test="summary-list">
        {items.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <FileText className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No summaries found. Add summaries to your resumes first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <SummaryListCard
                key={item.id}
                summary={item}
                onDelete={(id) => {
                  summariesCollection.utils.writeDelete(id);
                  deleteMutation.mutate(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
