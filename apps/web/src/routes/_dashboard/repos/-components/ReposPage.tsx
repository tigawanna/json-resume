import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  searchGithubRepos,
  type GithubRepo,
  type GithubRepoForkFilter,
  type GithubRepoOrder,
  type GithubRepoSort,
} from "@/data-access-layer/github/repos.functions";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import {
  getSavedProjects,
  saveGithubProject,
  unsaveGithubProject,
} from "@/data-access-layer/saved-project/saved-project.functions";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { authClient } from "@/lib/better-auth/client";
import { unwrapUnknownError } from "@/utils/errors";
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Code2,
  Github,
  Loader,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ArchivedFilter = "any" | "active" | "archived";

interface RepoSearchState {
  query: string;
  language: string;
  topic: string;
  minStars: string;
  fork: GithubRepoForkFilter;
  archived: ArchivedFilter;
  sort: GithubRepoSort;
  order: GithubRepoOrder;
}

const defaultRepoSearch: RepoSearchState = {
  query: "",
  language: "",
  topic: "",
  minStars: "",
  fork: "source",
  archived: "active",
  sort: "updated",
  order: "desc",
};

function githubReposQueryOptions(filters: RepoSearchState) {
  const minStars = filters.minStars ? Number(filters.minStars) : undefined;

  return queryOptions({
    queryKey: [queryKeyPrefixes.githubRepos, "search", filters] as const,
    queryFn: () =>
      searchGithubRepos({
        data: {
          query: filters.query,
          language: filters.language,
          topic: filters.topic,
          minStars: Number.isFinite(minStars) ? minStars : undefined,
          fork: filters.fork,
          archived: filters.archived,
          sort: filters.sort,
          order: filters.order,
        },
      }),
  });
}

const savedProjectsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.savedProjects],
  queryFn: () => getSavedProjects(),
});

function buildSearchPreview(filters: RepoSearchState) {
  const parts = ["user:{you}"];
  if (filters.query) parts.push(filters.query);
  if (filters.language) parts.push(`language:${filters.language}`);
  if (filters.topic) parts.push(`topic:${filters.topic}`);
  if (filters.minStars) parts.push(`stars:>=${filters.minStars}`);
  if (filters.fork === "all") parts.push("fork:true");
  if (filters.fork === "fork") parts.push("fork:only");
  if (filters.archived === "active") parts.push("archived:false");
  if (filters.archived === "archived") parts.push("archived:true");
  return parts.join(" ");
}

export function ReposPage() {
  const [filters, setFilters] = useState<RepoSearchState>(defaultRepoSearch);
  const { debouncedValue: debouncedFilters } = useDebouncedValue(filters, 300);

  const reposQuery = useQuery(githubReposQueryOptions(debouncedFilters));
  const savedQuery = useSuspenseQuery(savedProjectsQueryOptions);
  const savedUrls = new Set(savedQuery.data?.map((p: { url: string }) => p.url) || []);
  const repos = reposQuery.data?.repos || [];
  const preview = buildSearchPreview(filters);

  if (reposQuery.data && !reposQuery.data.hasToken) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="text-center">
          <Github className="mx-auto mb-4 size-16 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-bold">Connect GitHub</h2>
          <p className="mb-6 text-muted-foreground">
            Connect your GitHub account to browse and shortlist repositories for your resume.
          </p>
          <GitHubConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-test="github-repos-page">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">GitHub Repositories</h1>
        <p className="text-muted-foreground">
          Search your GitHub repositories, shortlist the strongest projects, and keep forks out by
          default.
        </p>
      </div>

      <Card data-test="repo-search-builder">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-primary" />
            <CardTitle>Repository search builder</CardTitle>
          </div>
          <CardDescription>
            Compose GitHub repository qualifiers without memorizing the syntax.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(11rem,1fr)_minmax(11rem,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="repo-query">Keywords or qualifiers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="repo-query"
                  data-test="repo-query"
                  placeholder="portfolio in:name,readme"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, query: event.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-language">Language</Label>
              <Input
                id="repo-language"
                data-test="repo-language"
                placeholder="TypeScript"
                value={filters.language}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, language: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-topic">Topic</Label>
              <Input
                id="repo-topic"
                data-test="repo-topic"
                placeholder="react"
                value={filters.topic}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, topic: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="repo-stars">Minimum stars</Label>
              <Input
                id="repo-stars"
                data-test="repo-stars"
                min={0}
                inputMode="numeric"
                type="number"
                placeholder="0"
                value={filters.minStars}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, minStars: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Forks</Label>
              <Select
                value={filters.fork}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    fork: value as GithubRepoForkFilter,
                  }))
                }
              >
                <SelectTrigger data-test="repo-fork-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Sources only</SelectItem>
                  <SelectItem value="all">Include forks</SelectItem>
                  <SelectItem value="fork">Forks only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archive state</Label>
              <Select
                value={filters.archived}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, archived: value as ArchivedFilter }))
                }
              >
                <SelectTrigger data-test="repo-archived-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="any">Any state</SelectItem>
                  <SelectItem value="archived">Archived only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort</Label>
              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, sort: value as GithubRepoSort }))
                }
              >
                <SelectTrigger data-test="repo-sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="forks">Fork count</SelectItem>
                  <SelectItem value="help-wanted-issues">Help wanted</SelectItem>
                  <SelectItem value="best-match">Best match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Select
                value={filters.order}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, order: value as GithubRepoOrder }))
                }
              >
                <SelectTrigger data-test="repo-order" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">High to low</SelectItem>
                  <SelectItem value="asc">Low to high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">GitHub query</p>
              <p className="truncate font-mono text-sm" title={preview}>
                {preview}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              data-test="repo-reset-filters"
              onClick={() => setFilters(defaultRepoSearch)}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{reposQuery.data?.totalCount ?? repos.length} matched</Badge>
        <span>{repos.length} shown</span>
        {reposQuery.data?.incompleteResults ? (
          <span>GitHub marked this search incomplete.</span>
        ) : null}
        {reposQuery.isFetching ? (
          <span className="inline-flex items-center gap-2">
            <Loader className="size-4 animate-spin" />
            Searching
          </span>
        ) : null}
      </div>

      <div className="grid gap-4">
        {reposQuery.isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader className="size-5 animate-spin" />
              Loading repositories
            </CardContent>
          </Card>
        ) : repos.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No repositories match this search.</p>
            </CardContent>
          </Card>
        ) : (
          repos.map((repo: GithubRepo) => (
            <RepoCard key={repo.id} repo={repo} isSaved={savedUrls.has(repo.html_url || "")} />
          ))
        )}
      </div>
    </div>
  );
}

