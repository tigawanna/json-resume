import { useState } from "react";

type WorkItem = {
  name: string;
  position: string;
  highlights: string[];
};

type ProjectItem = {
  name: string;
  description: string;
};

type DemoResume = {
  header: { fullName: string; headline: string };
  work: WorkItem[];
  projects: ProjectItem[];
  skills: string[];
};

const AI_ENGINEER_JSON = `{
  "header": {
    "fullName": "Amina Okonkwo",
    "headline": "Product engineer who ships model features and checks them with Playwright."
  },
  "work": [
    {
      "name": "Account service",
      "position": "Product engineer",
      "highlights": ["Built the account service both the assistant and the CRM call."]
    },
    {
      "name": "Release checks",
      "position": "Product engineer",
      "highlights": ["Covered the assistant flow with Playwright, from the prompt to the saved result."]
    }
  ],
  "projects": [
    {
      "name": "Shared forms",
      "description": "Kept the form components both products use."
    }
  ],
  "skills": ["Playwright"]
}`;

const CRM_DEVELOPER_JSON = `{
  "header": {
    "fullName": "Amina Okonkwo",
    "headline": "Product engineer who ships the customer workspace and checks it with Jest and manual QA."
  },
  "work": [
    {
      "name": "Account service",
      "position": "Product engineer",
      "highlights": ["Built the account service both the assistant and the CRM call."]
    },
    {
      "name": "Release checks",
      "position": "Product engineer",
      "highlights": ["Covered the account screens with Jest, and walked the rest with manual QA."]
    }
  ],
  "projects": [
    {
      "name": "Shared forms",
      "description": "Kept the form components both products use."
    }
  ],
  "skills": ["Jest", "Manual QA"]
}`;

const ROLE_JSON = [
  { id: "ai", name: "AI engineer", source: AI_ENGINEER_JSON },
  { id: "crm", name: "CRM developer", source: CRM_DEVELOPER_JSON },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = readString(item);
    return text ? [text] : [];
  });
}

function readWork(value: unknown): WorkItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = readString(item.name);
    const position = readString(item.position);
    if (!name && !position) return [];
    return [{ name, position, highlights: readStringList(item.highlights) }];
  });
}

function readProjects(value: unknown): ProjectItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = readString(item.name);
    if (!name) return [];
    return [{ name, description: readString(item.description) }];
  });
}

function toDemoResume(value: unknown): DemoResume | null {
  if (!isRecord(value)) return null;
  const header = isRecord(value.header) ? value.header : {};
  return {
    header: {
      fullName: readString(header.fullName) || "Untitled",
      headline: readString(header.headline),
    },
    work: readWork(value.work),
    projects: readProjects(value.projects),
    skills: readStringList(value.skills),
  };
}

function parseDemoResume(text: string): { resume: DemoResume } | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not parse JSON";
    return { error: message };
  }
  const resume = toDemoResume(value);
  if (!resume) return { error: "JSON must be an object." };
  return { resume };
}

export function LandingJsonResumeDemo() {
  const initial = parseDemoResume(AI_ENGINEER_JSON);
  const [source, setSource] = useState(AI_ENGINEER_JSON);
  const [preview, setPreview] = useState<DemoResume | null>(
    "resume" in initial ? initial.resume : null,
  );
  const parsed = parseDemoResume(source);
  const error = "error" in parsed ? parsed.error : null;

  function updateSource(next: string) {
    setSource(next);
    const nextParsed = parseDemoResume(next);
    if ("resume" in nextParsed) setPreview(nextParsed.resume);
  }

  return (
    <div
      data-test="landing-json-demo"
      className="grid grid-cols-1 border border-border lg:grid-cols-12"
    >
      <div className="flex flex-col border-b border-border bg-base-200 lg:col-span-7 lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <span className="mr-auto font-mono text-xs text-muted-foreground">resume.json</span>
          {ROLE_JSON.map((role) => {
            const selected = source === role.source;
            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={selected}
                className={`border px-2 py-1 font-mono text-xs transition-colors active:scale-[0.98] ${
                  selected
                    ? "border-primary bg-primary text-primary-content"
                    : "border-border bg-base-100 text-base-content hover:border-primary/40"
                }`}
                onClick={() => updateSource(role.source)}
              >
                {role.name}
              </button>
            );
          })}
        </div>
        <label className="sr-only" htmlFor="landing-resume-json">
          Résumé JSON
        </label>
        <textarea
          id="landing-resume-json"
          value={source}
          spellCheck={false}
          onChange={(event) => updateSource(event.target.value)}
          className="min-h-80 flex-1 resize-y bg-transparent p-4 font-mono text-[13px] leading-relaxed text-base-content outline-none"
        />
        {error ? (
          <p
            className="border-t border-border px-4 py-2 font-mono text-xs text-error"
            role="status"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="bg-base-100 px-6 py-8 lg:col-span-5" aria-live="polite">
        {preview ? (
          <article>
            <h3 className="font-serif text-2xl font-medium tracking-tight text-base-content">
              {preview.header.fullName}
            </h3>
            {preview.header.headline ? (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {preview.header.headline}
              </p>
            ) : null}

            {preview.work.length > 0 ? (
              <section className="mt-6">
                <h4 className="font-mono text-xs text-primary">Work</h4>
                <ul className="mt-3 space-y-4">
                  {preview.work.map((job) => (
                    <li key={`${job.name}-${job.position}`}>
                      <p className="text-sm font-medium text-base-content">
                        {job.position ? `${job.position}, ${job.name}` : job.name}
                      </p>
                      {job.highlights.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {job.highlights.map((line) => (
                            <li
                              key={line}
                              className="text-sm leading-relaxed text-muted-foreground"
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {preview.projects.length > 0 ? (
              <section className="mt-6">
                <h4 className="font-mono text-xs text-primary">Projects</h4>
                <ul className="mt-3 space-y-3">
                  {preview.projects.map((project) => (
                    <li key={project.name}>
                      <p className="text-sm font-medium text-base-content">{project.name}</p>
                      {project.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {project.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {preview.skills.length > 0 ? (
              <section className="mt-6">
                <h4 className="font-mono text-xs text-primary">Skills</h4>
                <p className="mt-2 text-sm text-base-content">{preview.skills.join(", ")}</p>
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </div>
  );
}
