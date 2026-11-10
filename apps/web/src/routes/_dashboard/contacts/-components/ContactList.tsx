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
import type { ResumeContact } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, inArray, useLiveQuery } from "@tanstack/react-db";
import { Contact, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { formatLocaleDate } from "@/utils/date-helpers";
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
import { unwrapUnknownError } from "@/utils/errors";
import { Route } from "..";
import { ContactCreateForm, ContactCreateFormDialog } from "./ContactCreateForm";
import { ContactEditForm } from "./ContactEditForm";

const ROUTE_ID = "/_dashboard/contacts/" as const;

export function ContactList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", view, sortBy, sortDirection } = Route.useSearch();
  const tableView = view === "table";
  const resumeFilter = useResumeFilter(ROUTE_ID);
  const libraryIds = resumeFilter.libraryIds("contacts");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeContact | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <>
      <EventSourcedSortToolbar
        collection={db.collections.resumeContact}
        sortableColumns={createSortableColumns(db.collections.resumeContact, [
          { value: "value", label: "Value" },
          { value: "type", label: "Type" },
          { value: "label", label: "Label" },
          { value: "updatedAt", label: "Updated" },
        ])}
        defaultSortBy="updatedAt"
      />
      <EntityViewToggle dataTest="contacts-view-toggle" />
    </>
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.resumeContact });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.type, row.value, row.label, row.searchableText),
          )
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
      const all = query.from({ row: db.collections.resumeContact });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.type, row.value, row.label, row.searchableText),
          )
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
      deleteWithReferences(db, "resumeContact", id);
      toast.success("Contact deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="contacts" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-contacts-btn"
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
        title="Contacts"
        description="Contact details in your local library."
        searchPlaceholder="Search contacts…"
        actions={actions}
        filters={filters}
        dataTest="contacts-list-page"
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
        title="Contacts"
        description="Contact details in your local library."
        searchPlaceholder="Search contacts…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="contacts-list-page"
      >
        <LibraryEmpty
          icon={Contact}
          title="No Contacts Yet"
          description="You haven't added any contacts yet. Create your first entry to get started."
          actionLabel="Create Contact"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={resumeFilter.clearAll}
          dataTest="contacts-empty"
        />
        <ContactCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      resumeFilter
      title="Contacts"
      description="Contact details in your local library."
      searchPlaceholder="Search contacts…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="contacts-list-page"
    >
      {tableView ? (
        <ResponsiveEntityTable
          rows={items}
          defaultSortBy="updatedAt"
          tableClassName="table-fixed"
          columns={[
            {
              id: "value",
              header: "Value",
              headClassName: "w-[30%]",
              className: "max-w-0 w-[30%]",
              cell: (row) => (
                <span className="block truncate font-medium">
                  {row.value || "Untitled contact"}
                </span>
              ),
            },
            {
              id: "type",
              header: "Type",
              headClassName: "w-[16%]",
              className: "w-[16%] whitespace-nowrap",
              cell: (row) =>
                row.type ? (
                  <TruncatedWithTooltip text={row.type} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              id: "label",
              header: "Label",
              sortable: false,
              hideOnMobile: true,
              className: "max-w-0",
              cell: (row) =>
                row.label ? (
                  <TruncatedWithTooltip text={row.label} />
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
          mobileTitle={(row) => row.value || "Untitled contact"}
          mobileSubtitle={(row) => row.type}
          dataTest="contacts-table"
          actions={(row) => (
            <RowActionButtons
              onEdit={() => setEditing(row)}
              onDelete={() => handleDelete(row.id)}
            />
          )}
        />
      ) : (
        <LibraryEntityCardGrid dataTest="contacts-table">
          {items.map((row) => (
            <LibraryEntityCard
              key={row.id}
              id={row.id}
              icon={Contact}
              title={row.value}
              subtitle={row.type}
              body={row.label}
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
            <DialogTitle>New Contact</DialogTitle>
            <DialogDescription>
              Add a contact to your library so any résumé can reuse it.
            </DialogDescription>
          </DialogHeader>
          <ContactCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Changes apply to every résumé that uses this contact.
            </DialogDescription>
          </DialogHeader>
          {editing ? <ContactEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
