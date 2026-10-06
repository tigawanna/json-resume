import { LandingActivityDemo } from "./LandingActivityDemo";
import { LandingSyncDemo } from "./LandingSyncDemo";

export function LandingCTA() {
  return (
    <section
      id="sync"
      data-test="landing-cta"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="grid grid-cols-1 border-t border-primary/20 bg-primary/5 lg:grid-cols-12">
        <div className="px-6 pt-20 pb-10 md:px-16 md:pt-28 lg:col-span-5 lg:border-r lg:border-primary/20 lg:py-28 lg:pr-12">
          <h2 className="max-w-[16ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
            Local first. The server is a choice.
          </h2>
          <div className="mt-6 max-w-[42ch] space-y-4 text-pretty text-base leading-relaxed">
            <p className="text-muted-foreground">
              Editing happens in this browser. Lists open without a round trip, and a change is
              stored before anything is sent. The workbench stays quick when you are offline, and
              the library on this machine is the one you are actually changing.
            </p>
            <p className="text-base-content">
              Sign in and turn managed sync on when you want those changes copied to the server. A
              public résumé is published separately, so you can share one snapshot and keep the
              working library to yourself.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-20 md:px-16 md:pb-28 lg:col-span-7 lg:py-28 lg:pl-12">
          <LandingActivityDemo />
          <LandingSyncDemo />
        </div>
      </div>
    </section>
  );
}
