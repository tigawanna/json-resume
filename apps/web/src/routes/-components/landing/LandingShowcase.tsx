const JSON_SAMPLE = `{
  "work": [
    { "name": "Ledger", "position": "Staff engineer" }
  ],
  "projects": [
    { "name": "Reconciliation job" }
  ],
  "skills": [
    { "name": "Distributed systems" }
  ]
}`;

export function LandingShowcase() {
  return (
    <section
      id="agents"
      data-test="landing-showcase"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="border-t border-border/50 px-6 py-20 md:px-16 md:py-28">
        <h2 className="max-w-[20ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          A model can see which configuration fits.
        </h2>
        <div className="mt-6 max-w-[65ch] space-y-4 text-pretty text-base leading-relaxed text-muted-foreground">
          <p>
            Paste a JSON Resume document and the editor already knows the shape. Work, projects,
            skills, and the other blocks become records in the library. Download the library as a
            JSON backup when you want a file, and print a PDF from those same records.
          </p>
          <p>
            An agent with API access can list résumés, search the blocks, add a bullet, or clone a
            version. Because it can follow which project belongs to which job, a draft and an email
            can both start from the configuration you would have picked by hand.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 border border-border lg:grid-cols-12">
          <div className="border-b border-border px-6 py-8 lg:col-span-7 lg:border-r lg:border-b-0 md:px-8">
            <p className="font-mono text-xs text-muted-foreground">Note a model can draft</p>
            <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-base-content">
              Happy to send the payments version. It keeps the ledger role and the reconciliation
              project, and leaves the conference talk in the library unless you want speaking on
              the page.
            </p>
          </div>
          <pre className="overflow-x-auto bg-base-200 px-6 py-8 font-mono text-[13px] leading-relaxed text-base-content lg:col-span-5 md:px-8">
            {JSON_SAMPLE}
          </pre>
        </div>
      </div>
    </section>
  );
}
