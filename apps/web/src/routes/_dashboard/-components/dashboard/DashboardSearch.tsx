import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { orIlike } from "@/routes/_dashboard/-utils/list-query";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type SearchCollectionKey =
  | "resume"
  | "job"
  | "resumeExperience"
  | "resumeExperienceBullet"
  | "resumeProject"
  | "resumeEducation"
  | "resumeSkillGroup"
  | "resumeSummary"
  | "savedProject"
  | "coverLetter"
  | "applicationAnswer";

type CollectionConfig = {
  key: SearchCollectionKey;
  label: string;
  fields: (row: any) => string;
  title: (row: any) => string;
  subtitle?: (row: any) => string;
  href?: (row: any) => string;
};

const COLLECTIONS: CollectionConfig[] = [
  {
    key: "resume",
    label: "Resumes",
    fields: (r) => [r.name, r.fullName, r.headline, r.description, r.searchableText].join(" "),
    title: (r) => String(r.name || r.fullName || r.id),
    subtitle: (r) => String(r.headline || ""),
    href: (r) => `/resumes/${r.id}`,
  },
  {
    key: "job",
    label: "Jobs",
    fields: (r) =>
      [r.company, r.title, r.description, r.notes, r.searchableText, r.location].join(" "),
    title: (r) => `${r.title || ""}${r.company ? ` — ${r.company}` : ""}`.trim() || String(r.id),
    subtitle: (r) => String(r.status || ""),
    href: (r) => `/jobs/${r.id}`,
  },
  {
    key: "resumeExperience",
    label: "Experiences",
    fields: (r) => [r.company, r.role, r.location, r.searchableText].join(" "),
    title: (r) => String(r.role || r.company || r.id),
    subtitle: (r) => String(r.company || ""),
    href: (r) => `/experiences/${r.id}`,
  },
  {
    key: "resumeExperienceBullet",
    label: "Bullets",
    fields: (r) => [r.text, r.searchableText].join(" "),
    title: (r) => String(r.text || r.id),
  },
  {
    key: "resumeProject",
    label: "Projects",
    fields: (r) => [r.name, r.description, r.searchableText].join(" "),
    title: (r) => String(r.name || r.id),
  },
  {
    key: "resumeEducation",
    label: "Education",
    fields: (r) => [r.school, r.degree, r.field, r.searchableText].join(" "),
    title: (r) => String(r.degree || r.school || r.id),
    subtitle: (r) => String(r.school || ""),
  },
  {
    key: "resumeSkillGroup",
    label: "Skill groups",
    fields: (r) => [r.name, r.searchableText].join(" "),
    title: (r) => String(r.name || r.id),
  },
  {
    key: "resumeSummary",
    label: "Summaries",
    fields: (r) => [r.text, r.searchableText].join(" "),
    title: (r) => String(r.text || r.id).slice(0, 80),
  },
  {
    key: "savedProject",
    label: "Saved projects",
    fields: (r) => [r.name, r.description, r.searchableText].join(" "),
    title: (r) => String(r.name || r.id),
  },
  {
    key: "coverLetter",
    label: "Cover letters",
    fields: (r) => [r.title, r.body, r.searchableText].join(" "),
    title: (r) => String(r.title || r.id),
  },
  {
    key: "applicationAnswer",
    label: "Application answers",
    fields: (r) => [r.question, r.answer, r.searchableText].join(" "),
    title: (r) => String(r.question || r.id),
  },
];

const DEFAULT_SELECTED: SearchCollectionKey[] = ["resume", "job", "resumeExperience"];

