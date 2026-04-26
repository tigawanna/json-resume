import { FileJson, GitCompare, ShieldCheck } from "lucide-react";

const REASONS = [
  {
    icon: FileJson,
    title: "Structured, not freeform",
    description:
      "The LLM edits a compact schema you control — not five pages of prose. You review diffs in structure, not paragraphs.",
  },
  {
    icon: GitCompare,
    title: "Diff-friendly updates",
    description:
      "JSON changes are easy to compare. See exactly which bullet the model rewrote and which section it pruned, before you export.",
  },
  {
    icon: ShieldCheck,
    title: "You own the data",
    description:
      "Your résumé stays in your JSON file. Paste into any model, any time. No lock-in to a provider, no data left behind.",
  },
];

export function LandingShowcase() {
  return (
    <section
      id="features"
      data-test="landing-showcase"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50 py-24"
    >
      <div className="px-8 md:px-16">
        <div className="mb-16">
          <h2 className="text-3xl font-medium tracking-tight text-base-content md:text-4xl">
            Why JSON beats a pasted essay
          </h2>
          <p className="mt-4 max-w-[50ch] text-pretty text-muted-foreground">
            Pasting a full résumé into a doc often reads like raw model output. Here the model edits
            a compact schema you control.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          {REASONS.map((reason) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                className="group flex flex-col gap-4 bg-base-100 p-8 transition-colors hover:bg-neutral/50 lg:p-12"
              >
                <Icon className="size-6 text-primary transition-transform group-hover:scale-110" />
                <h3 className="text-lg font-medium tracking-tight text-base-content">
                  {reason.title}
                </h3>
                <p className="max-w-[35ch] text-sm leading-relaxed text-muted-foreground">
                  {reason.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
