import { SearchBox } from "@/components/search/SearchBox";
import { Badge } from "@/components/ui/badge";
import { InputGroupButton } from "@/components/ui/input-group";
import type { TRouteID } from "@/lib/tanstack/router/router-types";
import { FileText, X } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { useResumeFilter } from "../-hooks/use-resume-filter";
import { resumeLabel } from "../-utils/resume-filter";
import { ResumeFilterSheet } from "./ResumeFilterSheet";

/** Chips past this many collapse into one “…” chip that opens the drawer. */
const VISIBLE_CHIPS = 3;

type ResumeFilterSearchBoxProps = Omit<ComponentProps<typeof SearchBox>, "leading"> & {
  routeID: TRouteID;
};

/** List search box that also shows the picked résumés, with the drawer to change them. */
export function ResumeFilterSearchBox({ routeID, ...searchBoxProps }: ResumeFilterSearchBoxProps) {
  const filter = useResumeFilter(routeID);
  const [open, setOpen] = useState(false);
  const byId = new Map(filter.resumes.map((resume) => [resume.id, resume]));
  const visible = filter.resumeIds.slice(0, VISIBLE_CHIPS);
  const overflow = filter.resumeIds.length - visible.length;

  function chipLabel(id: string) {
    const resume = byId.get(id);
    if (resume) return resumeLabel(resume);
    return filter.isLoading ? "Loading…" : "Deleted résumé";
  }

  const chips = (
    <>
      <InputGroupButton
        size="xs"
        variant={filter.active ? "secondary" : "ghost"}
        onClick={() => setOpen(true)}
        aria-label="Filter by résumé"
        data-test="resume-filter-open"
      >
        <FileText />
        {filter.active ? null : <span className="hidden sm:inline">Résumés</span>}
      </InputGroupButton>
      {visible.map((id) => {
        const label = chipLabel(id);
        return (
          <Badge
            key={id}
            variant="secondary"
            className="max-w-44 gap-1"
            data-test={`resume-filter-chip-${id}`}
          >
            <span className="truncate" title={label}>
              {label}
            </span>
            <button
              type="button"
              className="hover:text-base-content shrink-0"
              aria-label={`Stop filtering by ${label}`}
              onClick={() => filter.toggle(id)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}
      {overflow > 0 ? (
        <Badge asChild variant="outline" data-test="resume-filter-more">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Show all ${filter.resumeIds.length} picked résumés`}
          >
            … +{overflow}
          </button>
        </Badge>
      ) : null}
    </>
  );

  return (
    <>
      <SearchBox {...searchBoxProps} leading={chips} />
      <ResumeFilterSheet open={open} onOpenChange={setOpen} filter={filter} />
    </>
  );
}
