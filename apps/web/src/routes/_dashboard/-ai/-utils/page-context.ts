import type { PageToolPack } from "@/features/agentic-tools/definitions/tool-context";
import type { QueryCollection } from "@/features/agentic-tools/assistant-data-tool-schemas";

export type PageSuggestion = { label: string; prompt: string; send: boolean };

export type PageContext = {
  routeId: string;
  label: string;
  summary: string;
  instructions: string;
  suggestions: PageSuggestion[];
  toolPack: PageToolPack;
  focus: { param?: string; collection?: QueryCollection };
};

const LIBRARY_SUGGESTIONS: PageSuggestion[] = [
  {
    label: "Summarize what I have here",
    prompt: "Summarize the rows on this page. Use query_collection and stick to what it returns.",
    send: true,
  },
  {
    label: "Find weak or duplicate entries",
    prompt:
      "Look through the rows on this page and point out weak or duplicate entries. Use query_collection before you name any of them.",
    send: true,
  },
];

const JOB_INSTRUCTIONS = [
  "When the user brings a job posting or asks for a résumé for a job:",
  "1. Save the posting with save_job (pass the full posting text; fill company and title when the posting states them). Do not pass attachToResumeId.",
  "2. Call rank_resumes_for_job with the job id. When the top candidates are close, read them with get_resume (only the header, summary, experience and skills sections) to judge the fit.",
  '3. Decide. Use mode "reuse" only when one résumé already fits the job almost as it is: a high score, few or minor missing terms, and it targets no other job (or this one). Otherwise use mode "copy" from the best starting point, so their other applications stay untouched.',
  "4. Call start_resume_for_job once. The user approves or denies it on a card, so give a short, specific reason and a suggestedPrompt that tells the editor's assistant what to tailor first.",
  "5. After an approval, reply with one short sentence. The app opens the résumé and the editor's assistant takes over. After a denial, ask what they would prefer and do not call it again unless they ask.",
  "If the user has no résumés, say so. Do not call start_resume_for_job.",
  "If the user only pastes a posting without asking for anything, ask whether they want a résumé for it before saving anything.",
].join("\n");

const EXPERIENCE_INSTRUCTIONS = [
  "You are editing ONE company and period, which can hold several titles for the same dates.",
  "The snapshot below is the ground truth for ids. Never invent companies, titles, dates, metrics, or bullet ids.",
  "The company name and the dates are immutable. Only titles and bullets are editable, and only inside this group.",
  "Condensing: pick the title that best represents the period as the canonical set, rewrite its bullets until each one is specific and complete, then reuse that set for the other titles with set_experience_title_bullets.",
  "Trim instead of scatter: drop vague or repetitive standalone bullets, but merge their unique facts into a stronger bullet first. Prefer six or fewer bullets per title.",
  "Reuse beats duplication. Rewrite with update_experience_bullet, reassign with move_experience_bullet, remove with delete_experience_bullet.",
  "If a tool result disagrees with the snapshot, trust the tool.",
].join("\n");

const NONE_INSTRUCTIONS =
  "This page has no data tools. Answer from the conversation and from search_conversations. Do not offer to edit rows.";

function page(entry: PageContext): PageContext {
  return entry;
}

