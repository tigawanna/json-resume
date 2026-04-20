const steps = [
  {
    id: "01",
    label: "DATA LAYER",
    title: "Strict JSON Schema",
    description:
      "Your résumé lives as structured JSON validated by Zod. The editor and PDF renderer are views on the same data — edits stay consistent across every output.",
    hoverClass: "group-hover:text-primary",
  },
  {
    id: "02",
    label: "LOGIC LAYER",
    title: "Tailor via Any LLM",
    description:
      "Copy your JSON into ChatGPT or any assistant alongside a job description. Paste the revised JSON back. You keep full control — no vendor lock-in.",
    hoverClass: "group-hover:text-info",
  },
  {
    id: "03",
    label: "PRESENTATION",
    title: "Print-Ready PDF Export",
    description:
      "React components turn the same JSON into on-screen preview and a millimetre-precise PDF. Pick from multiple templates. No manual reformatting.",
    hoverClass: "group-hover:text-base-content",
  },
];

const terminalLines = [
  { prefix: "~/resume", text: " > agentic build ./resume.json --target=staff-eng.md" },
  { status: "ok", text: "Parsing source JSON…" },
  { status: "ok", text: "Connecting to inference node…" },
  { status: "info", text: "Pruning irrelevant sections… Removed 4 entries" },
  { status: "ok", text: "Re-ranking bullets based on job context…" },
  { status: "ok", text: "Rendering PDF template: classic…" },
];

export function LandingFeatures() {
  return (
    <section
      id="pipeline"
      data-test="landing-pipeline"
      className="mx-auto max-w-360 border-x border-border/50 scroll-mt-14 pb-24">
      <div className="px-8 pt-24 pb-12 md:px-16">
        <h2 className="text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          Deployment Pipeline
        </h2>
        <p className="mt-4 max-w-[50ch] text-pretty text-muted-foreground">
          The build process for your professional narrative. No WYSIWYG editors. No misaligned text
          boxes. Pure structured data compiled to print-ready output.
        </p>
      </div>

      <div className="mx-8 overflow-hidden border border-border md:mx-16">
        {/* 3 steps */}
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-y-0 md:divide-x">
          {steps.map((step) => (
            <div
              key={step.id}
              className="group relative p-8 transition-colors hover:bg-neutral/50 lg:p-12">
              <div className="absolute top-4 right-4 font-mono text-xs text-base-content/20 transition-colors group-hover:text-base-content/40">
                +
              </div>
              <div
                className={`mb-10 font-mono text-4xl font-light tabular-nums text-base-content/30 transition-colors ${step.hoverClass}`}>
                {step.id}.
              </div>
              <h3 className="mb-4 text-balance text-xl font-medium tracking-tight text-base-content md:text-2xl">
                {step.title}
              </h3>
              <p className="max-w-[35ch] text-pretty text-sm font-light leading-relaxed text-muted-foreground md:text-base">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Terminal output */}
        <div className="border-t border-border bg-base-200 p-6 font-mono text-xs leading-loose text-muted-foreground">
          {terminalLines.map((line, i) =>
            line.prefix ? (
              <div key={i}>
                <span className="text-base-content/50">{line.prefix}</span>
                {line.text}
              </div>
            ) : (
              <div key={i}>
                [INFO] {line.text}{" "}
                {line.status === "ok" && <span className="text-primary">OK</span>}
              </div>
            ),
          )}
          <div className="mt-4 text-base-content">
            {">"} Artifact generated:{" "}
            <span className="cursor-pointer text-primary underline decoration-primary/30 underline-offset-4">
              out/resume_staff_eng.pdf
            </span>{" "}
            (142kb)
          </div>
        </div>
      </div>
    </section>
  );
}
