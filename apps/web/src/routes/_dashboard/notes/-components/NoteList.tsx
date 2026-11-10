import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import { useResumeFilter } from "../../-hooks/use-resume-filter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeNote } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, inArray, useLiveQuery } from "@tanstack/react-db";
import { Notebook, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { formatLocaleDate } from "@/utils/date-helpers";
import { unwrapUnknownError } from "@/utils/errors";
import { EntityViewToggle } from "../../-components/EntityViewToggle";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import { ImportFromLegacyButton } from "../../-components/ImportFromLegacyButton";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { LibraryEntityCard, LibraryEntityCardGrid } from "../../-components/LibraryEntityCard";
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
import { Route } from "..";
import { NoteCreateForm, NoteCreateFormDialog } from "./NoteCreateForm";
import { NoteEditForm } from "./NoteEditForm";

const ROUTE_ID = "/_dashboard/notes/" as const;

export function NoteList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", view, sortBy, sortDirection } = Route.useSearch();
  const tableView = view === "table";
  const resumeFilter = useResumeFilter(ROUTE_ID);
  const libraryIds = resumeFilter.libraryIds("notes");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeNote | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <>
      <EventSourcedSortToolbar
        collection={db.collections.resumeNote}
        sortableColumns={createSortableColumns(db.collections.resumeNote, [
          { value: "label", label: "Label" },
          { value: "text", label: "Text" },
          { value: "updatedAt", label: "Updated" },
        ])}
        defaultSortBy="updatedAt"
      />
      <EntityViewToggle dataTest="notes-view-toggle" />
    </>
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.resumeNote });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.label, row.text, row.searchableText))
        : base;
      return filtered
        .orderBy(({ row }) => listOrderByRef(row, sortBy, "updatedAt"), sortDir)
        .limit(ADMIN_LIST_PER_PAGE)
        .offset(offset);
    },
    [keyword, offset, sortBy, sortDir, libraryIds?.join(",")],
  );

  const { data: totals } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.resumeNote });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.label, row.text, row.searchableText))
        : base;
      return filtered.select(({ row }) => ({ total: count(row.id) }));
    },
    [keyword, libraryIds?.join(",")],
  );

  const totalItems = totals?.[0]?.total ?? 0;
  const totalPages = totalPagesFromCount(totalItems);
  const hasSearch = keyword.length > 0 || resumeFilter.active;

  function handleDelete(id: string) {
    try {
      deleteWithReferences(db, "resumeNote", id);
      toast.success("Note deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="notes" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-notes-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        resumeFilter
        title="Notes"
        description="Footer copy — condensed cover letters and addenda — in your local library."
        searchPlaceholder="Search notes…"
        actions={actions}
        filters={filters}
        dataTest="notes-list-page"
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
        title="Notes"
        description="Footer copy — condensed cover letters and addenda — in your local library."
        searchPlaceholder="Search notes…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="notes-list-page"
      >
        <LibraryEmpty
          icon={Notebook}
          title="No Notes Yet"
          description="You haven't added any footer notes yet. Use this for a condensed cover letter or other copy that sits at the bottom of the résumé."
          actionLabel="Create Note"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={resumeFilter.clearAll}
          dataTest="notes-empty"
        />
        <NoteCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      resumeFilter
      title="Notes"
      description="Footer copy — condensed cover letters and addenda — in your local library."
      searchPlaceholder="Search notes…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="notes-list-page"
    >
      {tableView ? (
        <ResponsiveEntityTable
          rows={items}
          defaultSortBy="updatedAt"
          tableClassName="table-fixed"
          columns={[
            {
              id: "label",
              header: "Label",
              headClassName: "w-[24%]",
              className: "max-w-0 w-[24%]",
              cell: (row) => (
                <span className="block truncate font-medium">{row.label || "Notes"}</span>
              ),
            },
            {
              id: "text",
              header: "Text",
              sortable: false,
              hideOnMobile: true,
              className: "max-w-0",
              cell: (row) =>
                row.text ? (
                  <TruncatedWithTooltip text={row.text} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              id: "updatedAt",
              header: "Updated",
              headClassName: "w-[14%]",
              className: "w-[14%] whitespace-nowrap",
              cell: (row) => formatLocaleDate(row.updatedAt),
            },
          ]}
          mobileTitle={(row) => row.label || "Notes"}
          mobileSubtitle={(row) => row.text}
          dataTest="notes-table"
          actions={(row) => (
            <RowActionButtons
              onEdit={() => setEditing(row)}
              onDelete={() => handleDelete(row.id)}
            />
          )}
        />
      ) : (
        <LibraryEntityCardGrid dataTest="notes-table">
          {items.map((row) => (
            <LibraryEntityCard
              key={row.id}
              id={row.id}
              icon={Notebook}
              title={row.label || "Notes"}
              subtitle={row.text}
              sortOrder={row.sortOrder}
              updatedAt={row.updatedAt}
              onEdit={() => setEditing(row)}
              onDelete={() => handleDelete(row.id)}
            />
          ))}
        </LibraryEntityCardGrid>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
            <DialogDescription>Write a note to keep alongside your library.</DialogDescription>
          </DialogHeader>
          <NoteCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>Update the contents of this note.</DialogDescription>
          </DialogHeader>
          {editing ? <NoteEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
