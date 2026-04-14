import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Link } from "@tanstack/react-router";
import { Bookmark, FolderGit2 } from "lucide-react";

export function PinnedEmptyState() {
  return (
    <Empty className="min-h-[50vh]" data-test="pinned-empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bookmark className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No pinned projects</EmptyTitle>
        <EmptyDescription>
          Browse your repositories and pin the ones you want highlighted on your
          resume. Pinned projects feed into the AI context when tailoring your
          resume.
        </EmptyDescription>
      </EmptyHeader>
      <Button asChild>
        <Link to="/repos">
          <FolderGit2 className="mr-2 size-4" />
          Browse repositories
        </Link>
      </Button>
    </Empty>
  );
}
