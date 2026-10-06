import { LandingJsonResumeDemo } from "./LandingJsonResumeDemo";

export function LandingShowcase() {
  return (
    <section
      id="agents"
      data-test="landing-showcase"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="grid grid-cols-1 border-t border-primary/25 bg-primary/15 lg:grid-cols-12">
        <div className="order-2 px-6 pb-20 md:px-16 md:pb-28 lg:order-1 lg:col-span-7 lg:border-r lg:border-primary/25 lg:py-28 lg:pr-12">
          <LandingJsonResumeDemo />
        </div>
        <div className="order-1 px-6 pt-20 pb-10 md:px-16 md:pt-28 lg:order-2 lg:col-span-5 lg:py-28 lg:pl-12">
          <h2 className="max-w-[16ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
            A model can see which configuration fits.
          </h2>
          <div className="mt-6 max-w-[42ch] space-y-4 text-pretty text-base leading-relaxed text-muted-foreground">
            <p>
              Paste a JSON Resume document and the editor already knows the shape. Work, projects,
              skills, and the other blocks become records in the library. Download the library as a
              JSON backup when you want a file, and print a PDF from those same records.
            </p>
            <p>
              An agent with API access can list résumés, search the blocks, add a bullet, or clone a
              version. Because it can follow which project belongs to which job, a draft and an
              email can both start from the configuration you would have picked by hand.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
