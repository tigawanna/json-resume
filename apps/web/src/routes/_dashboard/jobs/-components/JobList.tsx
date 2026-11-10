import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteJob,
  JOB_STATUS_LABELS,
  jobListLabel,
} from "@/data-access-layer/event-sourced/rows/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { Job } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { formatLocaleDate } from "@/utils/date-helpers";
import { unwrapUnknownError } from "@/utils/errors";
import { count, useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { Briefcase, Download, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EntityViewToggle } from "../../-components/EntityViewToggle";
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
} from "../../-utils/list-query";
import { usePersistedListTablePrefs } from "../../-utils/use-persisted-list-table-prefs";
import { JobCreateForm, JobCreateFormDialog } from "./JobCreateForm";
import { JobEditForm } from "./JobEditForm";
import { JobImportFromResumesDialog } from "./JobImportFromResumesDialog";
import { JobCard, jobPayDisplay } from "./JobCard";
import { Route } from "..";

const ROUTE_ID = "/_dashboard/jobs/" as const;

export function JobList() {
  const db = useEventSourcedDb();
  const search = Route.useSearch();
  const { page = 1, q = "", sortBy, sortDirection } = search;
  const view = search.view === "table" ? "table" : "cards";
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  usePersistedListTablePrefs(db, "jobs", search);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);
  const sortDir = listSortDirection(sortDirection);

  const filters = (
    <>
      <EventSourcedSortToolbar
        collection={db.collections.job}
        sortableColumns={createSortableColumns(db.collections.job, [
          { value: "company", label: "Company" },
          { value: "title", label: "Title" },
          { value: "status", label: "Status" },
          { value: "hourlyMinCents", label: "Hourly pay" },
          { value: "location", label: "Location" },
          { value: "updatedAt", label: "Updated" },
        ])}
        defaultSortBy="updatedAt"
      />
      <EntityViewToggle dataTest="jobs-view-toggle" />
    </>
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.job });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.company,
              row.title,
              row.location,
              row.payRate,
              row.status,
              row.description,
              row.searchableText,
            ),
          )
        : base;
      return filtered
        .orderBy(({ row }) => listOrderByRef(row, sortBy, "updatedAt"), sortDir)
        .limit(ADMIN_LIST_PER_PAGE)
        .offset(offset);
    },
    [keyword, offset, sortBy, sortDir],
  );

  const { data: totals } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.job });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.company,
              row.title,
              row.location,
              row.payRate,
              row.status,
              row.description,
              row.searchableText,
            ),
          )
        : base;
      return filtered.select(({ row }) => ({ total: count(row.id) }));
    },
    [keyword],
  );

  const totalItems = totals?.[0]?.total ?? 0;
  const totalPages = totalPagesFromCount(totalItems);
  const hasSearch = keyword.length > 0;

  function handleDelete(id: string) {
    try {
      deleteJob(db, id);
      toast.success("Job deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
        data-test="import-jobs-from-resumes-btn"
      >
        <Download className="mr-1 size-4" /> From résumés
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-jobs-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Jobs"
        description="Track postings independently from résumés. Attach one when you tailor."
        searchPlaceholder="Search jobs…"
        actions={actions}
        filters={filters}
        dataTest="jobs-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Jobs"
        description="Track postings independently from résumés. Attach one when you tailor."
        searchPlaceholder="Search jobs…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="jobs-list-page"
      >
        <LibraryEmpty
          icon={Briefcase}
          title="No jobs yet"
          description="Paste a job description to track a posting. Company, title and the rest are optional."
          actionLabel="Add job"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="jobs-empty"
        />
        <JobCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
        <JobImportFromResumesDialog open={importOpen} onOpenChange={setImportOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Jobs"
      description="Track postings independently from résumés. Attach one when you tailor."
      searchPlaceholder="Search jobs…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="jobs-list-page"
    >
      {view === "cards" ? (
        <div data-test="jobs-table" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((row) => (
            <JobCard
              key={row.id}
              job={row}
              onEdit={() => setEditing(row)}
              onDelete={() => handleDelete(row.id)}
            />
          ))}
        </div>
      ) : (
        <ResponsiveEntityTable
          rows={items}
          tableClassName="table-fixed"
          defaultSortBy="updatedAt"
          columns={[
            {
              id: "title",
              header: "Company / title",
              headClassName: "w-[30%]",
              className: "max-w-0 w-[30%]",
              cell: (row) => (
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: row.id }}
                  className="block truncate font-medium hover:underline"
                  data-test={`job-table-link-${row.id}`}
                >
                  {jobListLabel(row)}
                </Link>
              ),
            },
            {
              id: "status",
              header: "Status",
              headClassName: "w-[12%]",
              className: "w-[12%]",
              cell: (row) => (
                <Badge variant={row.status === "applied" ? "default" : "secondary"}>
                  {JOB_STATUS_LABELS[row.status]}
                </Badge>
              ),
            },
            {
              id: "pay",
              header: "Pay",
              sortable: false,
              hideOnMobile: true,
              className: "whitespace-nowrap",
              cell: (row) => jobPayDisplay(row) ?? <span className="text-muted-foreground">—</span>,
            },
            {
              id: "location",
              header: "Location",
              hideOnMobile: true,
              className: "max-w-0",
              cell: (row) => (row.location ? <TruncatedWithTooltip text={row.location} /> : null),
            },
            {
              id: "updatedAt",
              header: "Updated",
              headClassName: "w-[14%]",
              className: "w-[14%] whitespace-nowrap",
              cell: (row) => formatLocaleDate(row.updatedAt),
            },
          ]}
          mobileTitle={(row) => jobListLabel(row)}
          mobileSubtitle={(row) => formatLocaleDate(row.updatedAt)}
          dataTest="jobs-table"
          actions={(row) => (
            <RowActionButtons
              onEdit={() => setEditing(row)}
              onDelete={() => handleDelete(row.id)}
            />
          )}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New job</DialogTitle>
            <DialogDescription>
              Save a job posting so you can tailor résumés against it.
            </DialogDescription>
          </DialogHeader>
          <JobCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit job</DialogTitle>
            <DialogDescription>Update the details and status of this job.</DialogDescription>
          </DialogHeader>
          {editing ? <JobEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
      <JobImportFromResumesDialog open={importOpen} onOpenChange={setImportOpen} />
    </EventSourcedListScaffold>
  );
}