export function DashboardSearch() {
  const db = useEventSourcedDb();
  const search = useSearch({ from: "/_dashboard/dashboard" });
  const navigate = useNavigate();
  const q = search.q;
  const open = q !== undefined;
  const [query, setQuery] = useState(q ?? "");
  const [selected, setSelected] = useState<SearchCollectionKey[]>(DEFAULT_SELECTED);
  const inputRef = useRef<HTMLInputElement>(null);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  // Keep local query in sync with the URL param (back/forward navigation).
  useEffect(() => {
    setQuery(q ?? "");
  }, [q]);

  // Live query: resumes matching all search terms (or none when query empty).
  const { data: resumeRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resume })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resume });
      for (const term of terms) {
        qb = qb.where(({ row }) =>
          orIlike(term, row.name, row.fullName, row.headline, row.description, row.searchableText),
        );
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: jobs matching all search terms.
  const { data: jobRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.job })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.job });
      for (const term of terms) {
        qb = qb.where(({ row }) =>
          orIlike(
            term,
            row.company,
            row.title,
            row.description,
            row.notes,
            row.location,
            row.searchableText,
          ),
        );
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: experiences matching all search terms.
  const { data: experienceRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resumeExperience })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resumeExperience });
      for (const term of terms) {
        qb = qb.where(({ row }) =>
          orIlike(term, row.company, row.role, row.location, row.searchableText),
        );
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: experience bullets matching all search terms.
  const { data: bulletRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resumeExperienceBullet })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resumeExperienceBullet });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.text, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: resume projects matching all search terms.
  const { data: projectRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resumeProject })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resumeProject });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.name, row.description, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: education entries matching all search terms.
  const { data: educationRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resumeEducation })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resumeEducation });
      for (const term of terms) {
        qb = qb.where(({ row }) =>
          orIlike(term, row.school, row.degree, row.field, row.searchableText),
        );
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: skill groups matching all search terms.
  const { data: skillGroupRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resumeSkillGroup })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resumeSkillGroup });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.name, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: summaries matching all search terms.
  const { data: summaryRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.resumeSummary })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.resumeSummary });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.text, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  // Live query: saved projects matching all search terms.
  const { data: savedProjectRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.savedProject })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.savedProject });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.name, row.description, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );
  // Live query: cover letters matching all search terms.
  const { data: coverLetterRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.coverLetter })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.coverLetter });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.title, row.body, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );
  // Live query: application answers matching all search terms.
  const { data: applicationAnswerRows } = useLiveQuery(
    (q) => {
      if (terms.length === 0)
        return q
          .from({ row: db.collections.applicationAnswer })
          .orderBy(({ row }) => row.id)
          .limit(0);
      // Start from the collection, then AND one case-insensitive OR-across-fields
      // predicate per search term so every term must match some field.
      let qb = q.from({ row: db.collections.applicationAnswer });
      for (const term of terms) {
        qb = qb.where(({ row }) => orIlike(term, row.question, row.answer, row.searchableText));
      }
      return qb.orderBy(({ row }) => row.id).limit(8);
    },
    [query],
  );

  const rowsByKey: Record<SearchCollectionKey, Record<string, unknown>[]> = {
    resume: (resumeRows ?? []) as Record<string, unknown>[],
    job: (jobRows ?? []) as Record<string, unknown>[],
    resumeExperience: (experienceRows ?? []) as Record<string, unknown>[],
    resumeExperienceBullet: (bulletRows ?? []) as Record<string, unknown>[],
    resumeProject: (projectRows ?? []) as Record<string, unknown>[],
    resumeEducation: (educationRows ?? []) as Record<string, unknown>[],
    resumeSkillGroup: (skillGroupRows ?? []) as Record<string, unknown>[],
    resumeSummary: (summaryRows ?? []) as Record<string, unknown>[],
    savedProject: (savedProjectRows ?? []) as Record<string, unknown>[],
    coverLetter: (coverLetterRows ?? []) as Record<string, unknown>[],
    applicationAnswer: (applicationAnswerRows ?? []) as Record<string, unknown>[],
  };

  const resultsByCollection = COLLECTIONS.filter((c) => selected.includes(c.key)).map((config) => {
    const rows = rowsByKey[config.key];
    const hits = rows.map((row) => ({
      id: String(row.id),
      title: config.title(row),
      subtitle: config.subtitle ? config.subtitle(row) : undefined,
      snippet: config.fields(row).slice(0, 120),
      href: config.href ? config.href(row) : undefined,
    }));
    return { config, hits };
  });

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  function toggle(key: SearchCollectionKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const searchInput = (
    <div className="flex items-center gap-2 rounded-2xl border border-base-content/15 bg-primary/10 px-4 py-3 shadow-sm">
      <Search className="size-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          void navigate({ to: "/dashboard", search: { q: value }, replace: true });
        }}
        placeholder="Search across your library..."
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        data-test="dashboard-search-input"
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          void navigate({ to: "/dashboard", search: { q: "" }, replace: true });
        }}
        className="w-full text-left"
        data-test="dashboard-search-trigger"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-base-content/15 bg-primary/10 px-4 py-3 shadow-sm">
          <Search className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search across your library...</span>
        </div>
      </button>

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setQuery("");
            void navigate({ to: "/dashboard", search: {}, replace: true });
          }
        }}
      >
        <SheetContent
          side="top"
          showCloseButton={false}
          className="inset-0 h-full w-full border-none p-0"
        >
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 p-6">
            <SheetHeader className="flex flex-row items-center justify-between gap-4 p-0">
              <SheetTitle className="sr-only">Search</SheetTitle>
              <div className="flex-1">{searchInput}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  void navigate({ to: "/dashboard", search: {}, replace: true });
                }}
                aria-label="Close search"
                data-test="dashboard-search-close"
              >
                Done
              </Button>
            </SheetHeader>

            <div className="flex flex-wrap gap-2" data-test="dashboard-search-collections">
              {COLLECTIONS.map((c) => (
                <label
                  key={c.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                    selected.includes(c.key)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-base-content/15 text-muted-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.key)}
                    onChange={() => toggle(c.key)}
                    className="sr-only"
                  />
                  {c.label}
                </label>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto" data-test="dashboard-search-results">
              {terms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Type to search across the selected collections.
                </p>
              ) : null}
              <div className="flex flex-col gap-4">
                {resultsByCollection.map(({ config, hits }) =>
                  hits.length === 0 ? null : (
                    <section key={config.key} className="flex flex-col gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {config.label} ({hits.length})
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {hits.map((hit) => {
                          const className =
                            "block rounded-xl border border-base-content/15 bg-primary/10 p-3 text-sm shadow-sm transition-colors hover:bg-primary/20";
                          const content = (
                            <>
                              <p className="font-medium">{hit.title}</p>
                              {hit.subtitle ? (
                                <p className="text-xs text-muted-foreground">{hit.subtitle}</p>
                              ) : null}
                              {hit.snippet ? (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {hit.snippet}
                                </p>
                              ) : null}
                            </>
                          );
                          return hit.href ? (
                            <Link
                              key={hit.id}
                              to={hit.href}
                              onClick={() => {
                                setQuery("");
                                void navigate({ to: "/dashboard", search: {}, replace: true });
                              }}
                              className={className}
                              data-test={`dashboard-search-hit-${config.key}`}
                            >
                              {content}
                            </Link>
                          ) : (
                            <div
                              key={hit.id}
                              className={className}
                              data-test={`dashboard-search-hit-${config.key}`}
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ),
                )}
                {terms.length > 0 && resultsByCollection.every((r) => r.hits.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No matches found.</p>
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
