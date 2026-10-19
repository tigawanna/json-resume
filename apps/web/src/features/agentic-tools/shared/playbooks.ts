import {
  getPlaybookToolInputSchema,
  type GetPlaybookToolInput,
  type GetPlaybookToolOutput,
  type PlaybookName,
} from "../resume-tool-schemas";

type Playbook = { when: string; steps: string[] };

const PLAYBOOKS: Record<PlaybookName, Playbook> = {
  edit_resume: {
    when: "Any change request that does not ask for a new copy, version or variant.",
    steps: [
      "get_resume with only the sections you need, to get item and bullet ids.",
      "Change the active résumé with the granular tools: update_resume_details, set_summary, set_experience_bullets, set_skills, upsert_experience / upsert_project / upsert_education / upsert_talk, remove_from_resume, reorder_section, set_contacts, set_links, set_notes.",
      "An upsert with an id edits that library item on every résumé that shows it. To reword one résumé only, use set_experience_bullets or create a new item without an id.",
      "Each tool returns what it stored; do not re-read the résumé after every change, and never clone.",
      "Finish with wrap_up, listing the résumé as edited.",
    ],
  },
  pasted_job: {
    when: "The user's message contains a job posting.",
    steps: [
      "quote_pay_rate on the posting, then save_job with the full posting text, extracting company, title, location and url, and payRate set to the quote source unchanged. Do not calculate hourly pay. Do not pass attachToResumeId yet.",
      "If the active résumé has no job, or already targets this one: attach_job, then follow edit_resume on the active résumé.",
      "Otherwise, or when the user asks for a separate version: tailor_resume_for_job({ jobId }) (it picks the best base when baseResumeId is omitted), then follow edit_resume on the copy, which is now active.",
      "Use rank_library_for_job to pull in matching library items before writing new content.",
      "Finish with open_resume when the user should see a different résumé, then wrap_up with the base résumé as inspiration. Aim for 8 calls or fewer.",
    ],
  },
  tailored_copy: {
    when: "The user explicitly asks for a new copy, version or variant.",
    steps: [
      "With a job: tailor_resume_for_job({ jobId, baseResumeId: the active résumé }). Without one: clone_resume.",
      "The copy is active, so follow edit_resume on it.",
      "Finish with open_resume so the user sees the copy, then wrap_up: the copy as created, its source as inspiration.",
    ],
  },
  fill_from_library: {
    when: 'The user wants existing material on the résumé ("add my X project", "use the bullet about Y").',
    steps: [
      "rank_library_for_job when there is a target job, otherwise search_library for one section with a few distinctive words.",
      "attach_library_items with the ids you found. Bullets join their experience on the résumé.",
      "Optionally set_experience_bullets to order or trim the bullets an experience shows.",
      "Finish with wrap_up, listing the résumé as edited.",
    ],
  },
  import_resume: {
    when: "The user pastes a whole résumé to import.",
    steps: [
      "Parse it into a complete ResumeDocumentV1 without inventing anything.",
      "create_resume with the document; the new résumé becomes active.",
      "open_resume so the user sees it, then wrap_up with it as created.",
    ],
  },
  cover_letter: {
    when: "The user asks for a cover letter, or to revise one.",
    steps: [
      "get_resume for the résumé the letter goes with (the active one by default) with the header, summary, experience, projects and job sections.",
      "Without a target job, ask for the posting, or save_job when they pasted one. Use get_job for more posting detail.",
      "If the user referenced a cover letter, get_cover_letter it and take inspiration: keep the voice and the strongest stories, but swap in this company, this role and what this posting cares about, drop details that belonged to the old application, and reorder the story so it reads fresh.",
      "Ground every claim in the résumé. Write markdown: greeting, three or four short paragraphs, sign-off with the user's full name. No address block or date unless asked.",
      "save_cover_letter with the whole letter. To revise, pass coverLetterId and the whole new body.",
      "Reply with one or two lines about the angle you took; the chat already shows the letter. Use wrap_up only if you also changed a résumé.",
    ],
  },
  application_questions: {
    when: "The user pastes questions from a job application form (why this role, tell us about a time you...), or asks to revise those answers.",
    steps: [
      "get_resume for the active résumé with the header, summary, experience, projects and job sections. Without a target job, ask which job this is for, or save_job when they pasted the posting.",
      'Split the paste into separate questions, word for word. For each, search_application_answers with one or two topic words (e.g. "performance", "conflict", "why") to find stories the user already told; read any "Referenced application answers" with search_application_answers answerIds.',
      "Draft each answer as a starting point in the user's voice: reuse past stories and facts, adapted to this company and question, and the résumé. Never invent numbers, names or outcomes; put [[short hint]] where only the user knows the detail.",
      "Plain text, no markdown. Keep to any word limit in the question; otherwise 80 to 200 words.",
      "save_application_answers once with every question in form order. To revise, pass answerId with the whole new answer.",
      "Reply briefly: which answers reused a past story and which [[gaps]] the user should fill. The chat already shows the answers.",
    ],
  },
};

export function getPlaybook(input: GetPlaybookToolInput): GetPlaybookToolOutput {
  const { name } = getPlaybookToolInputSchema.parse(input);
  return { name, ...PLAYBOOKS[name] };
}
