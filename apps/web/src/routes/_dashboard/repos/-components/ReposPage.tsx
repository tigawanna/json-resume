import {
  ResourceCard,
  ResourceCardBody,
  ResourceCardFooter,
  ResourceCardHeader,
} from "@/components/resource-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import {
  githubReposQueryOptions,
  type GithubRepo,
} from "@/data-access-layer/github/repos-query-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { authClient } from "@/lib/better-auth/client";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { ArrowUpRight, Bookmark, BookmarkCheck, Code2, Github, Loader, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adoptSavedProjects } from "../../-utils/adopt-saved-projects";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";
import { REPO_PAGE_ROUTEID } from "./constants";
import { ReposFilters } from "./ReposFilters";

function repoSaveLabel(isToggling: boolean, isSaved: boolean) {
  if (isToggling) return <Loader className="size-4 animate-spin" />;
  if (isSaved) {
    return (
      <>
        <BookmarkCheck className="size-4" />
        Unsave
      </>
    );
  }
  return (
    <>
      <Bookmark className="size-4" />
      Save
    </>
  );
}

const routeApi = getRouteApi(REPO_PAGE_ROUTEID);

export function ReposPage() {
  const db = useEventSourcedDb();
  const filters = routeApi.useSearch();

  useEffect(() => {
    adoptSavedProjects(db);
  }, [db]);
  const reposQuery = useQuery(githubReposQueryOptions(filters));
  const repos = reposQuery.data?.repos || [];

  if (reposQuery.data && !reposQuery.data.hasToken) {
    return (
      <div className="flex min-h-full w-full flex-col gap-6" data-test="github-repos-page">
        <ReposHeading />
        <Empty data-test="repos-connect-github">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Github className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>Connect GitHub</EmptyTitle>
            <EmptyDescription>
              Connect your GitHub account to browse and shortlist repositories for your résumé.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <GitHubConnectButton />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6" data-test="github-repos-page">
      <ReposHeading />
      <ReposFilters />
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">{reposQuery.data?.totalCount ?? repos.length} matched</Badge>
        <span>{repos.length} shown</span>
        {reposQuery.data?.incompleteResults ? (
          <span>GitHub marked this search incomplete.</span>
        ) : null}
      </div>
      {repoResults({ isLoading: reposQuery.isLoading, repos })}
    </div>
  );
}

function ReposHeading() {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight">GitHub repositories</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Search GitHub and save repositories onto your project shortlist.
      </p>
    </div>
  );
}

function repoResults({ isLoading, repos }: { isLoading: boolean; repos: GithubRepo[] }) {
  if (isLoading) return <RouterPendingComponent showHeader={false} height="min-h-64" />;
  if (repos.length === 0) {
    return (
      <Empty data-test="repos-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Github className="text-muted-foreground size-12" />
          </EmptyMedia>
          <EmptyTitle>No matches</EmptyTitle>
          <EmptyDescription>
            Nothing matched this GitHub search. Try a different query.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const repoUrl = repo.html_url || "";

  const { data: savedMatches } = useLiveQuery(
    (q) =>
      q
        .from({ projects: db.collections.resumeProject })
        .where(({ projects }) => eq(projects.url, repoUrl)),
    [repoUrl],
  );

  const savedProject = savedMatches?.[0];
  const isSaved = !!savedProject;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const userId = viewer.user?.id;
      if (!userId) throw new Error("Sign in to save projects");
      const name = repo.name || "";
      const description = repo.description || "";
      const tech = JSON.stringify(repo.topics || []);
      const base = libraryRowBase(userId);
      db.collections.resumeProject.insert({
        ...base,
        name,
        url: repoUrl,
        homepageUrl: repo.homepage || "",
        description,
        tech,
        searchableText: joinSearchable(name, description, tech, repoUrl),
      });
    },
    onSuccess() {
      toast.success("Project saved", { description: "Added to your shortlist" });
    },
    onError(err: unknown) {
      toast.error("Failed to save project", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      if (!savedProject) return;
      deleteWithReferences(db, "resumeProject", savedProject.id);
    },
    onSuccess() {
      toast.success("Project removed", { description: "Removed from your shortlist" });
    },
    onError(err: unknown) {
      toast.error("Failed to remove project", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const isToggling = saveMutation.isPending || unsaveMutation.isPending;

  return (
    <ResourceCard
      className="h-full"
      dataTest="repo-card"
      link={
        <a href={repo.html_url || ""} target="_blank" rel="noopener noreferrer">
          <span className="sr-only">View {repo.name} on GitHub</span>
        </a>
      }
    >
      <ResourceCardHeader
        title={repo.name}
        meta={
          <>
            {repo.private ? (
              <Badge variant="outline" className="text-[10px]">
                Private
              </Badge>
            ) : null}
            {repo.fork ? (
              <Badge variant="secondary" className="text-[10px]">
                Fork
              </Badge>
            ) : null}
            {repo.language ? (
              <span className="inline-flex items-center gap-1">
                <Code2 className="size-3" />
                {repo.language}
              </span>
            ) : null}
            {repo.stargazers_count !== undefined && repo.stargazers_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3" />
                {repo.stargazers_count}
              </span>
            ) : null}
          </>
        }
        actions={
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={() => (isSaved ? unsaveMutation.mutate() : saveMutation.mutate())}
            disabled={isToggling}
            data-test="repo-save-toggle"
          >
            {repoSaveLabel(isToggling, isSaved)}
          </Button>
        }
      />
      {repo.description ? (
        <ResourceCardBody className="text-muted-foreground text-xs" clamp={2}>
          {repo.description}
        </ResourceCardBody>
      ) : (
        <div className="py-3" />
      )}
      {repo.topics && repo.topics.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {repo.topics.slice(0, 6).map((topic: string) => (
            <Badge key={topic} variant="secondary" className="text-[10px]">
              {topic}
            </Badge>
          ))}
        </div>
      ) : null}
      <ResourceCardFooter className="flex items-center justify-between gap-3">
        <span className="truncate">{repo.full_name}</span>
        <span className="inline-flex shrink-0 items-center gap-2">
          {repo.homepage ? (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto relative z-20 hover:text-foreground"
            >
              Website
            </a>
          ) : null}
          <span className="inline-flex items-center gap-1">
            GitHub
            <ArrowUpRight className="size-3" />
          </span>
        </span>
      </ResourceCardFooter>
    </ResourceCard>
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
    <Button onClick={handleConnect} disabled={isPending} size="sm" className="gap-2">
      {isPending ? <Loader className="size-4 animate-spin" /> : <Github className="size-4" />}
      Connect with GitHub
    </Button>
  );
}
