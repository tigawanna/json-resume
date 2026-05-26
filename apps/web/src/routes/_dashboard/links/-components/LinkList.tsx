import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { listLinks } from "@/data-access-layer/resume/links/link.functions";
import { deleteLinkMutationOptions } from "@/data-access-layer/resume/links/link.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { LinkIcon, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { LinkCreateFormDialog } from "./LinkCreateForm";
import { LinkListCard } from "./LinkListCard";

type PageData = Awaited<ReturnType<typeof listLinks>>;

interface LinkListProps {
  data: PageData | undefined;
  isLoading: boolean;
}

export function LinkList({ data, isLoading }: LinkListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteLinkMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="link-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="link-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LinkIcon className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Links Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any links yet. Get started by adding your first link.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-link-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Link"}
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
        <LinkCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="link-list-page">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="link-list">
        {data.items.map((item) => (
          <LinkListCard key={item.id} link={item} onDelete={(id) => deleteMutation.mutate(id)} />
        ))}
      </div>
    </div>
  );
}
