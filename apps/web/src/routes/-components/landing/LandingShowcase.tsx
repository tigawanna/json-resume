import { LandingJsonResumeDemo } from "./LandingJsonResumeDemo";

export function LandingShowcase() {
  return (
    <section
      id="agents"
      data-test="landing-showcase"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="border-t border-border/50 bg-base-100 px-6 py-20 md:px-16 md:py-28">
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

        <LandingJsonResumeDemo />
      </div>
    </section>
  );
}
