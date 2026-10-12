import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { workbenchTabSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileX } from "lucide-react";
import { z } from "zod";
import { ResumeWorkbenchProvider } from "./-components/resume-workbench/ResumeWorkbenchProvider";
import { ResumeWorkbenchView } from "./-components/resume-workbench/ResumeWorkbenchView";
import { useEventSourcedResumeDetail } from "./-hooks/use-event-sourced-resume-detail";

const tabSchema = workbenchTabSchema.default("edit").catch("edit");

export const Route = createFileRoute("/_dashboard/resumes/$resumeId/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => z.object({ tab: tabSchema }).parse(search),
  head: () => ({
    meta: [{ title: "Résumé workbench", description: "Local-first résumé workbench" }],
  }),
});

function RouteComponent() {
  const { resumeId } = Route.useParams();
  return <EventSourcedResumeWorkbench key={resumeId} resumeId={resumeId} />;
}

function EventSourcedResumeWorkbench({ resumeId }: { resumeId: string }) {
  const { db, detail, snapshots, isLoading } = useEventSourcedResumeDetail(resumeId);
  const { tab } = Route.useSearch();

  if (isLoading) {
    return <RouterPendingComponent />;
  }

  if (!detail) {
    return (
      <Empty className="border-border/40 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX />
          </EmptyMedia>
          <EmptyTitle>Résumé not found</EmptyTitle>
          <EmptyDescription>
            This local résumé doesn&apos;t exist or may have been deleted.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/resumes">
              <ArrowLeft className="size-4" />
              Back to résumés
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ResumeWorkbenchProvider db={db} detail={detail} snapshots={snapshots}>
      <ResumeWorkbenchView tab={tab} />
    </ResumeWorkbenchProvider>
  );
}
