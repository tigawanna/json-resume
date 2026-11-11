import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { FAQ_ITEMS } from "../-utils/content";
import { Section, SectionIntro } from "./primitives";

export function ExpFaq() {
  return (
    <Section id="faq" dataTest="exp-faq">
      <div className="grid grid-cols-1 gap-10 px-6 py-16 md:px-12 md:py-24 lg:grid-cols-12 lg:gap-0">
        <div className="lg:col-span-4 lg:pr-12">
          <SectionIntro
            eyebrow="FAQ"
            title={
              <>
                Questions, <span className="text-primary">answered.</span>
              </>
            }
          >
            <p>Everything about the schema, the agents, the export and the data.</p>
          </SectionIntro>
        </div>

        <div className="lg:col-span-8 lg:border-l lg:border-border/50 lg:pl-12">
          <Accordion type="single" collapsible className="border-t border-border/60">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.question} value={item.question} className="border-border/60">
                <AccordionTrigger className="font-serif text-base tracking-tight text-base-content hover:no-underline md:text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </Section>
  );
}
