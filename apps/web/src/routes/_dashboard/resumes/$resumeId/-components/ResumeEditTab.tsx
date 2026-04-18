import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactsForm } from "./ContactsForm";
import { EducationSection } from "./EducationSection";
import { ExperienceSection } from "./ExperienceSection";
import { LinksForm } from "./LinksForm";
import { MetadataForm } from "./MetadataForm";
import { ProjectSection } from "./ProjectSection";
import { SkillsForm } from "./SkillsForm";
import { SummaryForm } from "./SummaryForm";
import { TalksSection } from "./TalksSection";
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
            <LinksForm resume={resume} />
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
