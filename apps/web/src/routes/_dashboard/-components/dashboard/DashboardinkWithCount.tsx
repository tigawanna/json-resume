import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { count, useLiveQuery } from "@tanstack/react-db";
import { LibraryQuickLinks } from "./LibraryQuickLinks";

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

export function REsumesLinkWithCount() {
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
    <LibraryQuickLinks
      items={libraryLinks.map((item) => ({
        title: item.title,
        href: item.href,
        icon: item.icon,
        countKey: item.countKey,
        count: counts[item.countKey],
      }))}
    />
  );
}
