import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { githubReposCollection } from "@/data-access-layer/github/repos-collections";
import type { RepositoryResponse } from "@/data-access-layer/github/repos.octo";
import { savedProjectsCollection } from "@/data-access-layer/saved-project/saved-project.collection";
import type { SavedProjectRow } from "@/data-access-layer/saved-project/saved-project.server";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRouter, useSearch } from "@tanstack/react-router";
import RepoCard from "./RepoCard";
import RepoFilters, { type ForkFilter, type SortField } from "./RepoFilters";

export default function ProjectsAndRepositries() {
  const router = useRouter();
  const { search, sort, forks } = useSearch({ from: "/_dashboard/projects/" });

  const handleSearchChange = (value: string) => {
    void router.navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, search: value }),
      replace: true,
    });
  };

  const handleSortChange = (value: SortField) => {
    void router.navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, sort: value }),
      replace: true,
    });
  };

  const handleForkFilterChange = (value: ForkFilter) => {
    void router.navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, forks: value }),
      replace: true,
    });
  };

  const { debouncedValue: debouncedSearch } = useDebouncedValue(search, 250);
  const sortField = sort as SortField;
  const forkFilter = forks as ForkFilter;

  // Total count (unfiltered)
  const { data: allRepos } = useLiveQuery((q) => q.from({ repo: githubReposCollection }));
  const totalCount = allRepos?.length ?? 0;

  // Filtered + sorted repos with left join on saved projects
  const { data, isLoading } = useLiveQuery(
    (q) => {
      let query = q
        .from({ repo: githubReposCollection })
        .leftJoin({ saved: savedProjectsCollection }, ({ repo, saved }) =>
          eq(repo.html_url, saved.url),
        );

      // Search filter
      if (debouncedSearch) {
        query = query.fn.where((row: { repo: RepositoryResponse; saved?: SavedProjectRow }) => {
          const s = debouncedSearch.toLowerCase();
          const name = row.repo.name?.toLowerCase() ?? "";
          const desc = row.repo.description?.toLowerCase() ?? "";
          const topics = (row.repo.topics ?? []).join(" ").toLowerCase();
          return name.includes(s) || desc.includes(s) || topics.includes(s);
        });
      }

      // Fork filter
      if (forkFilter === "source") {
        query = query.where(({ repo }) => eq(repo.fork, false));
      } else if (forkFilter === "fork") {
        query = query.where(({ repo }) => eq(repo.fork, true));
      }

      // Sorting
      if (sortField === "updated") {
        query = query.orderBy(({ repo }) => repo.updated_at, "desc");
      } else if (sortField === "stars") {
        query = query.orderBy(({ repo }) => repo.stargazers_count, "desc");
      } else if (sortField === "name") {
        query = query.orderBy(({ repo }) => repo.name, "asc");
      } else if (sortField === "created") {
        query = query.orderBy(({ repo }) => repo.created_at, "desc");
      }

      return query.limit(100);
    },
    [debouncedSearch, sortField, forkFilter],
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <RouterPendingComponent />
      </div>
    );
  }

  const filteredCount = data?.length ?? 0;

  return (
    <div className="flex w-full flex-col gap-4 p-4" data-test="projects-page">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">GitHub Repositories</h1>
        <p className="text-sm text-muted-foreground">
          Browse your repositories and save them to manage as projects.
        </p>
      </div>

      <RepoFilters
        search={search}
        onSearchChange={handleSearchChange}
        sortField={sortField}
        onSortChange={handleSortChange}
        forkFilter={forkFilter}
        onForkFilterChange={handleForkFilterChange}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {filteredCount === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Empty>
            <EmptyTitle>
              {totalCount === 0 ? "No Repositories Found" : "No Matching Repositories"}
            </EmptyTitle>
            <EmptyDescription>
              {totalCount === 0
                ? "We couldn't find any GitHub repositories linked to your account. Please connect your GitHub account and try again."
                : "Try adjusting your search or filters to find what you're looking for."}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((row) => (
            <RepoCard key={row.repo.id} repo={row.repo} savedProject={row.saved} />
          ))}
        </div>
      )}
    </div>
  );
}
