import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import type { Job, JobStatus } from "@/data-access-layer/event-sourced/schemas";
import {
  getApplicationStatsToolInputSchema,
  getProfileOverviewToolInputSchema,
  type GetApplicationStatsToolInput,
  type GetApplicationStatsToolOutput,
  type GetProfileOverviewToolInput,
  type GetProfileOverviewToolOutput,
} from "@/features/agentic-tools/dashboard-tool-schemas";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";

const RECENT_JOBS = 8;
const MAX_HEADLINES = 10;
const SENT_STATUSES = new Set<JobStatus>(["applied", "interviewing", "offer", "rejected"]);
const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function wasSent(job: Job) {
  return job.appliedAt != null || SENT_STATUSES.has(job.status);
}

function ratio(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) / 100 : 0;
}

export function getLocalApplicationStats(
  ctx: Pick<LocalToolContext, "db">,
  input: GetApplicationStatsToolInput,
  now = Date.now(),
): GetApplicationStatsToolOutput {
  const data = getApplicationStatsToolInputSchema.parse(input);
  const jobs = ctx.db.collections.job.toArray;

  const byStatus = { saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, archived: 0 };
  for (const job of jobs) byStatus[job.status] += 1;

  const sent = jobs.filter(wasSent);
  const interviewed = sent.filter((job) => job.status === "interviewing" || job.status === "offer");
  const offers = sent.filter((job) => job.status === "offer");

  const today = new Date(now);
  const perMonth = Array.from({ length: data.months }, (_, index) => {
    const month = new Date(today.getFullYear(), today.getMonth() - (data.months - 1 - index), 1);
    return { month: monthKey(month), applied: 0, saved: 0 };
  });
  const byMonth = new Map(perMonth.map((row) => [row.month, row]));
  for (const job of jobs) {
    const savedRow = byMonth.get(monthKey(new Date(job.createdAt)));
    if (savedRow) savedRow.saved += 1;
    if (job.appliedAt != null) {
      const appliedRow = byMonth.get(monthKey(new Date(job.appliedAt)));
      if (appliedRow) appliedRow.applied += 1;
    }
  }

  const targeted = new Set(
    ctx.db.collections.resume.toArray.flatMap((resume) => (resume.jobId ? [resume.jobId] : [])),
  );

  return {
    today: dayKey(today),
    totalJobs: jobs.length,
    byStatus,
    applied: sent.length,
    interviewRate: ratio(interviewed.length, sent.length),
    offerRate: ratio(offers.length, sent.length),
    perMonth,
    jobsWithoutResume: jobs.filter((job) => !targeted.has(job.id)).length,
    recent: [...jobs]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RECENT_JOBS)
      .map((job) => ({
        jobId: job.id,
        label: jobListLabel(job),
        status: job.status,
        appliedAt: job.appliedAt != null ? new Date(job.appliedAt).toISOString() : null,
        updatedAt: new Date(job.updatedAt).toISOString(),
      })),
  };
}

/**
 * A free-form résumé date as a month index (year * 12 + month), or null.
 * Reads "2020", "2020-03", "03/2020" and "Mar 2020".
 */
export function parseResumeMonth(value: string): number | null {
  const text = value.trim().toLowerCase();
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (!year) return null;
  const numericMonth =
    text.match(/\b(19|20)\d{2}[-/.](\d{1,2})\b/)?.[2] ??
    text.match(/\b(\d{1,2})[-/.](19|20)\d{2}\b/)?.[1];
  const namedMonth = MONTH_NAMES.findIndex((name) => text.includes(name));
  const month = numericMonth
    ? Math.min(Math.max(Number(numericMonth), 1), 12) - 1
    : namedMonth >= 0
      ? namedMonth
      : 0;
  return Number(year[0]) * 12 + month;
}

function isCurrent(endDate: string) {
  return !endDate.trim() || /present|current|now|today/i.test(endDate);
}

/** Years covered by the given date ranges, overlaps merged, to one decimal. */
export function yearsCovered(
  ranges: ReadonlyArray<{ startDate: string; endDate: string }>,
  now = Date.now(),
): number | null {
  const today = new Date(now);
  const nowMonth = today.getFullYear() * 12 + today.getMonth();
  const spans = ranges
    .flatMap(({ startDate, endDate }) => {
      const start = parseResumeMonth(startDate);
      const end = isCurrent(endDate) ? nowMonth : parseResumeMonth(endDate);
      return start === null || end === null || end < start ? [] : [{ start, end: end + 1 }];
    })
    .sort((a, b) => a.start - b.start);
  const [first, ...rest] = spans;
  if (!first) return null;

  let months = 0;
  let current = first;
  for (const span of rest) {
    if (span.start <= current.end) {
      current = { start: current.start, end: Math.max(current.end, span.end) };
      continue;
    }
    months += current.end - current.start;
    current = span;
  }
  months += current.end - current.start;
  return Math.round((months / 12) * 10) / 10;
}

function parseTech(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim() !== "")
      : [];
  } catch {
    return [];
  }
}

/** Counts names case-insensitively, keeping the first spelling seen. Most used first. */
function tally(names: Iterable<string>, limit: number) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { name, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getLocalProfileOverview(
  ctx: Pick<LocalToolContext, "db">,
  input: GetProfileOverviewToolInput,
  now = Date.now(),
): GetProfileOverviewToolOutput {
  const data = getProfileOverviewToolInputSchema.parse(input);
  const { collections } = ctx.db;
  const resumes = [...collections.resume.toArray].sort((a, b) => b.updatedAt - a.updatedAt);
  const experiences = collections.resumeExperience.toArray;
  const projects = collections.resumeProject.toArray;
  const skillNames = new Map(
    collections.resumeSkill.toArray.map((skill) => [skill.id, skill.name]),
  );

  const skillUses = resumes.flatMap((resume) => {
    const ids = new Set((resume.layout?.skillGroups ?? []).flatMap((group) => group.skills));
    return [...ids].flatMap((id) => {
      const name = skillNames.get(id);
      return name ? [name] : [];
    });
  });

  return {
    counts: {
      resumes: resumes.length,
      experiences: experiences.length,
      projects: projects.length,
      education: collections.resumeEducation.toArray.length,
      skills: skillNames.size,
      certifications: collections.resumeCertification.toArray.length,
      talks: collections.resumeTalk.toArray.length,
      jobs: collections.job.toArray.length,
      coverLetters: collections.coverLetter.toArray.length,
      applicationAnswers: collections.applicationAnswer.toArray.length,
    },
    yearsOfExperience: yearsCovered(experiences, now),
    experiences: [...experiences]
      .sort(
        (a, b) =>
          (parseResumeMonth(b.startDate) ?? -1) - (parseResumeMonth(a.startDate) ?? -1) ||
          a.sortOrder - b.sortOrder,
      )
      .slice(0, data.limit)
      .map(({ company, role, startDate, endDate }) => ({ company, role, startDate, endDate })),
    headlines: [...new Set(resumes.map((resume) => resume.headline.trim()).filter(Boolean))].slice(
      0,
      MAX_HEADLINES,
    ),
    topSkills: tally(skillUses, data.limit),
    topTechnologies: tally(
      projects.flatMap((project) => parseTech(project.tech)),
      data.limit,
    ),
    education: collections.resumeEducation.toArray
      .slice(0, data.limit)
      .map(({ school, degree, field, endDate }) => ({ school, degree, field, endDate })),
  };
}
