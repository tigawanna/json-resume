import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { RankedResume } from "../resume-tool-schemas";
import { parseTech } from "./resume-view";

const MAX_KEYWORDS = 40;
const MAX_MISSING = 15;

const STOPWORDS = new Set(
  (
    "a about above across after again all also am an and any are as at be been being both but by can " +
    "could did do does doing for from had has have having he her here hers him his how i if in into " +
    "is it its just me more most my no nor not now of off on once only or other our ours out over own " +
    "same she should so some such than that the their theirs them then there these they this those " +
    "through to too under until up very was we were what when where which while who whom why will " +
    "with would you your yours etc e.g i.e via per within without " +
    "ability able apply applicant applicants benefits candidate candidates company competitive " +
    "culture day days environment equal excellent experience experienced familiarity including " +
    "join ideal looking job knowledge must new nice opportunity plus position preferred required " +
    "requirements responsibilities role salary skills strong team teams work working year years"
  ).split(" "),
);

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#./-]*/g) ?? [])
    .map((raw) => raw.replace(/[./-]+$/, ""))
    .filter((term) => term.length > 0);
}

/** The job's most frequent meaningful terms, most frequent first. */
export function jobKeywords(job: { title?: string; description: string }): string[] {
  const counts = new Map<string, number>();
  const add = (term: string, weight: number) => counts.set(term, (counts.get(term) ?? 0) + weight);
  for (const term of tokens(job.title ?? "")) add(term, 3);
  for (const term of tokens(job.description)) add(term, 1);

  return [...counts.entries()]
    .filter(([term]) => term.length > 1 && !STOPWORDS.has(term) && !/^\d+$/.test(term))
    .sort(([termA, countA], [termB, countB]) => countB - countA || termA.localeCompare(termB))
    .slice(0, MAX_KEYWORDS)
    .map(([term]) => term);
}

/** Every term a résumé shows: headline, summary, experience, projects, skills, education, talks. */
function resumeTerms(detail: ResumeDetailDTO): Set<string> {
  const parts = [
    detail.headline,
    ...detail.summaries.map((summary) => summary.text),
    ...detail.experiences.flatMap((experience) => [
      experience.role,
      experience.company,
      ...experience.bullets.map((bullet) => bullet.text),
    ]),
    ...detail.projects.flatMap((project) => [
      project.name,
      project.description,
      ...parseTech(project.tech),
    ]),
    ...detail.skillGroups.flatMap((group) => [
      group.name,
      ...group.skills.map((skill) => skill.name),
    ]),
    ...detail.education.flatMap((item) => [item.degree, item.field, item.description]),
    ...detail.talks.flatMap((talk) => [talk.title, talk.description]),
  ];
  return new Set(tokens(parts.join(" ")));
}

export function scoreResume(keywords: ReadonlyArray<string>, detail: ResumeDetailDTO) {
  const terms = resumeTerms(detail);
  const matchedTerms = keywords.filter((keyword) => terms.has(keyword));
  const missingTerms = keywords.filter((keyword) => !terms.has(keyword)).slice(0, MAX_MISSING);
  const score = keywords.length
    ? Math.round((matchedTerms.length / keywords.length) * 100) / 100
    : 0;
  return { score, matchedTerms, missingTerms };
}

/** Best keyword coverage first; ties go to the most recently updated résumé. */
export function rankResumes(
  keywords: ReadonlyArray<string>,
  details: ReadonlyArray<ResumeDetailDTO>,
  limit: number,
): RankedResume[] {
  return details
    .map((detail) => ({
      updatedAt: detail.updatedAt,
      ranked: {
        resumeId: detail.id,
        name: detail.name,
        jobId: detail.jobId ?? null,
        ...scoreResume(keywords, detail),
      },
    }))
    .sort((a, b) => b.ranked.score - a.ranked.score || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
    .map(({ ranked }) => ranked);
}
