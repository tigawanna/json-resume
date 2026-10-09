import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/library-resolve";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeEducation } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, useLiveQuery } from "@tanstack/react-db";
import { GraduationCap, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import { ImportFromLegacyButton } from "../../-components/ImportFromLegacyButton";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import {
  formatLibraryDateRange,
  LibraryEntityCard,
  LibraryEntityCardGrid,
} from "../../-components/LibraryEntityCard";
import { RowActionButtons } from "../../-components/RowActionButtons";
import {
  listOffset,
  listOrderByRef,
  listSortDirection,
  orIlike,
  totalPagesFromCount,
} from "../../-utils/list-query";
import { unwrapUnknownError } from "@/utils/errors";
import { Route } from "..";
import { EducationCreateForm, EducationCreateFormDialog } from "./EducationCreateForm";
import { EducationEditForm } from "./EducationEditForm";

const ROUTE_ID = "/_dashboard/education/" as const;

export function EducationList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeEducation | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeEducation}
      sortableColumns={createSortableColumns(db.collections.resumeEducation, [
        { value: "school", label: "School" },
        { value: "degree", label: "Qualification" },
        { value: "field", label: "Field" },
        { value: "startDate", label: "Start" },
        { value: "endDate", label: "End" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeEducation });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.school,
              row.degree,
              row.field,
              row.startDate,
              row.endDate,
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
      const base = query.from({ row: db.collections.resumeEducation });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.school,
              row.degree,
              row.field,
              row.startDate,
              row.endDate,
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
      deleteWithReferences(db, "resumeEducation", id);
      toast.success("Education deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="education" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-education-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Education"
        description="Education entries in your local library."
        searchPlaceholder="Search education…"
        actions={actions}
        filters={filters}
        dataTest="education-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Education"
        description="Education entries in your local library."
        searchPlaceholder="Search education…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="education-list-page"
      >
        <LibraryEmpty
          icon={GraduationCap}
          title="No Education Yet"
          description="You haven't added any education yet. Create your first entry to get started."
          actionLabel="Create Education"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="education-empty"
        />
        <EducationCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Education"
      description="Education entries in your local library."
      searchPlaceholder="Search education…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="education-list-page"
    >
      <LibraryEntityCardGrid dataTest="education-table">
        {items.map((row) => (
          <LibraryEntityCard
            key={row.id}
            id={row.id}
            icon={GraduationCap}
            title={row.school}
            subtitle={[row.degree, row.field].filter(Boolean).join(" in ")}
            dateRange={formatLibraryDateRange(row.startDate, row.endDate)}
            sortOrder={row.sortOrder}
            updatedAt={row.updatedAt}
            actions={
              <RowActionButtons
                onEdit={() => setEditing(row)}
                onDelete={() => handleDelete(row.id)}
              />
            }
          />
        ))}
      </LibraryEntityCardGrid>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Education</DialogTitle>
            <DialogDescription>
              Add an education entry to your library so any résumé can reuse it.
            </DialogDescription>
          </DialogHeader>
          <EducationCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Education</DialogTitle>
            <DialogDescription>
              Changes apply to every résumé that uses this education entry.
            </DialogDescription>
          </DialogHeader>
          {editing ? <EducationEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
