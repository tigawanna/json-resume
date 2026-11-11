import { COMPOSE_FEATURES } from "../-utils/content";
import { Section } from "./primitives";

export function ExpCompose() {
  return (
    <Section id="how" dataTest="exp-how">
      <div className="grid grid-cols-1 border-b border-border/50 md:grid-cols-3">
        {COMPOSE_FEATURES.map((feature, index) => (
          <article
            key={feature.title}
            className={
              "px-6 py-10 md:px-10 md:py-12 " +
              (index > 0 ? "border-t border-border/50 md:border-t-0 md:border-l" : "")
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                {feature.tag}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-6 font-serif text-2xl leading-tight tracking-tight text-base-content">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