function RepoCard({ repo, isSaved }: { repo: GithubRepo; isSaved: boolean }) {
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await unsaveGithubProject({ data: { url: repo.html_url || "" } });
      } else {
        await saveGithubProject({
          data: {
            name: repo.name || "",
            url: repo.html_url || "",
            homepageUrl: repo.homepage || "",
            description: repo.description || "",
            tech: repo.topics || [],
          },
        });
      }
    },
    onSuccess() {
      toast.success(isSaved ? "Project removed" : "Project saved", {
        description: isSaved ? "Removed from your shortlist" : "Added to your shortlist",
      });
    },
    onError(err: unknown) {
      toast.error("Failed to update project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [["saved-projects"]],
    },
  });

  return (
    <Card className="transition-shadow hover:shadow-md" data-test="repo-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <a
                href={repo.html_url || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-lg font-semibold hover:text-primary hover:underline"
                title={repo.full_name}
              >
                {repo.name}
              </a>
              {repo.private ? (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              ) : null}
              {repo.fork ? (
                <Badge variant="secondary" className="text-xs">
                  Fork
                </Badge>
              ) : null}
            </div>
            {repo.description ? (
              <CardDescription className="line-clamp-2">{repo.description}</CardDescription>
            ) : null}
          </div>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="shrink-0"
            data-test="repo-save-toggle"
          >
            {saveMutation.isPending ? (
              <Loader className="size-4 animate-spin" />
            ) : isSaved ? (
              <>
                <BookmarkCheck className="size-4" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="size-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {repo.language ? (
              <div className="flex items-center gap-1">
                <Code2 className="size-4" />
                <span>{repo.language}</span>
              </div>
            ) : null}
            {repo.stargazers_count !== undefined && repo.stargazers_count > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="size-4" />
                <span>{repo.stargazers_count}</span>
              </div>
            ) : null}
          </div>

          {repo.topics && repo.topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {repo.topics.slice(0, 10).map((topic: string) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <a
              href={repo.html_url || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on GitHub
            </a>
            {repo.homepage ? (
              <>
                <span className="text-muted-foreground">/</span>
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Visit website
                </a>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GitHubConnectButton() {
  const [isPending, setIsPending] = useState(false);

  const handleConnect = async () => {
    setIsPending(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: window.location.href,
      });
    } catch (error) {
      console.error("GitHub login error:", error);
      toast.error("Failed to connect GitHub", {
        description: unwrapUnknownError(error).message,
      });
      setIsPending(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={isPending} size="lg" className="gap-2">
      {isPending ? <Loader className="size-4 animate-spin" /> : <Github className="size-4" />}
      Connect with GitHub
    </Button>
  );
}
