import { ArrowUpRight } from "lucide-react";

import { Branches } from "@/components/ui/hairline";

import { CASE_STUDIES } from "../-utils/content";
import { FigurePanel, Section, SectionIntro } from "./primitives";

export function ExpProof() {
  return (
    <Section id="proof" dataTest="exp-proof">
      <div className="grid grid-cols-1 items-center gap-10 px-6 py-16 md:px-12 md:py-24 lg:grid-cols-12 lg:gap-0">
        <div className="lg:col-span-5 lg:pr-12">
          <FigurePanel
            figure={Branches}
            label="A commit graph; the commit under the pointer rises and its history rises after it"
            captionLabel="fig. 09 — branches"
            intensity={0.65}
          />
        </div>
        <div className="lg:col-span-7">
          <SectionIntro
            eyebrow="Defining résumés since 2025"
            title={
              <>
                Structured résumés, <span className="text-primary">proven in production.</span>
              </>
            }
          >
            <p>
              A library is only useful if it survives real applications. These are the patterns that
              keep showing up.
            </p>
          </SectionIntro>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border/50 md:grid-cols-3">
        {CASE_STUDIES.map((study, index) => (
          <article
            key={study.title}
            className={
              "group flex flex-col justify-between gap-8 px-6 py-8 transition-colors hover:bg-primary/5 md:px-10 md:py-10 " +
              (index > 0 ? "border-t border-border/50 md:border-t-0 md:border-l" : "")
            }
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  {study.tag}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="mt-6 font-serif text-2xl leading-tight tracking-tight text-base-content">
                {study.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{study.body}</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Read the pattern
            </span>
          </article>
        ))}
      </div>
    </Section>
  );
}
