import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { Link } from "@tanstack/react-router";

const RESUME_JSON = `{
  "header": {
    "fullName": "Jane Doe",
    "headline": "Full-Stack Engineer",
    "email": "jane@example.com",
    "links": [
      { "label": "GitHub", "url": "..." }
    ]
  },
  "experience": [
    {
      "company": "Acme Corp",
      "role": "Senior Engineer",
      "start": "2021",
      "bullets": ["Led migration..."]
    }
  ]
}`;

export function LandingHero() {
  return (
    <section
      data-test="landing-hero"
      className="relative mx-auto min-h-dvh max-w-360 border-x border-border/50"
    >
      {/* Hero copy */}
      <BackgroundRippleEffect />
      <div className="border-b border-border/50 px-8 py-16 md:px-16 md:py-24 lg:px-24 lg:py-32">
        <div className="flex max-w-4xl flex-col gap-8">
          <div className="flex items-center gap-3 font-mono animate-fade-in">
            <span className="border border-primary/30 bg-primary/5 px-2 py-1 text-xs uppercase tracking-widest text-primary">
              Open Source
            </span>
            <span className="text-xs text-muted-foreground">
              // JSON in · LLM in the middle · PDF out
            </span>
          </div>

          <h1 className="animate-fade-in text-balance font-serif text-5xl font-medium leading-[0.95] tracking-tighter text-base-content md:text-7xl lg:text-8xl">
            Résumé as structured data.
          </h1>

          <p className="animate-fade-in max-w-[50ch] text-pretty text-xl font-light leading-relaxed text-muted-foreground md:text-2xl">
            Define your career in pure JSON. Tailor it with any LLM using a job description. Export
            a print-ready PDF — without reformatting a doc.
          </p>

          <div className="mt-4 flex flex-wrap gap-4 animate-fade-in">
            <Link
              to="/auth"
              search={{ returnTo: "/dashboard" }}
              className="bg-primary px-6 py-3 font-mono font-medium text-primary-content transition-opacity hover:opacity-90"
            >
              Get Started →
            </Link>
            <Link
              to="/workbench"
              className="border border-border px-6 py-3 font-mono text-base-content transition-colors hover:bg-neutral"
            >
              Try the Editor
            </Link>
          </div>
        </div>
      </div>

      {/* Editor + Preview grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Code editor mock */}
        <div className="flex flex-col gap-4 border-r border-b border-border/50 p-6 md:p-12 lg:col-span-7 lg:border-b-0">
          <div className="flex items-end justify-between border-b border-border pb-3 font-mono">
            <div className="flex gap-4">
              <span className="text-xs font-semibold text-base-content">resume.json</span>
              <span className="text-xs text-muted-foreground">/src/data/</span>
            </div>
            <span className="text-xs text-primary">Line 12, Col 24</span>
          </div>

          <div className="relative min-h-90">
            <div className="absolute inset-0 overflow-hidden border border-border bg-base-200 shadow-[8px_8px_0_var(--color-border)]">
              {/* Line numbers */}
              <div className="absolute top-0 bottom-0 left-0 flex w-12 select-none flex-col items-end border-r border-border bg-neutral/50 px-2 py-6 font-mono text-[11px] text-muted-foreground/60">
                {Array.from({ length: 16 }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="h-full overflow-auto p-6 pl-16 font-mono text-[13px] leading-relaxed text-base-content">
                {RESUME_JSON}
              </pre>
            </div>
          </div>
        </div>

        {/* PDF Preview mock */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border/50 bg-neutral/30 p-6 md:p-12 lg:col-span-5 lg:border-b-0">
          <div className="relative z-10 flex aspect-[1/1.4] w-full max-w-75 flex-col gap-6 border border-border bg-base-200 p-8 shadow-2xl">
            <div className="border-b-2 border-base-content pb-4">
              <div className="font-serif text-2xl font-medium uppercase tracking-tight">
                Jane Doe
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                jane@example.com / Full-Stack Engineer
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <div className="mb-3 border-b border-border pb-1 text-xs font-semibold uppercase tracking-widest">
                  Experience
                </div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium">Acme Corp</span>
                  <span className="font-mono text-[9px] text-muted-foreground">2021-CURR</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-base-content/10" />
                  <div className="h-1.5 w-5/6 bg-base-content/10" />
                  <div className="h-1.5 w-11/12 bg-base-content/10" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium">StartupXYZ</span>
                  <span className="font-mono text-[9px] text-muted-foreground">2018-2021</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-base-content/10" />
                  <div className="h-1.5 w-4/6 bg-base-content/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="z-10 mt-8 flex gap-6 border border-border bg-base-200/50 px-4 py-2 font-mono text-xs">
            <span className="text-muted-foreground">resume.pdf</span>
            <span className="tabular-nums text-base-content">18.4 KB</span>
            <span className="tabular-nums text-primary">142ms</span>
          </div>
        </div>
      </div>
    </section>
  );
}
