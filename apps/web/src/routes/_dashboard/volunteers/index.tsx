import { SearchBox } from "@/components/search/SearchBox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listVolunteers } from "@/data-access-layer/resume/volunteers/volunteer.functions";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useDebouncer } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { VolunteerCreateForm } from "./-components/VolunteerCreateForm";
import { VolunteerList } from "./-components/VolunteerList";

const searchSchema = z.object({
  sq: z.string().optional().default(""),
  cursor: z.string().optional(),
  dir: z.enum(["after", "before"]).optional().default("after"),
});

export const Route = createFileRoute("/_dashboard/volunteers/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Volunteers", description: "Manage your volunteer experience" }],
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
    queryKey: [queryKeyPrefixes.volunteers, "page", cursor, dir ?? "after", sq],
    queryFn: () => listVolunteers({ data: { cursor, direction: dir, keyword: sq } }),
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

  return (
    <div className="flex w-full min-h-screen flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Volunteers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Volunteer experience across all your resumes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-test="add-volunteer-btn"
        >
          <Plus className="mr-1 size-4" /> Add
        </Button>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Volunteer Entry</DialogTitle>
          </DialogHeader>
          <VolunteerCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
      <SearchBox
        keyword={keyword}
        setKeyword={handleKeywordChange}
        debouncedValue={sq}
        isDebouncing={debouncer.state.isPending ?? false}
        inputProps={{ placeholder: "Search volunteer experience..." }}
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <VolunteerList />
      </Suspense>
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
    </div>
  );
}
