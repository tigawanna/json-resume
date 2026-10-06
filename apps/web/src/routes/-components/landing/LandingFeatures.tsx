import { useState } from "react";

const PARTS = [
  {
    id: "experience",
    kind: "Experience",
    title: "Ledger",
    variations: [
      {
        id: "close",
        name: "The close",
        text: "Shipped the reconciliation job that shortened month-end close.",
      },
      {
        id: "talk",
        name: "The talk",
        text: "Gave the conference talk on how that close actually runs.",
      },
    ],
  },
  {
    id: "project",
    kind: "Project",
    title: "Reconciliation job",
    variations: [
      {
        id: "ledger",
        name: "For the ledger",
        text: "Matches ledger entries against the processor file.",
      },
      {
        id: "audience",
        name: "For an audience",
        text: "The same job, told for people who do not run the ledger.",
      },
    ],
  },
  {
    id: "summary",
    kind: "Summary",
    title: "Headline",
    variations: [
      { id: "staff", name: "Staff, payments", text: "Staff engineer, payments." },
      { id: "teacher", name: "Teaches the close", text: "Engineer who teaches the close." },
    ],
  },
  {
    id: "skills",
    kind: "Skills",
    title: "Distributed systems",
    variations: [
      { id: "systems", name: "Systems", text: "Distributed systems." },
      { id: "talks", name: "Systems and talks", text: "Distributed systems, technical talks." },
    ],
  },
] as const;

const ROLES = [
  {
    id: "payments",
    name: "Payments",
    description: "Staff engineer, payments",
    picks: {
      experience: "close",
      project: "ledger",
      summary: "staff",
      skills: "systems",
    },
  },
  {
    id: "speaking",
    name: "Speaking",
    description: "A talk on month-end close",
    picks: {
      experience: "talk",
      project: "audience",
      summary: "teacher",
      skills: "talks",
    },
  },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

export function LandingFeatures() {
  const [roleId, setRoleId] = useState<RoleId>("payments");
  const role = ROLES.find((item) => item.id === roleId) ?? ROLES[0];

  return (
    <section
      id="parts"
      data-test="landing-pipeline"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="bg-base-200/70 px-6 py-20 md:px-16 md:py-28">
        <h2 className="max-w-[22ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          Compose the variation that fits the job.
        </h2>
        <div className="mt-6 max-w-[65ch] space-y-4 text-pretty text-base leading-relaxed text-muted-foreground">
          <p>
            Experience, projects, summaries, skills, and the rest are stored as their own records. A
            record can hold more than one variation: the payments wording and the speaking wording
            of the same work, kept side by side.
          </p>
          <p>
            A résumé is the set you pick for the description in front of you. A variation you leave
            out stays in the library for the next role.
          </p>
        </div>

        <div
          data-test="landing-variations"
          className="mt-14 grid grid-cols-1 items-start gap-10 lg:grid-cols-12"
        >
          <div className="lg:col-span-7">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={role.id === item.id}
                  onClick={() => setRoleId(item.id)}
                  className={`border px-3 py-2 font-mono text-xs transition-colors active:scale-[0.98] ${
                    role.id === item.id
                      ? "border-primary bg-primary text-primary-content"
                      : "border-border bg-base-100 text-base-content hover:border-primary/40"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p className="mt-8 font-mono text-xs text-muted-foreground">
              Assembled for {role.description}
            </p>
            <ul className="mt-4 border border-border bg-base-100">
              {PARTS.map((part) => {
                const chosen = part.variations.find(
                  (variation) => variation.id === role.picks[part.id],
                );
                if (!chosen) return null;
                return (
                  <li key={part.id} className="border-b border-border px-4 py-4 last:border-b-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-primary">{part.kind}</span>
                      <span className="text-sm font-medium text-base-content">{part.title}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {chosen.name}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-base-content">{chosen.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-5 lg:pt-14">
            <p className="font-mono text-xs text-muted-foreground">Still in the library</p>
            <ul className="mt-4 space-y-3">
              {PARTS.map((part) => {
                const held = part.variations.find(
                  (variation) => variation.id !== role.picks[part.id],
                );
                if (!held) return null;
                return (
                  <li key={part.id} className="border border-border bg-base-100 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-muted-foreground">{part.kind}</span>
                      <span className="font-mono text-[10px] text-primary">{held.name}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {held.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
