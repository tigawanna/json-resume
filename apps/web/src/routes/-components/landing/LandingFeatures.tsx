import { useState } from "react";

const LIBRARY = [
  {
    id: "sum-ai",
    kind: "Summary",
    title: "AI engineer",
    text: "Product engineer who ships model features and checks them with Playwright.",
  },
  {
    id: "sum-crm",
    kind: "Summary",
    title: "CRM developer",
    text: "Product engineer who ships the customer workspace and checks it with Jest and manual QA.",
  },
  {
    id: "exp-account",
    kind: "Experience",
    title: "Account service",
    text: "Built the account service both the assistant and the CRM call.",
  },
  {
    id: "exp-forms",
    kind: "Experience",
    title: "Shared forms",
    text: "Kept the form components both products use.",
  },
  {
    id: "exp-playwright",
    kind: "Experience",
    title: "Release checks",
    text: "Covered the assistant flow with Playwright, from the prompt to the saved result.",
  },
  {
    id: "exp-jest",
    kind: "Experience",
    title: "Release checks",
    text: "Covered the account screens with Jest, and walked the rest with manual QA.",
  },
] as const;

const ROLES = [
  {
    id: "ai",
    name: "AI engineer",
    picks: ["sum-ai", "exp-account", "exp-playwright", "exp-forms"],
  },
  {
    id: "crm",
    name: "CRM developer",
    picks: ["sum-crm", "exp-account", "exp-jest", "exp-forms"],
  },
] as const;

type RoleId = (typeof ROLES)[number]["id"];
type RecordId = (typeof LIBRARY)[number]["id"];

const GROUPS = [
  { kind: "Summary", label: "Summaries" },
  { kind: "Experience", label: "Experiences" },
] as const;

export function LandingFeatures() {
  const [roleId, setRoleId] = useState<RoleId>("ai");
  const role = ROLES.find((item) => item.id === roleId) ?? ROLES[0];
  const picked = new Set<RecordId>(role.picks);
  const summary = LIBRARY.find((item) => item.kind === "Summary" && picked.has(item.id));
  const experiences = LIBRARY.filter((item) => item.kind === "Experience" && picked.has(item.id));

  return (
    <section
      id="parts"
      data-test="landing-pipeline"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50"
    >
      <div className="grid grid-cols-1 border-t border-primary/20 bg-primary/10 lg:grid-cols-12">
        <div className="px-6 pt-20 pb-10 md:px-16 md:pt-28 lg:col-span-5 lg:border-r lg:border-primary/20 lg:py-28 lg:pr-12">
          <h2 className="max-w-[22ch] text-balance text-3xl font-medium tracking-tight text-base-content md:text-4xl">
            Compose the variation that fits the job.
          </h2>
          <div className="mt-6 max-w-[42ch] space-y-4 text-pretty text-base leading-relaxed text-muted-foreground">
            <p>
              Two close roles can share the same work and still ask for a different wording. The
              account service stays in both résumés. The summary and the release checks change:
              Playwright for the AI engineer, Jest and manual QA for the CRM developer.
            </p>
            <p>
              Every wording stays in the library. The role you select marks the records in that
              résumé.
            </p>
          </div>
        </div>

        <div
          data-test="landing-variations"
          className="px-6 pb-20 md:px-16 md:pb-28 lg:col-span-7 lg:py-28 lg:pl-12"
        >
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

          <article className="mt-6 max-w-xl bg-base-100 px-6 py-8 outline-2 outline-primary md:px-8">
            <p className="font-serif text-2xl tracking-tight text-base-content">Amina Okonkwo</p>
            <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-base-content">
              {summary?.text}
            </p>
            <h3 className="mt-8 font-mono text-xs text-primary">Experience</h3>
            <ul className="mt-3">
              {experiences.map((item) => {
                const shared = ROLES.every((entry) => entry.picks.some((pick) => pick === item.id));
                return (
                  <li key={item.id} className="border-t border-border py-3 first:border-t-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-base-content">{item.title}</span>
                      {shared ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Both roles
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-primary">{role.name}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 border-t border-primary/20 bg-primary/10 px-6 py-12 md:grid-cols-2 md:px-16 md:py-16">
        {GROUPS.map((group) => (
          <div key={group.kind}>
            <p className="font-mono text-xs text-muted-foreground">{group.label}</p>
            <ul className="mt-3 space-y-2">
              {LIBRARY.filter((item) => item.kind === group.kind).map((item) => {
                const used = picked.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={`border px-4 py-3 ${
                      used ? "border-primary bg-primary/25" : "border-border bg-base-100"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-base-content">{item.title}</span>
                      {used ? (
                        <span className="ml-auto font-mono text-[10px] text-primary">
                          In this résumé
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 text-sm leading-relaxed ${
                        used ? "text-base-content" : "text-muted-foreground"
                      }`}
                    >
                      {item.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
