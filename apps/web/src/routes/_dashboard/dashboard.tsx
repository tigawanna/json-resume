import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listEducation } from "@/data-access-layer/resume/education/education.functions";
import { listExperiences } from "@/data-access-layer/resume/experiences/experience.functions";
import { listResumeProjects } from "@/data-access-layer/resume/resume-projects/resume-project.functions";
import { listResumes } from "@/data-access-layer/resume/resume.functions";
import { listSkillGroups } from "@/data-access-layer/resume/skill-groups/skill-group.functions";
import { getSavedProjects } from "@/data-access-layer/saved-project/saved-project.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Briefcase,
  FileText,
  FolderGit2,
  GraduationCap,
  Layers3,
  Sparkles,
  Wrench,
} from "lucide-react";

const dashboardResumesQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.resumes, "dashboard"],
  queryFn: () => listResumes(),
});

const dashboardExperienceQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.experiences, "dashboard"],
  queryFn: () => listExperiences({ data: {} }),
});

const dashboardEducationQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.education, "dashboard"],
  queryFn: () => listEducation({ data: {} }),
});

const dashboardProjectsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.resumeProjects, "dashboard"],
  queryFn: () => listResumeProjects({ data: {} }),
});

const dashboardSkillsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.skillGroups, "dashboard"],
  queryFn: () => listSkillGroups({ data: {} }),
});

const dashboardSavedProjectsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.savedProjects, "dashboard"],
  queryFn: () => getSavedProjects(),
});

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: resumes } = useSuspenseQuery(dashboardResumesQueryOptions);
  const { data: experiences } = useSuspenseQuery(dashboardExperienceQueryOptions);
  const { data: education } = useSuspenseQuery(dashboardEducationQueryOptions);
  const { data: projects } = useSuspenseQuery(dashboardProjectsQueryOptions);
  const { data: skills } = useSuspenseQuery(dashboardSkillsQueryOptions);
  const { data: savedProjects } = useSuspenseQuery(dashboardSavedProjectsQueryOptions);

  const latestResume = resumes[0];
  const contentCount =
    (experiences.items?.length ?? 0) +
    (education.items?.length ?? 0) +
    (projects.items?.length ?? 0) +
    (skills.items?.length ?? 0);
  const readinessItems = [
    {
      label: "Resumes",
      count: resumes.length,
      href: "/resumes?dir=after",
      icon: FileText,
    },
    {
      label: "Experience",
      count: experiences.items?.length ?? 0,
      href: "/experiences",
      icon: Briefcase,
    },
    {
      label: "Projects",
      count: projects.items?.length ?? 0,
      href: "/resume-projects",
      icon: FolderGit2,
    },
    {
      label: "Skills",
      count: skills.items?.length ?? 0,
      href: "/skill-groups",
      icon: Wrench,
    },
  ] as const;

  return (
    <div className="flex w-full flex-col gap-6" data-test="dashboard-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Your resume workspace for tailoring content, collecting projects, and shipping the next
            version.
          </p>
        </div>
        <Button asChild data-test="dashboard-primary-action">
          <Link to="/resumes" search={{ dir: "after" }}>
            Open resumes
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileText} label="Resumes" value={resumes.length} helper="Tailored docs" />
        <MetricCard
          icon={Layers3}
          label="Content blocks"
          value={contentCount}
          helper="Reusable resume data"
        />
        <MetricCard
          icon={FolderGit2}
          label="Saved projects"
          value={savedProjects.length}
          helper="GitHub shortlist"
        />
        <MetricCard
          icon={Sparkles}
          label="Ready signals"
          value={readinessItems.filter((item) => item.count > 0).length}
          helper="Sections with content"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card data-test="dashboard-readiness">
          <CardHeader>
            <CardTitle>Workspace readiness</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {readinessItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-md border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon className="size-5 text-primary" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <Badge variant={item.count > 0 ? "secondary" : "outline"}>{item.count}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.count > 0
                      ? "Content is available for tailoring."
                      : "Add this section next."}
                  </p>
                </a>
              );
            })}
          </CardContent>
        </Card>

        <Card data-test="dashboard-next-actions">
          <CardHeader>
            <CardTitle>Next actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionLink
              to="/repos"
              icon={FolderGit2}
              title="Find GitHub projects"
              description="Search source repositories and save the best ones."
            />
            <ActionLink
              to="/experiences"
              icon={Briefcase}
              title="Strengthen experience"
              description="Add recent roles and measurable impact bullets."
            />
            <ActionLink
              to="/education"
              icon={GraduationCap}
              title="Review education"
              description="Keep schools, credentials, and supporting details current."
            />
          </CardContent>
        </Card>
      </div>

      <Card data-test="dashboard-latest-resume">
        <CardHeader>
          <CardTitle>Latest resume</CardTitle>
        </CardHeader>
        <CardContent>
          {latestResume ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">{latestResume.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {latestResume.headline || latestResume.description || "No headline yet"}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link
                  to="/resumes/$resumeId"
                  params={{ resumeId: latestResume.id }}
                  search={{ tab: "edit" }}
                >
                  Continue editing
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Create your first resume, then use the content library to tailor it for each role.
              </p>
              <Button asChild>
                <Link to="/resumes" search={{ dir: "after" }}>
                  Start a resume
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-md bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <a href={to} className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50">
      <Icon className="mt-0.5 size-5 text-primary" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </a>
  );
}