export const PAGE_CONTEXTS: Record<string, PageContext> = {
  "/_dashboard/dashboard": page({
    routeId: "/_dashboard/dashboard",
    label: "Dashboard",
    summary:
      "Paste a job description and the assistant picks a résumé, copies it, and opens the editor.",
    instructions: [
      JOB_INSTRUCTIONS,
      "On this page a pasted job description is enough. Do not ask for confirmation before saving it.",
      'Always start with mode "copy": clone the best résumé, pass a name that matches the job (role and company), and let the tool attach the posting to the copy.',
      "The tool opens that copy on its AI tab and hands the editor the job plus your suggestedPrompt. Do not navigate yourself.",
    ].join("\n"),
    suggestions: [
      {
        label: "Paste a job and pick a résumé",
        prompt: "Find the best résumé to start from for this job:\n\n",
        send: false,
      },
    ],
    toolPack: "resume-list",
    focus: {},
  }),
  "/_dashboard/resumes/": page({
    routeId: "/_dashboard/resumes/",
    label: "Résumés",
    summary:
      "Your résumés. Compare them, or start one for a job. The editor is where a document changes.",
    instructions: JOB_INSTRUCTIONS,
    suggestions: [
      {
        label: "Which résumé fits a job I paste",
        prompt: "Find the best résumé to start from for this job:\n\n",
        send: false,
      },
      {
        label: "Compare my recent résumés",
        prompt: "Give me an overview of my résumés: what each one targets and how they differ.",
        send: true,
      },
    ],
    toolPack: "resume-list",
    focus: {},
  }),
  "/_dashboard/public-resumes/": page({
    routeId: "/_dashboard/public-resumes/",
    label: "Public résumés",
    summary: "Résumés you have published.",
    instructions: "",
    suggestions: LIBRARY_SUGGESTIONS,
    toolPack: "resume-list",
    focus: {},
  }),
  "/_dashboard/jobs/": page({
    routeId: "/_dashboard/jobs/",
    label: "Jobs",
    summary: "The job tracker list.",
    instructions: JOB_INSTRUCTIONS,
    suggestions: [
      { label: "How is the search going", prompt: "How is my job search going?", send: true },
      {
        label: "Which applications are stuck",
        prompt: "Which applications look stuck, and what should I do next?",
        send: true,
      },
    ],
    toolPack: "job",
    focus: {},
  }),
  "/_dashboard/jobs/$jobId/": page({
    routeId: "/_dashboard/jobs/$jobId/",
    label: "Job",
    summary: "One job posting is open.",
    instructions: JOB_INSTRUCTIONS,
    suggestions: [
      { label: "Summarize this posting", prompt: "Summarize this job posting.", send: true },
      {
        label: "Find a résumé for this job",
        prompt: "Find the best résumé to start from for this job.",
        send: true,
      },
      {
        label: "Draft what to tailor",
        prompt: "What should the editor change first to fit this job?",
        send: true,
      },
    ],
    toolPack: "job",
    focus: { param: "jobId", collection: "job" },
  }),
  "/_dashboard/experiences/": page({
    routeId: "/_dashboard/experiences/",
    label: "Experience",
    summary: "The work-experience list, grouped by company and dates.",
    instructions: "",
    suggestions: LIBRARY_SUGGESTIONS,
    toolPack: "library",
    focus: {},
  }),
  "/_dashboard/experiences/$experienceId/": page({
    routeId: "/_dashboard/experiences/$experienceId/",
    label: "Experience",
    summary: "One company and period is open. Edit titles and bullets only inside that group.",
    instructions: EXPERIENCE_INSTRUCTIONS,
    suggestions: [
      {
        label: "Condense all titles",
        prompt:
          "Condense the bullets for this company and period. Pick the title that best represents the period as the canonical set, make its bullets complete and well formatted, then reuse those bullets for the other titles. Trim duplicates and weak standalone bullets, but merge their unique facts into stronger bullets so nothing is lost.",
        send: true,
      },
      {
        label: "Trim weak bullets",
        prompt:
          "Review every bullet in this period and trim the ones that are vague, repetitive, or too weak to stand alone. Merge their unique facts into stronger bullets instead of losing them, and keep each title to six bullets or fewer.",
        send: true,
      },
      {
        label: "Merge duplicates",
        prompt:
          "Find bullets across these titles that say the same thing in different words. Rewrite the best version once and reuse it everywhere it honestly applies, deleting the weaker duplicates.",
        send: true,
      },
    ],
    toolPack: "experience",
    focus: { param: "experienceId", collection: "resumeExperience" },
  }),
  "/_dashboard/cover-letters/": page({
    routeId: "/_dashboard/cover-letters/",
    label: "Cover letters",
    summary: "The cover letter list.",
    instructions: "",
    suggestions: LIBRARY_SUGGESTIONS,
    toolPack: "library",
    focus: {},
  }),
  "/_dashboard/cover-letters/$coverLetterId/": page({
    routeId: "/_dashboard/cover-letters/$coverLetterId/",
    label: "Cover letter",
    summary: "One cover letter is open.",
    instructions:
      "Read it with get_cover_letter and its job with get_job before you rewrite it. Save edits with mutate_collection on coverLetter. Do not invent the posting.",
    suggestions: [
      {
        label: "Tighten this letter",
        prompt: "Tighten this cover letter without adding facts I did not write.",
        send: true,
      },
      { label: "Match it to the job", prompt: "Match this cover letter to its job.", send: true },
    ],
    toolPack: "cover-letter",
    focus: { param: "coverLetterId", collection: "coverLetter" },
  }),
  "/_dashboard/assistant-skills/": page({
    routeId: "/_dashboard/assistant-skills/",
    label: "Assistant skills",
    summary: "Instructions the assistants follow.",
    instructions: "",
    suggestions: LIBRARY_SUGGESTIONS,
    toolPack: "library",
    focus: {},
  }),
  "/_dashboard/assistant-skills/$skillId/": page({
    routeId: "/_dashboard/assistant-skills/$skillId/",
    label: "Assistant skill",
    summary: "One assistant skill is open.",
    instructions: "",
    suggestions: [
      { label: "Explain this skill", prompt: "Explain this skill in plain language.", send: true },
      {
        label: "Find where it would change a bullet",
        prompt: "Where would this skill change a bullet I already wrote?",
        send: true,
      },
    ],
    toolPack: "library",
    focus: { param: "skillId", collection: "assistantSkill" },
  }),
  "/_dashboard/notes/": libraryPage("/_dashboard/notes/", "Notes", "resumeNote"),
  "/_dashboard/languages/": libraryPage("/_dashboard/languages/", "Languages", "resumeLanguage"),
  "/_dashboard/certifications/": libraryPage(
    "/_dashboard/certifications/",
    "Certifications",
    "resumeCertification",
  ),
  "/_dashboard/volunteers/": libraryPage(
    "/_dashboard/volunteers/",
    "Volunteering",
    "resumeVolunteer",
  ),
  "/_dashboard/education/": libraryPage("/_dashboard/education/", "Education", "resumeEducation"),
  "/_dashboard/talks/": libraryPage("/_dashboard/talks/", "Talks", "resumeTalk"),
  "/_dashboard/projects/": libraryPage("/_dashboard/projects/", "Projects", "resumeProject"),
  "/_dashboard/resume-projects/": libraryPage(
    "/_dashboard/resume-projects/",
    "Projects",
    "resumeProject",
  ),
  "/_dashboard/saved-projects/": libraryPage(
    "/_dashboard/saved-projects/",
    "Saved projects",
    "savedProject",
  ),
  "/_dashboard/summaries/": libraryPage("/_dashboard/summaries/", "Summaries", "resumeSummary"),
  "/_dashboard/skill-groups/": libraryPage(
    "/_dashboard/skill-groups/",
    "Skills",
    "resumeSkillGroup",
  ),
  "/_dashboard/contacts/": libraryPage("/_dashboard/contacts/", "Contacts", "resumeContact"),
  "/_dashboard/links/": libraryPage("/_dashboard/links/", "Links", "resumeLink"),
  "/_dashboard/application-answers/": libraryPage(
    "/_dashboard/application-answers/",
    "Application answers",
    "applicationAnswer",
  ),
  "/_dashboard/repos/": libraryPage("/_dashboard/repos/", "Repositories", "savedProject"),
  "/_dashboard/settings/": nonePage("/_dashboard/settings/", "Settings"),
  "/_dashboard/profile/": nonePage("/_dashboard/profile/", "Profile"),
  "/_dashboard/events/": nonePage("/_dashboard/events/", "Events"),
  "/_dashboard/admin/": nonePage("/_dashboard/admin/", "Admin"),
  "/_dashboard/admin/users/": nonePage("/_dashboard/admin/users/", "Admin users"),
  "/_dashboard/admin/users/$userId/": nonePage(
    "/_dashboard/admin/users/$userId/",
    "Admin user credits",
  ),
  "/_dashboard/admin/waitlist/": nonePage("/_dashboard/admin/waitlist/", "Admin waitlist"),
  "/_dashboard/credits/": nonePage("/_dashboard/credits/", "Résumé credits"),
  "/_dashboard/admin/tables/": nonePage("/_dashboard/admin/tables/", "Admin tables"),
  "/_dashboard/admin/data/": nonePage("/_dashboard/admin/data/", "Admin data"),
  "/_dashboard/admin/tables/$table/": nonePage("/_dashboard/admin/tables/$table/", "Admin table"),
  "/_dashboard/dev/": nonePage("/_dashboard/dev/", "Dev"),
  "/_dashboard/dev/chat-lab/": nonePage("/_dashboard/dev/chat-lab/", "Chat lab"),
  "/_dashboard/dev/chat-stress/": nonePage("/_dashboard/dev/chat-stress/", "Chat stress"),
  "/_dashboard/dev/placeholders/": nonePage("/_dashboard/dev/placeholders/", "Placeholders"),
  "/_dashboard/resumes/$resumeId/": nonePage("/_dashboard/resumes/$resumeId/", "Résumé editor"),
  "/_dashboard/resumes/$resumeId/events/": nonePage(
    "/_dashboard/resumes/$resumeId/events/",
    "Résumé events",
  ),
};

