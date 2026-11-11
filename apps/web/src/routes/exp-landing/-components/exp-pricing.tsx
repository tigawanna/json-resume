import { Check } from "lucide-react";

import { Stack } from "@/components/ui/hairline";

import { PRICING_TIERS } from "../-utils/content";
import { FigurePanel, Section, SectionIntro } from "./primitives";

export function ExpPricing() {
  return (
    <Section id="pricing" tone="primary" dataTest="exp-pricing">
      <div className="flex flex-col gap-10 px-6 py-16 md:px-12 md:py-20 lg:flex-row lg:items-end lg:justify-between">
        <SectionIntro
          title={
            <>
              Free to start. <span className="text-primary">Open source at the core.</span>
            </>
          }
        >
          <p>
            Run it yourself for nothing. Pro is a waitlist, not a price, and team features come
            later.
          </p>
        </SectionIntro>
        <div className="hidden w-64 shrink-0 lg:block">
          <FigurePanel
            figure={Stack}
            label="A call stack of five frames; the pointer picks one and the frames above lift"
            captionLabel="fig. 10 — stack"
            intensity={0.65}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border/50 md:grid-cols-3">
        {PRICING_TIERS.map((tier, index) => (
          <div
            key={tier.name}
            className={
              "relative flex flex-col gap-6 px-6 py-8 md:px-10 md:py-10 " +
              (index > 0 ? "border-t border-border/50 md:border-t-0 md:border-l" : "") +
              (tier.featured ? " bg-base-100" : "")
            }
          >
            {tier.featured ? (
              <span className="absolute top-0 right-0 bg-primary px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-content">
                Popular
              </span>
            ) : null}
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                {tier.name}
              </p>
              <p className="mt-3 font-serif text-3xl tracking-tight text-base-content">
                {tier.price}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{tier.note}</p>
            </div>
            <ul className="flex-1 space-y-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-base-content">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href={tier.name === "Local" ? "#editor" : "#faq"}
              className={
                "px-4 py-2.5 text-center font-mono text-xs transition-colors " +
                (tier.featured
                  ? "bg-primary text-primary-content hover:opacity-90"
                  : "border border-border/60 text-base-content hover:border-primary/40 hover:text-primary")
              }
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>
    </Section>
  );
}
