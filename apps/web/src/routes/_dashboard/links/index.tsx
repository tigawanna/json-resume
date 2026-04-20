import { SearchBox } from "@/components/search/SearchBox";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useDebouncer } from "@tanstack/react-pacer";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { z } from "zod";
import { LinkList } from "./-components/LinkList";
import { LinkCreateForm } from "./-components/LinkCreateForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const searchSchema = z.object({ sq: z.string().optional().default("") });

export const Route = createFileRoute("/_dashboard/links/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Links", description: "Manage your links" }],
  }),
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
});

function RouteComponent() {
  const { sq } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(sq);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncer = useDebouncer(
    (value: string) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, sq: value || undefined }),
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
  return (
    <div className="flex w-full min-h-screen flex-col gap-6">
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
    </div>
  );
}
