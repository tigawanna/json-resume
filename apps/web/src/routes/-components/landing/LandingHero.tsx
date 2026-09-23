import { Link } from "@tanstack/react-router";

const POOL = [
  { id: "exp", kind: "Experience", title: "Ledger team" },
  { id: "proj", kind: "Project", title: "Reconciliation job" },
  { id: "talk", kind: "Talk", title: "Month-end close" },
  { id: "sum", kind: "Summary", title: "Staff, payments" },
  { id: "skill", kind: "Skills", title: "Distributed systems" },
] as const;

const VERSIONS = [
  {
    name: "Payments role",
    ids: ["exp", "proj", "sum", "skill"],
  },
  {
    name: "Speaking role",
    ids: ["talk", "proj", "skill"],
  },
] as const;

export function LandingHero() {
  return (
    <section
      data-test="landing-hero"
      className="relative mx-auto max-w-360 border-x border-border/50 lg:min-h-[calc(100dvh-3rem)]"
    >
      <div className="px-6 pt-10 md:px-12 md:pt-14">
        <p className="font-mono text-xs text-primary">Open source</p>
        <h1 className="mt-4 max-w-[22ch] text-balance font-serif text-4xl leading-[1.05] font-medium tracking-tight text-base-content md:text-5xl lg:text-6xl">
          The résumé is the sum of its parts.
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center gap-8 border-b border-border/50 px-6 py-8 md:px-12 lg:col-span-5 lg:border-r lg:border-b-0 lg:py-12">
          <p className="max-w-[36ch] text-pretty text-lg leading-relaxed font-light text-muted-foreground md:text-xl">
            Store each piece on its own, then assemble a version when a role needs one.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="bg-primary px-6 py-3 font-mono text-sm font-medium text-primary-content transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Open the editor
            </Link>
            <Link
              to="/auth"
              search={{ returnTo: "/dashboard" }}
              className="border border-border px-6 py-3 font-mono text-sm text-base-content transition-colors hover:bg-neutral active:scale-[0.98]"
            >
              Sign in to sync
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 bg-neutral/30 px-6 py-10 md:px-10 lg:col-span-7">
          <p className="font-mono text-xs text-muted-foreground">Library</p>
          <ul className="flex flex-wrap gap-2">
            {POOL.map((part) => (
              <li
                key={part.id}
                className="border border-border bg-base-100 px-3 py-2 font-mono text-xs text-base-content"
              >
                <span className="text-muted-foreground">{part.kind}</span>
                <span className="mx-2 text-border">/</span>
                {part.title}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {VERSIONS.map((version) => (
              <div key={version.name} className="border border-border bg-base-100">
                <div className="border-b border-border px-3 py-2 font-mono text-xs text-base-content">
                  {version.name}
                </div>
                <ul>
                  {version.ids.map((id) => {
                    const part = POOL.find((item) => item.id === id);
                    if (!part) return null;
                    return (
                      <li
                        key={id}
                        className="border-b border-border/60 px-3 py-2 text-sm text-base-content last:border-b-0"
                      >
                        <span className="mr-2 font-mono text-[10px] text-primary">{part.kind}</span>
                        {part.title}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
