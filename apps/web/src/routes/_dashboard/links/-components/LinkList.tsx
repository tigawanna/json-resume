import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listLinks } from "@/data-access-layer/resume/links/link.functions";
import { deleteLinkMutationOptions } from "@/data-access-layer/resume/links/link.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinkIcon } from "lucide-react";
import { Route } from "..";
import { LinkListCard } from "./LinkListCard";

export function LinkList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.links, "page", cursor, dir ?? "after", sq],
    queryFn: () => listLinks({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteLinkMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="link-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="link-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <LinkIcon className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No links found. Add links to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="link-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="link-list">
        {data.items.map((item) => (
          <LinkListCard key={item.id} link={item} onDelete={(id) => deleteMutation.mutate(id)} />
        ))}
      </div>
    </div>
  );
}
