import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminStatsQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, linkOptions } from "@tanstack/react-router";
import { ArrowRight, Database, Table2, Users } from "lucide-react";
import { AdminPageHeader } from "./AdminPageHeader";

const sections = [
  {
    to: "/admin/data",
    title: "Data management",
    description: "Event log activity, projection backlog, and per-user log rebuilds.",
    icon: Database,
  },
  {
    to: "/admin/tables",
    title: "Tables",
    description: "Browse every table in the remote database, grouped by area.",
    icon: Table2,
  },
  {
    to: "/admin/users",
    title: "Users",
    description: "Everyone with an account, their role, résumés, and sync activity.",
    icon: Users,
  },
] as const;

export function AdminHome() {
  const { data: stats } = useSuspenseQuery(adminStatsQueryOptions);

  const metrics = [
    {
      label: "Users",
      value: stats.users,
      hint: `${stats.admins} admin`,
      link: linkOptions({ to: "/admin/users" }),
    },
    {
      label: "Résumés",
      value: stats.resumes,
      hint: `${stats.publicResumes} public`,
      link: linkOptions({
        to: "/admin/tables/$table",
        params: { table: "resume" },
        search: { page: 0 },
      }),
    },
    {
      label: "Jobs",
      value: stats.jobs,
      link: linkOptions({
        to: "/admin/tables/$table",
        params: { table: "job" },
        search: { page: 0 },
      }),
    },
    {
      label: "Events in log",
      value: stats.events,
      hint: `${stats.eventsLast24h} in last 24h`,
      link: linkOptions({
        to: "/admin/data",
        search: { tab: "events", sort: "seq-desc", page: 0 },
      }),
    },
    {
      label: "Awaiting projection",
      value: stats.unprojectedEvents,
      hint: "Events not yet applied to tables",
      warn: stats.unprojectedEvents > 0,
      link: linkOptions({
        to: "/admin/data",
        search: { tab: "events", applied: "no", sort: "seq-asc", page: 0 },
      }),
    },
    {
      label: "Active sessions",
      value: stats.activeSessions,
      link: linkOptions({
        to: "/admin/tables/$table",
        params: { table: "session" },
        search: { page: 0 },
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-test="admin-home">
      <AdminPageHeader title="Admin" description="Health of the remote database at a glance." />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-test="admin-stats">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            {...metric.link}
            className="group rounded-lg border border-base-300 bg-base-200 p-4 transition-colors hover:bg-base-300"
            data-test={`admin-stat-${metric.label}`}
          >
            <p className="flex items-center justify-between text-xs uppercase tracking-wide text-base-content/60">
              {metric.label}
              <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
            <p
              className={`mt-1 text-3xl font-semibold tabular-nums ${metric.warn ? "text-warning" : ""}`}
            >
              {metric.value.toLocaleString()}
            </p>
            {metric.hint ? (
              <p className="mt-1 text-xs text-base-content/60">{metric.hint}</p>
            ) : null}
          </Link>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.to} to={section.to} data-test={`admin-section-${section.title}`}>
            <Card className="h-full transition-colors hover:bg-base-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="size-4" />
                  {section.title}
                  <ArrowRight className="ml-auto size-4 text-base-content/50" />
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
