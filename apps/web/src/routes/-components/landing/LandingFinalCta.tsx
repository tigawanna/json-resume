import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Riffle } from "@/components/ui/hairline";

import { FigurePanel, Section } from "./primitives";

export function LandingFinalCta() {
  return (
    <Section tone="primary" dataTest="landing-final-cta">
      <div className="grid grid-cols-1 items-center gap-10 px-6 py-16 md:px-12 md:py-24 lg:grid-cols-12 lg:gap-0">
        <div className="lg:col-span-7 lg:pr-12">
          <h2 className="mt-4 max-w-[18ch] text-balance font-serif text-4xl leading-[0.98] font-medium tracking-tight text-base-content md:text-5xl lg:text-6xl">
            Your résumé. <span className="text-primary">Sorted.</span>
          </h2>
          <p className="mt-5 max-w-[42ch] text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Start with a free workspace, explore the library, or read the docs and run it yourself.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2 bg-primary px-6 py-3 font-mono text-sm font-medium text-primary-content transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Open the editor
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#pricing"
              className="border border-border/60 px-6 py-3 font-mono text-sm text-base-content transition-colors hover:border-primary/40 hover:text-primary"
            >
              See pricing
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          <FigurePanel
            figure={Riffle}
            label="A tray of eight cards; the card under the pointer stands up"
            captionLabel="fig. 11 — riffle"
            intensity={0.7}
          />
        </div>
      </div>
    </Section>
  );
}
