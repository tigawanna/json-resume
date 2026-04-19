import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { githubReposCollection } from "@/data-access-layer/github/repos-collections";
import { useLiveQuery } from "@tanstack/react-db";

export default function ProjectsAndRepositries() {
  const { data, isLoading } = useLiveQuery((q) => q.from({ repos: githubReposCollection }));
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Loading your GitHub repositories...</p>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Empty>
          <EmptyTitle>No GitHub Repositories Found</EmptyTitle>
          <EmptyDescription>
            We couldn't find any GitHub repositories linked to your account. Please connect your
            GitHub account and try again.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <p className="text-muted-foreground">You have {data.length} repositories linked.</p>
        <ul className="mt-4 space-y-2">
          {data.map((repo) => (
            <li key={repo.id}>{repo.name}</li>
          ))}
        </ul>
    </div>
  );
}
