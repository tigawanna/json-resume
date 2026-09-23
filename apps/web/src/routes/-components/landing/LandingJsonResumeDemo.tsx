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

const PAYMENTS_JSON = `{
  "header": {
    "fullName": "Amina Okonkwo",
    "headline": "Staff engineer, payments"
  },
  "work": [
    {
      "name": "Ledger",
      "position": "Staff engineer",
      "highlights": ["Shipped the reconciliation job that shortened month-end close"]
    }
  ],
  "projects": [
    {
      "name": "Reconciliation job",
      "description": "Matches ledger entries against the processor file."
    }
  ],
  "skills": ["Distributed systems"]
}`;

const SPEAKING_JSON = `{
  "header": {
    "fullName": "Amina Okonkwo",
    "headline": "Engineer who teaches the close"
  },
  "work": [
    {
      "name": "Ledger",
      "position": "Staff engineer",
      "highlights": ["Gave the conference talk on month-end close"]
    }
  ],
  "projects": [
    {
      "name": "Month-end close",
      "description": "A talk about the reconciliation job, for an audience that does not run the ledger."
    }
  ],
  "skills": ["Distributed systems", "Technical talks"]
}`;

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
  const initial = parseDemoResume(PAYMENTS_JSON);
  const [source, setSource] = useState(PAYMENTS_JSON);
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
      className="mt-14 grid grid-cols-1 border border-border lg:grid-cols-12"
    >
      <div className="flex flex-col border-b border-border bg-base-200 lg:col-span-7 lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <span className="mr-auto font-mono text-xs text-muted-foreground">resume.json</span>
          <button
            type="button"
            className="border border-border bg-base-100 px-2 py-1 font-mono text-xs text-base-content hover:bg-neutral active:scale-[0.98]"
            onClick={() => updateSource(PAYMENTS_JSON)}
          >
            Payments
          </button>
          <button
            type="button"
            className="border border-border bg-base-100 px-2 py-1 font-mono text-xs text-base-content hover:bg-neutral active:scale-[0.98]"
            onClick={() => updateSource(SPEAKING_JSON)}
          >
            Speaking
          </button>
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
          <p className="border-t border-border px-4 py-2 font-mono text-xs text-error" role="status">
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
              <p className="mt-1 font-mono text-xs text-muted-foreground">{preview.header.headline}</p>
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
                            <li key={line} className="text-sm leading-relaxed text-muted-foreground">
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
