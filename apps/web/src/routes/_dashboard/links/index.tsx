import { SearchBox } from "@/components/search/SearchBox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listLinks } from "@/data-access-layer/resume/links/link.functions";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useDebouncer } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { LinkCreateForm } from "./-components/LinkCreateForm";
import { LinkList } from "./-components/LinkList";

const searchSchema = z.object({
  sq: z.string().optional().default(""),
  cursor: z.string().optional(),
  dir: z.enum(["after", "before"]).optional().default("after"),
});

export const Route = createFileRoute("/_dashboard/links/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Links", description: "Manage your links" }],
  }),
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
});

function RouteComponent() {
  const { sq, cursor, dir } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(sq);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: pageData } = useQuery({
    queryKey: [queryKeyPrefixes.links, "page", cursor, dir ?? "after", sq],
    queryFn: () => listLinks({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });

  const debouncer = useDebouncer(
    (value: string) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sq: value || undefined,
          cursor: undefined,
          dir: undefined,
        }),
        replace: true,
      });
    },
    { wait: 500 },
    (state) => ({ isPending: state.isPending }),
  );

  const handleKeywordChange: React.Dispatch<React.SetStateAction<string>> = (action) => {
    setKeyword((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      debouncer.maybeExecute(next);
      return next;
    });
  };

  function goNext() {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, cursor: pageData?.nextCursor, dir: "after" as const }),
    });
  }

  function goPrevious() {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, cursor: pageData?.previousCursor, dir: "before" as const }),
    });
  }

  const showPagination = Boolean(pageData?.items?.length);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Links</h1>
          <p className="text-muted-foreground mt-1 text-sm">Links across all your resumes.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-test="add-link-btn"
        >
          <Plus className="mr-1 size-4" /> Add
        </Button>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Link</DialogTitle>
          </DialogHeader>
          <LinkCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
      <SearchBox
        keyword={keyword}
        setKeyword={handleKeywordChange}
        debouncedValue={sq}
        isDebouncing={debouncer.state.isPending ?? false}
        inputProps={{ placeholder: "Search links..." }}
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <LinkList />
      </Suspense>
      {showPagination ? (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrevious}
            disabled={!pageData?.previousCursor}
            data-test="pagination-prev"
          >
            <ChevronLeft className="mr-1 size-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={!pageData?.nextCursor}
            data-test="pagination-next"
          >
            Next <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
