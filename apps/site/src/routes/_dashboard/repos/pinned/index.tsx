import { ListPageHeader } from "@/components/wrappers/ListPageHeader";
import { Button } from "@/components/ui/button";
import { pinnedProjectsQueryOptions } from "@/data-access-layer/github/github-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PinnedProjectsList } from "./-components/PinnedProjectsList";
import { PinnedEmptyState } from "./-components/PinnedEmptyState";

export const Route = createFileRoute("/_dashboard/repos/pinned/")({
  component: PinnedProjectsPage,
  head: () => ({
    meta: [
      {
        title: "Pinned Projects",
        description: "Manage your shortlisted GitHub projects",
      },
    ],
  }),
});

function PinnedProjectsPage() {
  const { data: pinned } = useSuspenseQuery(pinnedProjectsQueryOptions);

  if (pinned.length === 0) {
    return (
      <div className="flex flex-col gap-6" data-test="pinned-page">
        <ListPageHeader
          title="Pinned Projects"
          formTrigger={
            <Button asChild variant="outline" size="sm">
              <Link to="/repos">
                <ArrowLeft className="mr-2 size-4" />
                Browse repos
              </Link>
            </Button>
          }
        />
        <PinnedEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-test="pinned-page">
      <ListPageHeader
        title="Pinned Projects"
        formTrigger={
          <Button asChild variant="outline" size="sm">
            <Link to="/repos">
              <ArrowLeft className="mr-2 size-4" />
              Browse repos
            </Link>
          </Button>
        }
      />
      <PinnedProjectsList projects={pinned} />
    </div>
  );
}
