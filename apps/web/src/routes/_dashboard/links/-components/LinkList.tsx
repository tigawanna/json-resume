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
import type { ResumeLink } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, useLiveQuery } from "@tanstack/react-db";
import { Link, Plus } from "lucide-react";
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
import { LinkCreateForm, LinkCreateFormDialog } from "./LinkCreateForm";
import { LinkEditForm } from "./LinkEditForm";

const ROUTE_ID = "/_dashboard/links/" as const;

export function LinkList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeLink | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeLink}
      sortableColumns={createSortableColumns(db.collections.resumeLink, [
        { value: "label", label: "Label" },
        { value: "url", label: "URL" },
        { value: "icon", label: "Icon" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeLink });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.label, row.url, row.icon, row.searchableText),
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
      const base = query.from({ row: db.collections.resumeLink });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.label, row.url, row.icon, row.searchableText),
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
      deleteWithReferences(db, "resumeLink", id);
      toast.success("Link deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="links" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-links-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Links"
        description="Profile and portfolio links in your local library."
        searchPlaceholder="Search links…"
        actions={actions}
        filters={filters}
        dataTest="links-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Links"
        description="Profile and portfolio links in your local library."
        searchPlaceholder="Search links…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="links-list-page"
      >
        <LibraryEmpty
          icon={Link}
          title="No Links Yet"
          description="You haven't added any links yet. Create your first entry to get started."
          actionLabel="Create Link"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="links-empty"
        />
        <LinkCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Links"
      description="Profile and portfolio links in your local library."
      searchPlaceholder="Search links…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="links-list-page"
    >
      <LibraryEntityCardGrid dataTest="links-table">
        {items.map((row) => (
          <LibraryEntityCard
            key={row.id}
            id={row.id}
            icon={Link}
            title={row.label}
            subtitle={row.url}
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
            <DialogTitle>New Link</DialogTitle>
            <DialogDescription>
              Add a link to your library so any résumé can reuse it.
            </DialogDescription>
          </DialogHeader>
          <LinkCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>
              Changes apply to every résumé that uses this link.
            </DialogDescription>
          </DialogHeader>
          {editing ? <LinkEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
