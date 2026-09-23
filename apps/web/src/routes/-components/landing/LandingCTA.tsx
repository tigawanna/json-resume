export function LandingCTA() {
  return (
    <section
      id="sync"
      data-test="landing-cta"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="border-t border-border/50 bg-neutral/40 px-6 py-20 md:px-16 md:py-28">
        <h2 className="max-w-[16ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          Local first. The server is a choice.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <p className="max-w-[48ch] text-pretty text-base leading-relaxed text-muted-foreground md:col-span-7">
            Editing happens in this browser. Lists open without a round trip, and a change is
            stored before anything is sent. The workbench stays quick when you are offline, and the
            library on this machine is the one you are actually changing.
          </p>
          <p className="max-w-[36ch] text-pretty text-base leading-relaxed text-base-content md:col-span-5">
            Sign in and turn managed sync on when you want those changes copied to the server. A
            public résumé is published separately, so you can share one snapshot and keep the
            working library to yourself.
          </p>
        </div>
      </div>
    </section>
  );
}
