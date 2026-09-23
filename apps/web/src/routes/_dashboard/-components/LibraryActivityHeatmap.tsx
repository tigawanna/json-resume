import { cell, colorGradientLegend, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { and, gte, lte, or, useLiveQuery } from "@tanstack/react-db";
import { useNavigate } from "@tanstack/react-router";
import { scaleBand, scaleSequential } from "d3-scale";
import { utcSunday } from "d3-time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAYS_PER_VIEW = 98;
const MS_PER_DAY = 86_400_000;

type ActivityDay = {
  date: Date;
  weekday: (typeof WEEKDAYS)[number];
  week: number;
  events: number;
};

type ResumeActivity = {
  createdAt: number;
  updatedAt: number;
};

function startOfUtcDay(ms: number) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function calendarWindow(now = Date.now()) {
  const endMs = startOfUtcDay(now);
  const windowStart = endMs - (DAYS_PER_VIEW - 1) * MS_PER_DAY;
  const aligned = new Date(windowStart);
  aligned.setUTCDate(aligned.getUTCDate() - aligned.getUTCDay());
  const startMs = aligned.getTime();
  return { startMs, endMs, endInclusiveMs: endMs + MS_PER_DAY - 1, calendarStart: new Date(startMs) };
}

/** One count per résumé per calendar day from createdAt and/or updatedAt. */
function buildActivityDays(
  resumes: readonly ResumeActivity[],
  window: ReturnType<typeof calendarWindow>,
): ActivityDay[] {
  const byDay = new Map<number, number>();
  for (const resume of resumes) {
    const days = new Set([startOfUtcDay(resume.createdAt), startOfUtcDay(resume.updatedAt)]);
    for (const day of days) {
      if (day < window.startMs || day > window.endMs) continue;
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
  }

  const rows: ActivityDay[] = [];
  for (let day = window.startMs; day <= window.endMs; day += MS_PER_DAY) {
    const date = new Date(day);
    rows.push({
      date,
      weekday: WEEKDAYS[date.getUTCDay()] ?? "Sun",
      week: utcSunday.count(window.calendarStart, date),
      events: byDay.get(day) ?? 0,
    });
  }
  return rows;
}

export function LibraryActivityHeatmap() {
  const db = useEventSourcedDb();
  const navigate = useNavigate();
  const window = calendarWindow();
  const { data: resumes } = useLiveQuery({
    query: (q) =>
      q
        .from({ resume: db.collections.resume })
        .where(({ resume }) =>
          or(
            and(gte(resume.createdAt, window.startMs), lte(resume.createdAt, window.endInclusiveMs)),
            and(gte(resume.updatedAt, window.startMs), lte(resume.updatedAt, window.endInclusiveMs)),
          ),
        )
        .select(({ resume }) => ({
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
        })),
  });
  const rows = buildActivityDays(resumes ?? [], window);
  const calendarStart = rows[0]?.date;

  const definition =
    calendarStart === undefined
      ? null
      : defineChart(
          {
            marks: [
              cell(rows, {
                x: (row) => utcSunday.count(calendarStart, row.date),
                y: (row) => row.weekday,
                color: "events",
                key: (row) => row.date.toISOString(),
                inset: 1,
                radius: 2,
              }),
            ],
            x: {
              scale: () => scaleBand<number>().paddingInner(0.06).paddingOuter(0.03),
              axis: {
                ticks: { format: (value) => `W${Number(value) + 1}` },
                label: "Week",
              },
            },
            y: {
              scale: scaleBand<string>()
                .domain([...WEEKDAYS])
                .paddingInner(0.06)
                .paddingOuter(0.03),
            },
            color: {
              scale: scaleSequential<string>,
              range: ["#173322", "#56bc7d"],
              legend: colorGradientLegend({ label: "Creates & updates", steps: 5 }),
            },
          },
          { keyboard: true, tooltip },
        );

  return (
    <section
      className="border-border bg-base-200/40 lg:sticky lg:top-20 min-w-0 rounded-xl border px-4 py-4"
      data-test="library-activity-heatmap"
    >
      <h2 className="text-sm font-medium tracking-tight">Activity</h2>
      <p className="text-muted-foreground mt-1 mb-3 text-xs text-pretty">
        Résumé creates and updates for the last fourteen weeks. Click a day to open résumés.
      </p>
      {definition ? (
        <Chart
          definition={definition}
          height={280}
          ariaLabel="Fourteen-week résumé update heatmap"
          className="text-base-content min-h-70 w-full"
          onSelect={(point) => {
            if (!point) return;
            void navigate({ to: "/resumes" });
          }}
        />
      ) : null}
    </section>
  );
}
