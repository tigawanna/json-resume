import { ListPageHeader } from "@/components/wrappers/ListPageHeader";
import { githubConnectionQueryOptions } from "@/data-access-layer/github/github-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ConnectGithubPrompt } from "./-components/ConnectGithubPrompt";
import { PinnedProjectsSummary } from "./-components/PinnedProjectsSummary";
import { ReposBrowser } from "./-components/ReposBrowser";

export const Route = createFileRoute("/_dashboard/repos/")({
  component: ReposPage,
  head: () => ({
    meta: [{ title: "Repositories", description: "Browse and pin your GitHub projects" }],
  }),
});

function ReposPage() {
  const { data: connection } = useSuspenseQuery(githubConnectionQueryOptions);

  if (!connection.connected) {
    return <ConnectGithubPrompt />;
  }

  return (
    <div className="flex flex-col gap-6" data-test="repos-page">
      <ListPageHeader title="Repositories" />
      <PinnedProjectsSummary />
      <ReposBrowser />
    </div>
  );
}
