import { ArrowUpRight } from "lucide-react";

import { CASE_STUDIES } from "../-utils/content";
import { Section } from "./primitives";

export function ExpProof() {
  return (
    <Section id="proof" dataTest="exp-proof">
      <div className="grid grid-cols-1 border-b border-border/50 md:grid-cols-3">
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
