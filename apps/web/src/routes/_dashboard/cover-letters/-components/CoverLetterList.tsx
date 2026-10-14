import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import {
  coverLetterPreview,
  coverLetterWordCount,
  deleteCoverLetter,
  insertCoverLetter,
} from "@/data-access-layer/event-sourced/rows/cover-letter-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { formatLocaleDate } from "@/utils/date-helpers";
import { unwrapUnknownError } from "@/utils/errors";
import { count, useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate } from "@tanstack/react-router";
import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { ResponsiveEntityTable } from "../../-components/ResponsiveEntityTable";
import { RowActionButtons } from "../../-components/RowActionButtons";
import { TruncatedWithTooltip } from "../../-components/TruncatedWithTooltip";
import {
  listOffset,
  listOrderByRef,
  listSortDirection,
  orIlike,
  totalPagesFromCount,
  writtenForResumes,
} from "../../-utils/list-query";
import { useResumeFilter } from "../../-hooks/use-resume-filter";
import { usePersistedListTablePrefs } from "../../-utils/use-persisted-list-table-prefs";
import { Route } from "..";

const ROUTE_ID = "/_dashboard/cover-letters/" as const;
const TITLE = "Cover letters";
const DESCRIPTION =
  "Ask the résumé assistant for one, or write it here. Copy to Docs or export PDF.";

export function CoverLetterList() {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { page = 1, q = "", sortBy, sortDirection } = search;
  const resumeFilter = useResumeFilter(ROUTE_ID);
  const { resumeIds, jobIds } = resumeFilter;
  const scopeKey = resumeFilter.active ? `${resumeIds.join(",")}|${jobIds.join(",")}` : "";
  usePersistedListTablePrefs(db, "cover-letters", search);

  const keyword = q.trim();
  const offset = listOffset(page);
  const sortDir = listSortDirection(sortDirection);

  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.coverLetter}
      sortableColumns={createSortableColumns(db.collections.coverLetter, [
        { value: "title", label: "Title" },
        { value: "updatedAt", label: "Updated" },
        { value: "createdAt", label: "Created" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.coverLetter });
      const base = resumeFilter.active
        ? all.where(({ row }) => writtenForResumes(row.resumeId, row.jobId, resumeIds, jobIds))
        : all;
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.title, row.body))
        : base;
      return filtered
        .orderBy(({ row }) => listOrderByRef(row, sortBy, "updatedAt"), sortDir)
        .limit(ADMIN_LIST_PER_PAGE)
        .offset(offset);
    },
    [keyword, offset, sortBy, sortDir, scopeKey],
  );

  const { data: totals } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.coverLetter });
      const base = resumeFilter.active
        ? all.where(({ row }) => writtenForResumes(row.resumeId, row.jobId, resumeIds, jobIds))
        : all;
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.title, row.body))
        : base;
      return filtered.select(({ row }) => ({ total: count(row.id) }));
    },
    [keyword, scopeKey],
  );

  const totalItems = totals?.[0]?.total ?? 0;
  const totalPages = totalPagesFromCount(totalItems);
  const hasSearch = keyword.length > 0 || resumeFilter.active;

  function openLetter(coverLetterId: string) {
    void navigate({ to: "/cover-letters/$coverLetterId", params: { coverLetterId } });
  }

  function handleCreate() {
    try {
      const letter = insertCoverLetter(db, viewer.user?.id, {});
      openLetter(letter.id);
    } catch (err: unknown) {
      toast.error("Failed to create cover letter", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  function handleDelete(id: string) {
    try {
      deleteCoverLetter(db, id);
      toast.success("Cover letter deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <Button variant="outline" size="sm" onClick={handleCreate} data-test="add-cover-letter-btn">
      <Plus className="mr-1 size-4" /> New
    </Button>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        resumeFilter
        title={TITLE}
        description={DESCRIPTION}
        searchPlaceholder="Search cover letters…"
        actions={actions}
        filters={filters}
        dataTest="cover-letters-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        resumeFilter
        title={TITLE}
        description={DESCRIPTION}
        searchPlaceholder="Search cover letters…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="cover-letters-list-page"
      >
        <LibraryEmpty
          icon={Mail}
          title="No cover letters yet"
          description="Ask the résumé assistant to write one (try /cover-letter), or start a blank letter."
          actionLabel="New cover letter"
          onAction={handleCreate}
          hasSearch={hasSearch}
          onClearSearch={resumeFilter.clearAll}
          dataTest="cover-letters-empty"
        />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      resumeFilter
      title={TITLE}
      description={DESCRIPTION}
      searchPlaceholder="Search cover letters…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="cover-letters-list-page"
    >
      <ResponsiveEntityTable
        rows={items}
        tableClassName="table-fixed"
        columns={[
          {
            id: "title",
            header: "Title",
            headClassName: "w-[30%]",
            className: "max-w-0 w-[30%]",
            cell: (row) => (
              <Link
                to="/cover-letters/$coverLetterId"
                params={{ coverLetterId: row.id }}
                className="block truncate font-medium hover:underline"
                data-test={`cover-letter-link-${row.id}`}
              >
                {row.title || "Untitled cover letter"}
              </Link>
            ),
          },
          {
            id: "body",
            header: "Opening",
            sortable: false,
            hideOnMobile: true,
            className: "max-w-0",
            cell: (row) => <TruncatedWithTooltip text={coverLetterPreview(row.body, 160)} />,
          },
          {
            id: "words",
            header: "Words",
            sortable: false,
            headClassName: "w-[10%]",
            className: "w-[10%] whitespace-nowrap tabular-nums",
            cell: (row) => coverLetterWordCount(row.body),
          },
          {
            id: "updatedAt",
            header: "Updated",
            headClassName: "w-[14%]",
            className: "w-[14%] whitespace-nowrap",
            cell: (row) => formatLocaleDate(row.updatedAt),
          },
        ]}
        mobileTitle={(row) => row.title || "Untitled cover letter"}
        mobileSubtitle={(row) => coverLetterPreview(row.body, 80)}
        dataTest="cover-letters-table"
        actions={(row) => (
          <RowActionButtons
            onEdit={() => openLetter(row.id)}
            onDelete={() => handleDelete(row.id)}
          />
        )}
      />
    </EventSourcedListScaffold>
  );
}
