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
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listTalks } from "@/data-access-layer/resume/talks/talk.functions";
import { deleteTalkMutationOptions } from "@/data-access-layer/resume/talks/talk.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Mic, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { TalkCreateFormDialog } from "./TalkCreateForm";
import { TalkListCard } from "./TalkListCard";

export function TalkList() {
  const { sq, cursor, dir } = Route.useSearch();
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.talks, "page", cursor, dir ?? "after", sq],
    queryFn: () => listTalks({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteTalkMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="talk-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="talk-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Mic className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Talks Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any talks yet. Get started by adding your first talk.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-talk-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Talk"}
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
        <TalkCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="talk-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="talk-list">
        {data.items.map((item) => (
          <TalkListCard key={item.id} talk={item} onDelete={(id) => deleteMutation.mutate(id)} />
        ))}
      </div>
    </div>
  );
}
