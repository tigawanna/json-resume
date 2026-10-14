import { emptyResumeLayout } from "@/features/resume/resume-layout";
import type { AppDb } from "../../collection";
import { persisted } from "./history";

export async function seedResume(
  db: AppDb,
  index: number,
  updates: number,
  links: {
    experienceId: string;
    bulletId: string;
    skillGroupId: string;
    skillId: string;
    educationId: string;
    projectId: string;
    talkId: string;
    contactId: string;
    linkId: string;
    summaryId: string;
    noteId: string;
    certificationId: string;
    volunteerId: string;
    languageId: string;
  },
) {
  const id = `resume-${index}`;
  const layout = emptyResumeLayout();
  layout.experiences = [{ id: links.experienceId, bullets: [links.bulletId] }];
  layout.skillGroups = [{ id: links.skillGroupId, skills: [links.skillId] }];
  layout.education = [links.educationId];
  layout.projects = [links.projectId];
  layout.talks = [links.talkId];
  layout.contacts = [links.contactId];
  layout.links = [links.linkId];
  layout.summaries = [links.summaryId];
  layout.notes = [links.noteId];
  layout.certifications = [links.certificationId];
  layout.volunteers = [links.volunteerId];
  layout.languages = [links.languageId];

  await persisted(
    db.collections.resume.insert({
      id,
      userId: "u1",
      name: `Resume ${index}`,
      fullName: "Ada",
      headline: "",
      description: "",
      jobId: null,
      templateId: "classic",
      layout,
      searchableText: "",
      embedding: null,
      embeddingModel: null,
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  for (let step = 1; step <= updates; step++) {
    await persisted(
      db.collections.resume.update(id, (draft) => {
        draft.headline = `Headline ${step}`;
        draft.updatedAt = step + 1;
      }),
    );
  }
  return id;
}
