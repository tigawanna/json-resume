import { SearchBox } from "@/components/search/SearchBox";
import { Button } from "@/components/ui/button";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listResumesPaginated } from "@/data-access-layer/resume/resume.functions";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useDebouncer } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { NewResumeButton } from "./-components/NewResumeButton";
import { ResumeListPage } from "./-components/ResumeList";

const resumesSearchSchema = z.object({
  sq: z.string().optional().catch(""),
  cursor: z.string().optional(),
  dir: z.enum(["after", "before"]).optional().default("after"),
});

export const Route = createFileRoute("/_dashboard/resumes/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Resumes", description: "Manage your resumes" }],
  }),
  ssr: false,
  validateSearch: (search) => resumesSearchSchema.parse(search),
});

function RouteComponent() {
  const { sq, cursor, dir } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(sq ?? "");

  const { data: pageData } = useQuery({
    queryKey: [queryKeyPrefixes.resumes, "page", cursor, dir ?? "after", sq],
    queryFn: () => listResumesPaginated({ data: { cursor, direction: dir, keyword: sq } }),
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
      const next = typeof action === "function" ? action(prev ?? "") : action;
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
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create, edit and tailor your resumes for different roles.
          </p>
        </div>
        <NewResumeButton />
      </div>
      <SearchBox
        keyword={keyword}
        setKeyword={handleKeywordChange}
        debouncedValue={sq ?? ""}
        isDebouncing={debouncer.state.isPending ?? false}
        inputProps={{ placeholder: "Search resumes..." }}
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ResumeListPage />
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
