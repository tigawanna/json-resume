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
import type { ResumeCertification } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, useLiveQuery } from "@tanstack/react-db";
import { Award, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import { ImportFromLegacyButton } from "../../-components/ImportFromLegacyButton";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { LibraryEntityCard, LibraryEntityCardGrid } from "../../-components/LibraryEntityCard";
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
import { CertificationCreateForm, CertificationCreateFormDialog } from "./CertificationCreateForm";
import { CertificationEditForm } from "./CertificationEditForm";

const ROUTE_ID = "/_dashboard/certifications/" as const;

export function CertificationList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeCertification | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeCertification}
      sortableColumns={createSortableColumns(db.collections.resumeCertification, [
        { value: "name", label: "Name" },
        { value: "issuer", label: "Issuer" },
        { value: "date", label: "Date" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeCertification });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.name, row.issuer, row.date, row.url, row.searchableText),
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
      const base = query.from({ row: db.collections.resumeCertification });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.name, row.issuer, row.date, row.url, row.searchableText),
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
      deleteWithReferences(db, "resumeCertification", id);
      toast.success("Certification deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="certifications" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-certifications-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Certifications"
        description="Certifications in your local library."
        searchPlaceholder="Search certifications…"
        actions={actions}
        filters={filters}
        dataTest="certifications-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Certifications"
        description="Certifications in your local library."
        searchPlaceholder="Search certifications…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="certifications-list-page"
      >
        <LibraryEmpty
          icon={Award}
          title="No Certifications Yet"
          description="You haven't added any certifications yet. Create your first entry to get started."
          actionLabel="Create Certification"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="certifications-empty"
        />
        <CertificationCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Certifications"
      description="Certifications in your local library."
      searchPlaceholder="Search certifications…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="certifications-list-page"
    >
      <LibraryEntityCardGrid dataTest="certifications-table">
        {items.map((row) => (
          <LibraryEntityCard
            key={row.id}
            id={row.id}
            icon={Award}
            title={row.name}
            subtitle={row.issuer}
            dateRange={row.date}
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
            <DialogTitle>New Certification</DialogTitle>
            <DialogDescription>
              Add a certification to your library so any résumé can reuse it.
            </DialogDescription>
          </DialogHeader>
          <CertificationCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Certification</DialogTitle>
            <DialogDescription>
              Changes apply to every résumé that uses this certification.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <CertificationEditForm item={editing} onSuccess={() => setEditing(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
