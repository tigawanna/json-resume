import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function LandingCTA() {
  const { pathname } = useLocation();

  return (
    <section id="cta" className="scroll-mt-20 bg-base-100 py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-12 text-center md:p-20">
          <div className="absolute top-0 right-0 size-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary-content/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 size-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary-content/10 blur-3xl" />

          <div className="relative z-10">
            <h2 className="mb-4 font-serif text-4xl leading-tight text-primary-content md:text-5xl">
              Ready to build something <span className="italic text-primary-content/80">real</span>?
            </h2>
            <p className="mx-auto mb-10 max-w-md text-lg text-primary-content/70">
              Clone the repo, run install, and start from the dashboard and auth flows already wired
              for you.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/auth" search={{ returnTo: pathname }}>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 rounded-full px-8 text-base shadow-lg"
                >
                  Get started
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/auth/signup" search={{ returnTo: "/dashboard" }}>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full border border-primary-content/25 px-8 text-base text-primary-content hover:bg-primary-content/10 hover:text-primary-content"
                >
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
