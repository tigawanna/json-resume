import { linksCollection } from "@/data-access-layer/resume/links/link.collection";
import { deleteLinkMutationOptions } from "@/data-access-layer/resume/links/link.mutation-options";
import { ilike, or, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { LinkIcon } from "lucide-react";
import { Route } from "..";
import { LinkListCard } from "./LinkListCard";

export function LinkList() {
  const { sq } = Route.useSearch();
  const { data: items } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ link: linksCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ link }) => or(ilike(link.label, pattern), ilike(link.url, pattern)));
      }
      return query;
    },
    [sq],
  );
  const deleteMutation = useMutation(deleteLinkMutationOptions);
  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="link-list-page">
      <div className="flex-1" data-test="link-list">
        {items.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <LinkIcon className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No links found. Add links to your resumes first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <LinkListCard
                key={item.id}
                link={item}
                onDelete={(id) => {
                  linksCollection.utils.writeDelete(id);
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
