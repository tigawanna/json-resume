import { Button } from "@/components/ui/button";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { count, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Briefcase,
  Contact,
  FileText,
  FolderKanban,
  Globe,
  GraduationCap,
  Heart,
  Link as LinkIcon,
  Loader,
  Mic,
  Notebook,
  StickyNote,
  Wrench,
} from "lucide-react";
import { LibraryActivityHeatmap } from "./-components/LibraryActivityHeatmap";
import { LibraryQuickLinks } from "./-components/LibraryQuickLinks";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Dashboard",
        description: "Your local-first résumé library",
      },
    ],
  }),
});

const libraryLinks = [
  { title: "Résumés", href: "/resumes", icon: FileText, countKey: "resume" as const },
  {
    title: "Experiences",
    href: "/experiences",
    icon: Briefcase,
    countKey: "resumeExperience" as const,
  },
  {
    title: "Education",
    href: "/education",
    icon: GraduationCap,
    countKey: "resumeEducation" as const,
  },
  {
    title: "Projects",
    href: "/resume-projects",
    icon: FolderKanban,
    countKey: "resumeProject" as const,
  },
  {
    title: "Skills",
    href: "/skill-groups",
    icon: Wrench,
    countKey: "resumeSkillGroup" as const,
  },
  {
    title: "Certifications",
    href: "/certifications",
    icon: Award,
    countKey: "resumeCertification" as const,
  },
  { title: "Talks", href: "/talks", icon: Mic, countKey: "resumeTalk" as const },
  {
    title: "Volunteers",
    href: "/volunteers",
    icon: Heart,
    countKey: "resumeVolunteer" as const,
  },
  {
    title: "Languages",
    href: "/languages",
    icon: Globe,
    countKey: "resumeLanguage" as const,
  },
  {
    title: "Contacts",
    href: "/contacts",
    icon: Contact,
    countKey: "resumeContact" as const,
  },
  { title: "Links", href: "/links", icon: LinkIcon, countKey: "resumeLink" as const },
  {
    title: "Summaries",
    href: "/summaries",
    icon: StickyNote,
    countKey: "resumeSummary" as const,
  },
  {
    title: "Notes",
    href: "/notes",
    icon: Notebook,
    countKey: "resumeNote" as const,
  },
] as const;

function RouteComponent() {
  const db = useEventSourcedDb();
  const { data: resumeTotals, isLoading: resumesLoading } = useLiveQuery((q) =>
    q.from({ row: db.collections.resume }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: experienceTotals } = useLiveQuery((q) =>
    q
      .from({ row: db.collections.resumeExperience })
      .select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: educationTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeEducation }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: projectTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeProject }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: skillGroupTotals } = useLiveQuery((q) =>
    q
      .from({ row: db.collections.resumeSkillGroup })
      .select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: certificationTotals } = useLiveQuery((q) =>
    q
      .from({ row: db.collections.resumeCertification })
      .select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: talkTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeTalk }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: volunteerTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeVolunteer }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: languageTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeLanguage }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: contactTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeContact }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: linkTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeLink }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: summaryTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeSummary }).select(({ row }) => ({ total: count(row.id) })),
  );
  const { data: noteTotals } = useLiveQuery((q) =>
    q.from({ row: db.collections.resumeNote }).select(({ row }) => ({ total: count(row.id) })),
  );

  const counts = {
    resume: resumeTotals?.[0]?.total ?? 0,
    resumeExperience: experienceTotals?.[0]?.total ?? 0,
    resumeEducation: educationTotals?.[0]?.total ?? 0,
    resumeProject: projectTotals?.[0]?.total ?? 0,
    resumeSkillGroup: skillGroupTotals?.[0]?.total ?? 0,
    resumeCertification: certificationTotals?.[0]?.total ?? 0,
    resumeTalk: talkTotals?.[0]?.total ?? 0,
    resumeVolunteer: volunteerTotals?.[0]?.total ?? 0,
    resumeLanguage: languageTotals?.[0]?.total ?? 0,
    resumeContact: contactTotals?.[0]?.total ?? 0,
    resumeLink: linkTotals?.[0]?.total ?? 0,
    resumeSummary: summaryTotals?.[0]?.total ?? 0,
    resumeNote: noteTotals?.[0]?.total ?? 0,
  };

  if (resumesLoading) {
    return (
      <div className="flex h-full min-h-64 w-full items-center justify-center">
        <Loader className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8" data-test="event-sourced-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Local library</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            CRUD the résumé building blocks against your event-sourced collections. Sync is off for
            now — everything stays on this device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* <ImportAllFromLegacyButton /> */}
          <Button asChild variant="outline" size="sm">
            <Link to="/resumes">
              <FileText className="mr-1 size-4" />
              Open résumés
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.95fr)]">
        <LibraryQuickLinks
          items={libraryLinks.map((item) => ({
            title: item.title,
            href: item.href,
            icon: item.icon,
            countKey: item.countKey,
            count: counts[item.countKey],
          }))}
        />
        <LibraryActivityHeatmap />
      </div>
    </div>
  );
}
