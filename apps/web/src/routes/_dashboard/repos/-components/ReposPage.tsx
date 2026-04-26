import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { getGithubRepos, type GithubRepo } from "@/data-access-layer/github/repos.functions";
import {
  getSavedProjects,
  saveGithubProject,
  unsaveGithubProject,
} from "@/data-access-layer/saved-project/saved-project.functions";
import { authClient } from "@/lib/better-auth/client";
import { unwrapUnknownError } from "@/utils/errors";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { AlertCircle, Bookmark, BookmarkCheck, Github, Loader, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const reposQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.githubRepos],
  queryFn: () => getGithubRepos(),
});

const savedProjectsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.savedProjects],
  queryFn: () => getSavedProjects(),
});

export function ReposPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const reposQuery = useSuspenseQuery(reposQueryOptions);

  // Fetch saved projects
  const savedQuery = useSuspenseQuery(savedProjectsQueryOptions);
  const savedUrls = new Set(savedQuery.data?.map((p: { url: string }) => p.url) || []);

  // Handle missing GitHub token
  if (!reposQuery.data?.hasToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <Github className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Connect GitHub</h2>
          <p className="text-muted-foreground mb-6">
            Connect your GitHub account to browse and shortlist your repositories for your resume.
          </p>
          <GitHubConnectButton />
        </div>
      </div>
    );
  }

  const repos = reposQuery.data?.repos || [];

  // Filter repos based on search query
  const filteredRepos = repos.filter((repo: GithubRepo) => {
    const query = searchQuery.toLowerCase();
    return (
      repo.name?.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      repo.topics?.some((topic: string) => topic.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GitHub Repositories</h1>
        <p className="text-muted-foreground">
          Browse your repositories and shortlist projects to use in your resume.
        </p>
      </div>

      <Input
        placeholder="Search repositories by name, description, or topic..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="grid gap-4">
        {filteredRepos.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {repos.length === 0 ? "No repositories found" : "No repositories match your search"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRepos.map((repo: GithubRepo) => (
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <a
                href={repo.html_url || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold hover:text-primary hover:underline truncate"
                title={repo.full_name}
              >
                {repo.name}
              </a>
              {repo.private && (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
            {repo.description && (
              <CardDescription className="line-clamp-2">{repo.description}</CardDescription>
            )}
          </div>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="shrink-0"
          >
            {saveMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {repo.language && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{repo.language}</span>
              </div>
            )}
            {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>{repo.stargazers_count}</span>
              </div>
            )}
          </div>

          {/* Topics/Tags */}
          {repo.topics && repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {repo.topics.map((topic: string) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2 flex-wrap">
            <a
              href={repo.html_url || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on GitHub
            </a>
            {repo.homepage && (
              <>
                <span className="text-muted-foreground">•</span>
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Visit Website
                </a>
              </>
            )}
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
      {isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
      Connect with GitHub
    </Button>
  );
}
