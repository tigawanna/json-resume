import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import type { TRouteID } from "@/lib/tanstack/router/router-types";
import type { ReactNode } from "react";
import { ResumeFilterSearchBox } from "./ResumeFilter";

type EventSourcedListScaffoldProps = {
  routeID: TRouteID;
  title: string;
  description: string;
  searchPlaceholder: string;
  totalPages?: number;
  actions?: ReactNode;
  /** Sort UI (TanstackDBSortSelect) — stays above the table. */
  filters?: ReactNode;
  /** Résumé picker in the search box; the route must declare `resumeIds`. */
  resumeFilter?: boolean;
  children: ReactNode;
  dataTest?: string;
};

/**
 * Chrome that stays mounted across pending / empty / loaded list states:
 * title, search, primary actions, children slot, pagination.
 */
export function EventSourcedListScaffold({
  routeID,
  title,
  description,
  searchPlaceholder,
  totalPages = 0,
  actions,
  filters,
  resumeFilter = false,
  children,
  dataTest,
}: EventSourcedListScaffoldProps) {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(routeID);
  const searchBoxProps = {
    keyword: inputValue,
    setKeyword: onSearchChange,
    isDebouncing,
    inputProps: { placeholder: searchPlaceholder },
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-6" data-test={dataTest}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {resumeFilter ? (
            <ResumeFilterSearchBox routeID={routeID} {...searchBoxProps} />
          ) : (
            <SearchBox {...searchBoxProps} />
          )}
        </div>
        {filters ? <div className="flex shrink-0 items-center gap-2">{filters}</div> : null}
      </div>

      {children}

      <TSRListPagination routeID={routeID} totalPages={totalPages} />
    </div>
  );
}