function libraryPage(routeId: string, label: string, collection: QueryCollection): PageContext {
  return {
    routeId,
    label,
    summary: `What you have saved in ${label.toLowerCase()}.`,
    instructions: `Read and edit these rows with query_collection and mutate_collection on ${collection}.`,
    suggestions: LIBRARY_SUGGESTIONS,
    toolPack: "library",
    focus: {},
  };
}

function nonePage(routeId: string, label: string): PageContext {
  return {
    routeId,
    label,
    summary: "Ask about this page. Library edits happen on the library pages.",
    instructions: NONE_INSTRUCTIONS,
    suggestions: [],
    toolPack: "none",
    focus: {},
  };
}

export function resolvePageContext(routeId: string): PageContext {
  return (
    PAGE_CONTEXTS[routeId] ?? {
      routeId,
      label: routeId.split("/").filter(Boolean).at(-1) ?? "Page",
      summary: "A page without a specific assistant setup.",
      instructions: "",
      suggestions: [],
      toolPack: "library",
      focus: {},
    }
  );
}

export function assistantHidden(pathname: string) {
  return /^\/resumes\/[^/]+/.test(pathname) || pathname === "/dev" || pathname.startsWith("/dev/");
}

export function pageHeader(label: string, focusTitle: string | null) {
  return focusTitle ? `${label} · ${focusTitle}` : label;
}
