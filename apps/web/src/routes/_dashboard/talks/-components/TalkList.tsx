import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/library-resolve";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeTalk } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, useLiveQuery } from "@tanstack/react-db";
import { Mic, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { unwrapUnknownError } from "@/utils/errors";
import { parseTalkLinks } from "../-utils/talk-links";
import { Route } from "..";
import { TalkCreateForm, TalkCreateFormDialog } from "./TalkCreateForm";
import { TalkEditForm } from "./TalkEditForm";

const ROUTE_ID = "/_dashboard/talks/" as const;

export function TalkList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeTalk | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);
  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeTalk}
      sortableColumns={createSortableColumns(db.collections.resumeTalk, [
        { value: "title", label: "Title" },
        { value: "event", label: "Event" },
        { value: "date", label: "Date" },
        { value: "description", label: "Description" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeTalk });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.title, row.event, row.date, row.description, row.searchableText),
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
      const base = query.from({ row: db.collections.resumeTalk });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(keyword, row.title, row.event, row.date, row.description, row.searchableText),
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
      deleteWithReferences(db, "resumeTalk", id);
      toast.success("Talk deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="talks" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-talks-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Talks"
        description="Talks and presentations in your local library."
        searchPlaceholder="Search talks…"
        actions={actions}
        filters={filters}
        dataTest="talks-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Talks"
        description="Talks and presentations in your local library."
        searchPlaceholder="Search talks…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="talks-list-page"
      >
        <LibraryEmpty
          icon={Mic}
          title="No Talks Yet"
          description="You haven't added any talks yet. Create your first entry to get started."
          actionLabel="Create Talk"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="talks-empty"
        />
        <TalkCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Talks"
      description="Talks and presentations in your local library."
      searchPlaceholder="Search talks…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="talks-list-page"
    >
      <LibraryEntityCardGrid dataTest="talks-table">
        {items.map((row) => {
          const links = parseTalkLinks(row.links);
          return (
            <LibraryEntityCard
              key={row.id}
              id={row.id}
              icon={Mic}
              title={row.title}
              subtitle={row.event}
              dateRange={row.date}
              body={
                row.description || links.length > 0 ? (
                  <>
                    {row.description ? <p className="line-clamp-2">{row.description}</p> : null}
                    {links.length > 0 ? (
                      <p className="mt-1 truncate">{links.map((link) => link.label).join(" · ")}</p>
                    ) : null}
                  </>
                ) : undefined
              }
              sortOrder={row.sortOrder}
              updatedAt={row.updatedAt}
              actions={
                <RowActionButtons
                  onEdit={() => setEditing(row)}
                  onDelete={() => handleDelete(row.id)}
                />
              }
            />
          );
        })}
      </LibraryEntityCardGrid>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Talk</DialogTitle>
          </DialogHeader>
          <TalkCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Talk</DialogTitle>
          </DialogHeader>
          {editing ? <TalkEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
