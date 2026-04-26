import { SearchBox } from "@/components/search/SearchBox";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useDebouncer } from "@tanstack/react-pacer";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { z } from "zod";
import { NewResumeButton } from "./-components/NewResumeButton";
import { ResumeListPage } from "./-components/ResumeList";

const resumesSearchSchema = z.object({
  sq: z.string().optional().catch(""),
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
  const { sq } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(sq ?? "");

  const debouncer = useDebouncer(
    (value: string) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sq: value || undefined,
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

  return (
    <div className="w-full min-h-screen flex flex-col gap-6">
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
    </div>
  );
}
