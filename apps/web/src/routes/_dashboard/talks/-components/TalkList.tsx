import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listTalks } from "@/data-access-layer/resume/talks/talk.functions";
import { deleteTalkMutationOptions } from "@/data-access-layer/resume/talks/talk.mutation-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader, Mic } from "lucide-react";
import { Route } from "..";
import { TalkListCard } from "./TalkListCard";

export function TalkList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.talks, "page", cursor, dir ?? "after", sq],
    queryFn: () => listTalks({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteTalkMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="talk-list-page">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="talk-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <Mic className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No talks found. Add talks to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="talk-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="talk-list">
        {data.items.map((item) => (
          <TalkListCard key={item.id} talk={item} onDelete={(id) => deleteMutation.mutate(id)} />
        ))}
      </div>
    </div>
  );
}
