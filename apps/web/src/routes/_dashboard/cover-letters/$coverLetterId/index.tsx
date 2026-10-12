import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MailX } from "lucide-react";
import { CoverLetterEditor } from "./-components/CoverLetterEditor";

export const Route = createFileRoute("/_dashboard/cover-letters/$coverLetterId/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [{ title: "Cover letter", description: "Edit, copy, or export a cover letter." }],
  }),
});

function RouteComponent() {
  const { coverLetterId } = Route.useParams();
  return <CoverLetterPage key={coverLetterId} coverLetterId={coverLetterId} />;
}

function CoverLetterPage({ coverLetterId }: { coverLetterId: string }) {
  const db = useEventSourcedDb();
  const { data, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ letter: db.collections.coverLetter })
        .where(({ letter }) => eq(letter.id, coverLetterId)),
    [coverLetterId],
  );
  const letter = data?.[0];

  if (isLoading) return <RouterPendingComponent />;

  if (!letter) {
    return (
      <Empty className="border-border/40 border" data-test="cover-letter-not-found">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailX />
          </EmptyMedia>
          <EmptyTitle>Cover letter not found</EmptyTitle>
          <EmptyDescription>
            This cover letter doesn&apos;t exist or may have been deleted.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/cover-letters">
              <ArrowLeft className="size-4" />
              Back to cover letters
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return <CoverLetterEditor letter={letter} />;
}
