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
    ],
  },
  pasted_job: {
    when: "The user's message contains a job posting.",
    steps: [
      "save_job with the full posting text, extracting company, title, location and url. Do not pass attachToResumeId yet.",
      "If the active résumé has no job, or already targets this one: attach_job, then follow edit_resume on the active résumé.",
      "Otherwise, or when the user asks for a separate version: tailor_resume_for_job({ jobId }) (it picks the best base when baseResumeId is omitted), then follow edit_resume on the copy, which is now active.",
      "Use rank_library_for_job to pull in matching library items before writing new content.",
      "Finish with open_resume when the user should see a different résumé. Aim for 8 calls or fewer.",
    ],
  },
  tailored_copy: {
    when: "The user explicitly asks for a new copy, version or variant.",
    steps: [
      "With a job: tailor_resume_for_job({ jobId, baseResumeId: the active résumé }). Without one: clone_resume.",
      "The copy is active, so follow edit_resume on it.",
      "Finish with open_resume so the user sees the copy.",
    ],
  },
  fill_from_library: {
    when: 'The user wants existing material on the résumé ("add my X project", "use the bullet about Y").',
    steps: [
      "rank_library_for_job when there is a target job, otherwise search_library for one section with a few distinctive words.",
      "attach_library_items with the ids you found. Bullets join their experience on the résumé.",
      "Optionally set_experience_bullets to order or trim the bullets an experience shows.",
    ],
  },
  import_resume: {
    when: "The user pastes a whole résumé to import.",
    steps: [
      "Parse it into a complete ResumeDocumentV1 without inventing anything.",
      "create_resume with the document; the new résumé becomes active.",
      "open_resume so the user sees it.",
    ],
  },
};

export function getPlaybook(input: GetPlaybookToolInput): GetPlaybookToolOutput {
  const { name } = getPlaybookToolInputSchema.parse(input);
  return { name, ...PLAYBOOKS[name] };
}
