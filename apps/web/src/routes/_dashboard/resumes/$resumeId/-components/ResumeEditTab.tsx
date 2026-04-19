import { ContactsForm } from "@/components/resume/resume-editor-forms/ContactsForm";
import { EducationSection } from "@/components/resume/resume-editor-forms/EducationSection";
import { ExperienceSection } from "@/components/resume/resume-editor-forms/ExperienceSection";
import { LinksForm } from "@/components/resume/resume-editor-forms/LinksForm";
import { MetadataForm } from "@/components/resume/resume-editor-forms/MetadataForm";
import { ProjectSection } from "@/components/resume/resume-editor-forms/ProjectSection";
import { SkillsForm } from "@/components/resume/resume-editor-forms/SkillsForm";
import { SummaryForm } from "@/components/resume/resume-editor-forms/SummaryForm";
import { TalksSection } from "@/components/resume/resume-editor-forms/TalksSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ResumeEditTabProps {
  resumeId: string;
}

export function ResumeEditTab({ resumeId }: ResumeEditTabProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-test="resume-edit-tab">
      <MetadataForm resumeId={resumeId} />

      <Accordion
        type="multiple"
        defaultValue={["contacts", "summary", "experience"]}
        className="w-full">
        <AccordionItem value="contacts">
          <AccordionTrigger>Contacts</AccordionTrigger>
          <AccordionContent>
            <ContactsForm resumeId={resumeId} />
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
      </Accordion>
    </div>
  );
}
