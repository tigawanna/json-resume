import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { listSummaries } from "@/data-access-layer/resume/summaries/summary.functions";
import { deleteSummaryMutationOptions } from "@/data-access-layer/resume/summaries/summary.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { SummaryCreateFormDialog } from "./SummaryCreateForm";
import { SummaryListCard } from "./SummaryListCard";

type PageData = Awaited<ReturnType<typeof listSummaries>>;

interface SummaryListProps {
  data: PageData | undefined;
  isLoading: boolean;
  isRefetching: boolean;
}

export function SummaryList({ data, isLoading, isRefetching }: SummaryListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteSummaryMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

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
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Summaries Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any summaries yet. Get started by adding your first summary.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-summary-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Summary"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, sq: "" }),
                  replace: true,
                });
              }}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
        <SummaryCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="summary-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 lg:grid-cols-2" data-test="summary-list">
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
