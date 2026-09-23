const LINKS = [
  {
    kind: "Experience",
    title: "Ledger team",
    note: "Staff engineer, payments",
  },
  {
    kind: "Project",
    title: "Reconciliation job",
    note: "Shipped from that role",
  },
  {
    kind: "Talk",
    title: "Month-end close",
    note: "Given about that project",
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="parts"
      data-test="landing-pipeline"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="px-6 py-20 md:px-16 md:py-28">
        <h2 className="max-w-[18ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          The pieces point at each other.
        </h2>
        <p className="mt-6 max-w-[62ch] text-pretty text-base leading-relaxed text-muted-foreground">
          An experience can name the project that came out of it. The project can name the talk you
          gave about the work. Education, skills, certifications, summaries, and notes live in the
          same library, each as its own record. A later résumé pulls a subset. The records you
          leave out stay where they are, ready for a different role.
        </p>

        <ol className="mt-12 border border-border">
          {LINKS.map((link) => (
            <li
              key={link.kind}
              className="grid grid-cols-1 gap-2 border-b border-border px-5 py-5 last:border-b-0 sm:grid-cols-[8rem_1fr_auto] sm:items-baseline sm:gap-6"
            >
              <div className="font-mono text-xs text-primary">{link.kind}</div>
              <div className="text-lg font-medium tracking-tight text-base-content">{link.title}</div>
              <p className="text-sm text-muted-foreground sm:text-right">{link.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
