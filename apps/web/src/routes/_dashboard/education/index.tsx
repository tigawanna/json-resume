import { SearchBox } from "@/components/search/SearchBox";
import { Button } from "@/components/ui/button";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listEducation } from "@/data-access-layer/resume/education/education.functions";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useDebouncer } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { Suspense, useState, useTransition } from "react";
import { z } from "zod";
import { EducationCreateFormDilaog } from "./-components/EducationCreateForm";
import { EducationList } from "./-components/EducationList";

const searchSchema = z.object({
  sq: z.string().optional().default(""),
  cursor: z.string().optional(),
  dir: z.enum(["after", "before"]).optional().default("after"),
});

export const Route = createFileRoute("/_dashboard/education/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Education", description: "Manage your education entries" }],
  }),
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
});

function RouteComponent() {
  const { sq, cursor, dir } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(sq);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();

  // Read cursor data from cache (populated by EducationList's useSuspenseQuery)
  // to drive button disabled states — same queryKey, no duplicate fetch
  const { data: pageData } = useQuery({
    queryKey: [queryKeyPrefixes.education, "page", cursor, dir ?? "after", sq],
    queryFn: () => listEducation({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });

  const debouncer = useDebouncer(
    (value: string) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sq: value || undefined,
          // Reset pagination when search changes
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

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  const showPagination = Boolean(pageData?.items?.length);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Education</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Education entries across all your resumes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openCreateDialog}
          disabled={isCreateOpenPending}
          data-test="add-education-btn"
        >
          {isCreateOpenPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Plus className="mr-1 size-4" />
          )}
          {isCreateOpenPending ? "Opening..." : "Add"}
        </Button>
      </div>
      <EducationCreateFormDilaog open={createOpen} setOpen={setCreateOpen} />
      <div className="flex items-center gap-2">
        <SearchBox
          keyword={keyword}
          setKeyword={handleKeywordChange}
          debouncedValue={sq}
          isDebouncing={debouncer.state.isPending ?? false}
          inputProps={{ placeholder: "Search education..." }}
        />
      </div>
      <Suspense fallback={<RouterPendingComponent />}>
        <EducationList />
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
