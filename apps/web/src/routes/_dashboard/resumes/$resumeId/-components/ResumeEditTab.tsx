import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EducationSection } from "./resume-editor-forms/EducationSection";
import { ExperienceSection } from "./resume-editor-forms/ExperienceSection";
import { ProjectSection } from "./resume-editor-forms/ProjectSection";
import { ContactsForm } from "./resume-editor-forms/ContactsForm";
import { LinksForm } from "./resume-editor-forms/LinksForm";
import { MetadataForm } from "./resume-editor-forms/MetadataForm";
import { SkillsForm } from "./resume-editor-forms/SkillsForm";
import { SummaryForm } from "./resume-editor-forms/SummaryForm";
import { TalksSection } from "./resume-editor-forms/TalksSection";
import { useWorkbench } from "./workbench-store";

export function ResumeEditTab() {
  const resume = useWorkbench((s) => s.resume);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-test="resume-edit-tab">
      <MetadataForm resume={resume} />

      <Accordion
        type="multiple"
        defaultValue={["contacts", "summary", "experience"]}
        className="w-full"
      >
        <AccordionItem value="contacts">
          <AccordionTrigger>Contacts</AccordionTrigger>
          <AccordionContent>
            <ContactsForm resume={resume} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="links">
          <AccordionTrigger>Links</AccordionTrigger>
          <AccordionContent>
            <LinksForm />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="summary">
          <AccordionTrigger>Summary</AccordionTrigger>
          <AccordionContent>
            <SummaryForm resume={resume} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience">
          <AccordionTrigger>Experience</AccordionTrigger>
          <AccordionContent>
            <ExperienceSection resume={resume} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education">
          <AccordionTrigger>Education</AccordionTrigger>
          <AccordionContent>
            <EducationSection resume={resume} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="projects">
          <AccordionTrigger>Projects</AccordionTrigger>
          <AccordionContent>
            <ProjectSection resume={resume} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>Skills</AccordionTrigger>
          <AccordionContent>
            <SkillsForm resume={resume} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="talks">
          <AccordionTrigger>Talks</AccordionTrigger>
          <AccordionContent>
            <TalksSection resume={resume} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
