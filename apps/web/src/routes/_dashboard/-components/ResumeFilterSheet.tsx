import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { Resume } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { cn } from "@/lib/utils";
import { formatLocaleDate } from "@/utils/date-helpers";
import { useLiveQuery } from "@tanstack/react-db";
import { Check, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { useResumeFilter } from "../-hooks/use-resume-filter";
import { orIlike } from "../-utils/list-query";
import { resumeLabel } from "../-utils/resume-filter";

type ResumeFilterState = ReturnType<typeof useResumeFilter>;

interface ResumeFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: ResumeFilterState;
}

/** Side drawer that toggles résumés in and out of the list's `resumeIds` filter. */
export function ResumeFilterSheet({ open, onOpenChange, filter }: ResumeFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        data-test="resume-filter-sheet"
      >
        <SheetHeader className="border-b pr-10">
          <SheetTitle>Filter by résumé</SheetTitle>
          <SheetDescription>
            Show only what the picked résumés use. Picked résumés stay at the top.
          </SheetDescription>
        </SheetHeader>
        <ResumeFilterBody filter={filter} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function ResumeFilterBody({ filter, onDone }: { filter: ResumeFilterState; onDone: () => void }) {
  const db = useEventSourcedDb();
  const [search, setSearch] = useState("");
  const keyword = search.trim();

  const { data, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ resume: db.collections.resume });
      const filtered = keyword
        ? base.where(({ resume }) =>
            orIlike(keyword, resume.name, resume.fullName, resume.headline),
          )
        : base;
      return filtered.orderBy(({ resume }) => resume.updatedAt, "desc");
    },
    [keyword],
  );
  const { data: jobs } = useLiveQuery((query) => query.from({ job: db.collections.job }), []);

  const rows = data ?? [];
  const pickOrder = new Map(filter.resumeIds.map((id, index) => [id, index]));
  const picked = rows
    .filter((row) => pickOrder.has(row.id))
    .sort((a, b) => (pickOrder.get(a.id) ?? 0) - (pickOrder.get(b.id) ?? 0));
  const others = rows.filter((row) => !pickOrder.has(row.id));
  const existing = new Set(rows.map((row) => row.id));
  const deletedIds = keyword ? [] : filter.resumeIds.filter((id) => !existing.has(id));
  const pickedCount = picked.length + deletedIds.length;

  function jobLabel(resume: Resume) {
    const job = resume.jobId ? jobs?.find((row) => row.id === resume.jobId) : undefined;
    return job ? jobListLabel(job) : undefined;
  }

  const renderRow = (resume: Resume) => (
    <li key={resume.id}>
      <ResumeFilterRow
        resume={resume}
        jobLabel={jobLabel(resume)}
        isPicked={pickOrder.has(resume.id)}
        onToggle={() => filter.toggle(resume.id)}
      />
    </li>
  );

  return (
    <>
      <div className="border-b p-4">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            placeholder="Search résumés…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search résumés"
            data-test="resume-filter-search"
          />
          {search ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear" onClick={() => setSearch("")}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <RouterPendingComponent />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {keyword ? "No résumés match. Try fewer or different words." : "No résumés yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-3 p-2">
            {pickedCount > 0 ? (
              <section aria-label="Picked résumés" data-test="resume-filter-picked">
                <ResumeFilterHeading>
                  Picked · {pickedCount}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => filter.setResumeIds([])}
                    data-test="resume-filter-clear"
                  >
                    Clear all
                  </Button>
                </ResumeFilterHeading>
                <ul className="flex flex-col gap-1">
                  {picked.map(renderRow)}
                  {deletedIds.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="hover:bg-base-content/5 text-muted-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm"
                        onClick={() => filter.toggle(id)}
                        data-test={`resume-filter-deleted-${id}`}
                      >
                        <X className="size-4 shrink-0" />
                        Deleted résumé — remove from filter
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {others.length > 0 ? (
              <section aria-label="Other résumés" data-test="resume-filter-others">
                {pickedCount > 0 ? <ResumeFilterHeading>Other résumés</ResumeFilterHeading> : null}
                <ul className="flex flex-col gap-1">{others.map(renderRow)}</ul>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <SheetFooter className="flex-row items-center justify-between border-t">
        <span className="text-muted-foreground text-xs" aria-live="polite">
          {filter.resumeIds.length === 0
            ? "Showing everything"
            : `Filtering by ${filter.resumeIds.length} ${filter.resumeIds.length === 1 ? "résumé" : "résumés"}`}
        </span>
        <Button size="sm" onClick={onDone} data-test="resume-filter-done">
          Done
        </Button>
      </SheetFooter>
    </>
  );
}

function ResumeFilterHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-muted-foreground flex items-center px-3 pt-1 pb-1.5 text-xs font-medium tracking-wide uppercase">
      {children}
    </h3>
  );
}

interface ResumeFilterRowProps {
  resume: Resume;
  jobLabel: string | undefined;
  isPicked: boolean;
  onToggle: () => void;
}

function ResumeFilterRow({ resume, jobLabel, isPicked, onToggle }: ResumeFilterRowProps) {
  const secondary = [jobLabel, resume.headline.trim()].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-base-content/5 flex w-full items-start gap-3 rounded-md px-3 py-2 text-left",
        isPicked && "bg-primary/10 hover:bg-primary/15",
      )}
      onClick={onToggle}
      aria-pressed={isPicked}
      data-test={`resume-filter-item-${resume.id}`}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
          isPicked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground",
        )}
      >
        {isPicked ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{resumeLabel(resume)}</span>
        {secondary ? (
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">{secondary}</span>
        ) : null}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
        {formatLocaleDate(resume.updatedAt)}
      </span>
    </button>
  );
}
