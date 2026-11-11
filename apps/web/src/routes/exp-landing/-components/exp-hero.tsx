import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Terrain } from "@/components/ui/hairline";

import { STATS } from "../-utils/content";
import { FigurePanel, Section } from "./primitives";

export function ExpHero() {
  return (
    <Section className="relative overflow-hidden" dataTest="exp-hero">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center gap-8 px-6 pt-16 pb-12 md:px-12 md:pt-24 lg:col-span-6 lg:border-r lg:border-border/50 lg:py-28 lg:pr-16">
          <div className="flex items-start gap-3">
            <span className="mt-1 size-2 shrink-0 bg-primary" aria-hidden />
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
              Open source · Structured résumés
            </p>
          </div>

          <h1 className="max-w-[15ch] text-balance font-serif text-5xl leading-[0.98] font-medium tracking-tight text-base-content md:text-6xl lg:text-7xl">
            The résumé is the sum of its parts. <span className="text-primary">Sorted.</span>
          </h1>

          <p className="max-w-[46ch] text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Store every experience, bullet and skill as JSON. Tailor a variation to the job with any
            LLM, then export a clean PDF — no pasting prose back into a doc.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2 bg-primary px-6 py-3 font-mono text-sm font-medium text-primary-content transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Open the editor
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="border border-border/60 px-6 py-3 font-mono text-sm text-base-content transition-colors hover:border-primary/40 hover:text-primary"
            >
              See how it works
            </a>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground">
            JSON Resume schema · MIT licensed · No account required
          </p>
        </div>

        <div className="relative flex items-center px-4 py-10 md:px-10 lg:col-span-6 lg:py-16">
          <div className="relative w-full">
            <div
              aria-hidden
              className="absolute -top-3 -left-3 hidden h-6 w-6 border-t border-l border-primary/50 md:block"
            />
            <div
              aria-hidden
              className="absolute -right-3 -bottom-3 hidden h-6 w-6 border-r border-b border-primary/50 md:block"
            />
            <FigurePanel
              figure={Terrain}
              label="Eighty-one pillars rising around the pointer, one per résumé part"
              captionLabel="fig. 01 — terrain"
              intensity={0.7}
            />
            <div className="absolute top-3 right-3 hidden items-center gap-2 border border-border/60 bg-base-100/90 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur-sm md:flex">
              <span className="size-1.5 bg-primary" aria-hidden />
              catalog → production
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border/50 md:grid-cols-5">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className={
              "px-5 py-5 md:px-6 " +
              (index > 0 ? "border-l border-border/50 " : "") +
              (index >= 2 ? "border-t border-border/50 md:border-t-0 " : "")
            }
          >
            <p className="font-mono text-xs font-medium tracking-tight text-base-content">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
