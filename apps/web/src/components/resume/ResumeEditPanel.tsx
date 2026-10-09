import { ContactsForm } from "@/components/resume/resume-editor-forms/ContactsForm";
import { EducationSection } from "@/components/resume/resume-editor-forms/EducationSection";
import { ExperienceSection } from "@/components/resume/resume-editor-forms/ExperienceSection";
import { LinksForm } from "@/components/resume/resume-editor-forms/LinksForm";
import { MetadataForm } from "@/components/resume/resume-editor-forms/MetadataForm";
import { ProjectSection } from "@/components/resume/resume-editor-forms/ProjectSection";
import { SkillsForm } from "@/components/resume/resume-editor-forms/SkillsForm";
import { NotesForm } from "@/components/resume/resume-editor-forms/NotesForm";
import { SummaryForm } from "@/components/resume/resume-editor-forms/SummaryForm";
import { TalksSection } from "@/components/resume/resume-editor-forms/TalksSection";
import { TargetJobSection } from "@/components/resume/resume-editor-forms/TargetJobSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const EDITOR_SECTIONS = [
  "details",
  "target-job",
  "contacts",
  "links",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "talks",
  "notes",
];

interface ResumeEditPanelProps {
  resumeId: string;
}

export function ResumeEditPanel({ resumeId }: ResumeEditPanelProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-test="resume-edit-tab">
      <Accordion type="multiple" defaultValue={EDITOR_SECTIONS} className="w-full">
        <AccordionItem value="details">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent>
            <MetadataForm />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="target-job" id="resume-section-target-job" className="scroll-mt-20">
          <AccordionTrigger>Target job</AccordionTrigger>
          <AccordionContent>
            <TargetJobSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="contacts">
          <AccordionTrigger>Contacts</AccordionTrigger>
          <AccordionContent>
            <ContactsForm />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="links">
          <AccordionTrigger>Links</AccordionTrigger>
          <AccordionContent>
            <LinksForm resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="summary">
          <AccordionTrigger>Summary</AccordionTrigger>
          <AccordionContent>
            <SummaryForm resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience">
          <AccordionTrigger>Experience</AccordionTrigger>
          <AccordionContent>
            <ExperienceSection resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education">
          <AccordionTrigger>Education</AccordionTrigger>
          <AccordionContent>
            <EducationSection resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="projects">
          <AccordionTrigger>Projects</AccordionTrigger>
          <AccordionContent>
            <ProjectSection resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>Skills</AccordionTrigger>
          <AccordionContent>
            <SkillsForm resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="talks">
          <AccordionTrigger>Talks</AccordionTrigger>
          <AccordionContent>
            <TalksSection resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notes">
          <AccordionTrigger>Notes / cover letter</AccordionTrigger>
          <AccordionContent>
            <NotesForm resumeId={resumeId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
