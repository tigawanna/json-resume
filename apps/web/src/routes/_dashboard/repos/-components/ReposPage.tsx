import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
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
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { RepoArchivedFilter } from "@/routes/_dashboard/repos/-components/repos-search-query";
import {
  canonicalizePopularLanguage,
  LANGUAGE_SELECT_CUSTOM,
  LANGUAGE_SELECT_NONE,
  POPULAR_GITHUB_LANGUAGES,
  repositoryLanguageControlValue,
  splitLanguageForUi,
} from "@/routes/_dashboard/repos/-components/popular-github-languages";
import {
  buildRepoSearchPreview,
  defaultRepoSearch,
  parseRepoSearchBar,
  type RepoSearchFilters,
} from "@/routes/_dashboard/repos/-components/repos-search-query";

const GITHUB_REPOS_QUERY_CACHE_MS = 24 * 60 * 60 * 1000;

function githubReposQueryOptions(filters: RepoSearchFilters) {
  const minStars = filters.minStars ? Number(filters.minStars) : undefined;

  return queryOptions({
    queryKey: [queryKeyPrefixes.githubRepos, "search", filters] as const,
    staleTime: GITHUB_REPOS_QUERY_CACHE_MS,
    gcTime: GITHUB_REPOS_QUERY_CACHE_MS,
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

export function ReposPage() {
  const [filters, setFilters] = useState<RepoSearchFilters>(defaultRepoSearch);
  const [queryDraft, setQueryDraft] = useState(() => buildRepoSearchPreview(defaultRepoSearch));
  const [languageOtherOpen, setLanguageOtherOpen] = useState(false);

  const commitFilters = useCallback((next: RepoSearchFilters) => {
    setFilters(next);
    setQueryDraft(buildRepoSearchPreview(next));
  }, []);

  const { debouncedValue: debouncedQueryDraft } = useDebouncedValue(queryDraft, 300);

  useEffect(() => {
    setFilters((prev) => parseRepoSearchBar(debouncedQueryDraft, prev));
  }, [debouncedQueryDraft]);

  useEffect(() => {
    if (repositoryLanguageControlValue(filters.language) === LANGUAGE_SELECT_CUSTOM) {
      setLanguageOtherOpen(true);
    }
  }, [filters.language]);

  const reposQuery = useQuery(githubReposQueryOptions(filters));
  const savedQuery = useSuspenseQuery(savedProjectsQueryOptions);
  const savedUrls = new Set(savedQuery.data?.map((p: { url: string }) => p.url) || []);
  const repos = reposQuery.data?.repos || [];

  const langSplit = splitLanguageForUi(filters.language);
  const languageSelectValue =
    langSplit.preset === LANGUAGE_SELECT_CUSTOM ||
    (languageOtherOpen && langSplit.preset === LANGUAGE_SELECT_NONE)
      ? LANGUAGE_SELECT_CUSTOM
      : langSplit.preset;

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

      <div className="@container/repo-toolbar w-full min-w-0" data-test="repo-search-builder">
        <div className="flex w-full min-w-0 flex-col gap-3 @min-[28rem]/repo-toolbar:flex-row @min-[28rem]/repo-toolbar:items-stretch @min-[28rem]/repo-toolbar:gap-3">
          <div className="relative min-h-9 min-w-0 w-full flex-[1_1_auto] @min-[28rem]/repo-toolbar:flex-[7_1_0%]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="repo-query"
              data-test="repo-query"
              placeholder="user:{you} portfolio in:name archived:false …"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              className="pl-9 font-mono text-sm"
              spellCheck={false}
              aria-label="GitHub search query string"
            />
          </div>
          <div className="flex w-full min-w-0 flex-[1_1_auto] flex-row flex-nowrap items-center gap-2 @min-[28rem]/repo-toolbar:w-auto @min-[28rem]/repo-toolbar:flex-[3_1_0%] @min-[28rem]/repo-toolbar:max-w-[30%]">
            <div className="min-w-0 flex-1">
              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  commitFilters({ ...filters, sort: value as RepoSearchFilters["sort"] })
                }
              >
                <SelectTrigger
                  data-test="repo-sort"
                  className="h-9 w-full min-w-0 max-w-full justify-between"
                >
                  <SelectValue placeholder="Sort" />
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
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="Search filters"
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[min(85vh,36rem)] max-w-xl gap-6 overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="size-5 text-primary" />
                    Repository search builder
                  </DialogTitle>
                  <DialogDescription>
                    Compose structured GitHub qualifiers; the main field shows the full query GitHub
                    receives (except sort and order API parameters).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="repo-language-preset">Language</Label>
                    <Select
                      value={languageSelectValue}
                      onValueChange={(value) => {
                        if (value === LANGUAGE_SELECT_NONE) {
                          setLanguageOtherOpen(false);
                          commitFilters({ ...filters, language: "" });
                          return;
                        }
                        if (value === LANGUAGE_SELECT_CUSTOM) {
                          setLanguageOtherOpen(true);
                          const canon = canonicalizePopularLanguage(filters.language.trim());
                          if (canon) {
                            commitFilters({ ...filters, language: "" });
                          }
                          return;
                        }
                        setLanguageOtherOpen(false);
                        commitFilters({ ...filters, language: value });
                      }}
                    >
                      <SelectTrigger
                        id="repo-language-preset"
                        data-test="repo-language"
                        className="w-full"
                      >
                        <SelectValue placeholder="Filter by language" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(280px,50vh)]">
                        <SelectItem value={LANGUAGE_SELECT_NONE}>Any language</SelectItem>
                        {POPULAR_GITHUB_LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                        <SelectItem value={LANGUAGE_SELECT_CUSTOM}>
                          Other (type manually)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {languageSelectValue === LANGUAGE_SELECT_CUSTOM ? (
                      <Input
                        id="repo-language-custom"
                        data-test="repo-language-custom"
                        placeholder="e.g. Solidity, Fortran, COBOL"
                        value={filters.language}
                        onChange={(event) =>
                          commitFilters({ ...filters, language: event.target.value })
                        }
                        className="font-mono text-sm"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex min-w-[min(100%,10rem)] flex-1 flex-col gap-2">
                      <Label htmlFor="repo-topic">Topic</Label>
                      <Input
                        id="repo-topic"
                        data-test="repo-topic"
                        placeholder="react"
                        value={filters.topic}
                        onChange={(event) =>
                          commitFilters({ ...filters, topic: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex min-w-[min(100%,10rem)] flex-1 flex-col gap-2">
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
                          commitFilters({ ...filters, minStars: event.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex min-w-[min(100%,10rem)] flex-1 flex-col gap-2">
                      <Label>Forks</Label>
                      <Select
                        value={filters.fork}
                        onValueChange={(value) =>
                          commitFilters({ ...filters, fork: value as GithubRepoForkFilter })
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
                    <div className="flex min-w-[min(100%,10rem)] flex-1 flex-col gap-2">
                      <Label>Archive state</Label>
                      <Select
                        value={filters.archived}
                        onValueChange={(value) =>
                          commitFilters({ ...filters, archived: value as RepoArchivedFilter })
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
                    <div className="flex min-w-[min(100%,10rem)] flex-1 flex-col gap-2">
                      <Label>Order</Label>
                      <Select
                        value={filters.order}
                        onValueChange={(value) =>
                          commitFilters({ ...filters, order: value as RepoSearchFilters["order"] })
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
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    data-test="repo-reset-filters"
                    onClick={() => {
                      setLanguageOtherOpen(false);
                      commitFilters(defaultRepoSearch);
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

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

type SavedProjectCacheEntry = { url: string; [key: string]: unknown };

function RepoCard({ repo, isSaved }: { repo: GithubRepo; isSaved: boolean }) {
  const queryClient = useQueryClient();
  const repoUrl = repo.html_url || "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await unsaveGithubProject({ data: { url: repoUrl } });
      } else {
        await saveGithubProject({
          data: {
            name: repo.name || "",
            url: repoUrl,
            homepageUrl: repo.homepage || "",
            description: repo.description || "",
            tech: repo.topics || [],
          },
        });
      }
    },
    async onMutate() {
      const wasAlreadySaved = isSaved;
      const { queryKey } = savedProjectsQueryOptions;

      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        if (wasAlreadySaved) {
          return old.filter((p: SavedProjectCacheEntry) => p.url !== repoUrl);
        }
        return [
          ...old,
          {
            id: `optimistic-${repo.id}`,
            url: repoUrl,
            name: repo.name || "",
            homepageUrl: repo.homepage || "",
            description: repo.description || "",
            tech: JSON.stringify(repo.topics || []),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      });

      return { previous, wasAlreadySaved };
    },
    onSuccess(_data, _vars, context) {
      toast.success(context?.wasAlreadySaved ? "Project removed" : "Project saved", {
        description: context?.wasAlreadySaved
          ? "Removed from your shortlist"
          : "Added to your shortlist",
      });
    },
    onError(err: unknown, _vars, context) {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(savedProjectsQueryOptions.queryKey, context.previous);
      }
      toast.error("Failed to update project", {
        description: unwrapUnknownError(err).message,
      });
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey: savedProjectsQueryOptions.queryKey });
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
