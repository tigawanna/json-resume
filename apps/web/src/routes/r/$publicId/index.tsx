import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { publicResumeQueryOptions } from "@/data-access-layer/public-resume/query-options";
import { TEMPLATE_IDS, type TemplateId } from "@/features/resume/resume-schema";
import { ResumePreviewView } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumePreviewTab";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, FileX } from "lucide-react";

function asTemplateId(value: string): TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value) ? (value as TemplateId) : "classic";
}

export const Route = createFileRoute("/r/$publicId/")({
  component: PublicResumePage,
  loader: async ({ context, params }) => {
    return context.queryClient.ensureQueryData(publicResumeQueryOptions(params.publicId));
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title ? `${loaderData.title} · Public résumé` : "Public résumé",
        description: "Shared résumé snapshot",
      },
    ],
  }),
});

function PublicResumePage() {
  const { publicId } = Route.useParams();
  const { data } = useSuspenseQuery(publicResumeQueryOptions(publicId));

  if (!data) {
    return (
      <div className="bg-base-100 text-base-content mx-auto flex min-h-dvh w-full max-w-3xl items-center px-4 py-16">
        <Empty className="border-border/40 w-full border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileX />
            </EmptyMedia>
            <EmptyTitle>Résumé not found</EmptyTitle>
            <EmptyDescription>
              This public link is invalid or the résumé was unpublished.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Home
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const templateId = asTemplateId(data.document.meta.templateId);

  return (
    <div className="bg-base-100 text-base-content min-h-dvh" data-test="public-resume-page">
      <header className="border-base-content/10 border-b">
        <div className="mx-auto flex w-full max-w-400 flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Public résumé</p>
            <h1 className="truncate text-xl font-semibold">{data.title}</h1>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-400 px-4 py-6">
        <ResumePreviewView
          resumeName={data.title}
          selectedTemplate={templateId}
          doc={data.document}
        />
      </main>
    </div>
  );
}
