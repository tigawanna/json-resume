import { METRICS } from "./content";
import { Section } from "./primitives";

export function LandingIntelligence() {
  return (
    <Section id="insight" tone="primary" dataTest="landing-insight">
      <dl className="grid grid-cols-2 gap-px border-y border-border/50 bg-border/50 md:grid-cols-4">
        {METRICS.map((metric) => (
          <div key={metric.label} className="bg-base-100 px-6 py-8 md:px-10">
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <span className="block font-serif text-3xl leading-none tracking-tight text-base-content">
                {metric.value}
              </span>
              <span className="mt-2 block text-[11px] leading-snug text-muted-foreground">
                {metric.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
