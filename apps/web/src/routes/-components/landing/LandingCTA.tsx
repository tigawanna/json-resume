import { Link, useLocation } from "@tanstack/react-router";

export function LandingCTA() {
  const { pathname } = useLocation();

  return (
    <section data-test="landing-cta" className="mx-auto max-w-360 border-x border-border/50">
      <div className="border-t border-border/50 px-8 py-24 md:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 font-serif text-4xl font-medium tracking-tight text-base-content md:text-5xl">
            Start from <span className="italic text-primary">your</span> JSON
          </h2>
          <p className="mx-auto mb-10 max-w-md text-muted-foreground">
            Sign in to open the dashboard, paste or upload your schema, and iterate toward PDF
            export. Or try the public editor — no account needed.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/auth"
              search={{ returnTo: pathname }}
              className="bg-primary px-8 py-3 font-mono text-sm font-medium text-primary-content transition-opacity hover:opacity-90">
              Sign in →
            </Link>
            <Link
              to="/auth/signup"
              search={{ returnTo: "/dashboard" }}
              className="border border-border px-8 py-3 font-mono text-sm text-base-content transition-colors hover:bg-neutral">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
