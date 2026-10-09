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
import type { Resume } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { getResumeCardDisplayName } from "@/utils/resume-display-name";
import { unwrapUnknownError } from "@/utils/errors";
import { count, useLiveQuery } from "@tanstack/react-db";
import { useNavigate } from "@tanstack/react-router";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { FileText, FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { cloneResume } from "@/data-access-layer/event-sourced/clone-resume";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import { ImportFromLegacyButton } from "../../-components/ImportFromLegacyButton";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { LibraryEntityCard, LibraryEntityCardGrid } from "../../-components/LibraryEntityCard";
import { RowActionButtons } from "../../-components/RowActionButtons";
import { ImportResumeJsonDialog } from "./ImportResumeJsonDialog";
import {
  listOffset,
  listOrderByRef,
  listSortDirection,
  orIlike,
  totalPagesFromCount,
} from "../../-utils/list-query";
import { usePersistedListTablePrefs } from "../../-utils/use-persisted-list-table-prefs";
import { ResumeCreateForm, ResumeCreateFormDialog } from "./ResumeCreateForm";
import { ResumeEditForm } from "./ResumeEditForm";
import { Route } from "..";

const ROUTE_ID = "/_dashboard/resumes/" as const;

export function ResumeList() {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { page = 1, q = "", sortBy, sortDirection } = search;
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  usePersistedListTablePrefs(db, "resumes", search);
  const [createOpen, setCreateOpen] = useState(false);
  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [editing, setEditing] = useState<Resume | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resume}
      sortableColumns={createSortableColumns(db.collections.resume, [
        { value: "name", label: "Name" },
        { value: "headline", label: "Headline" },
        { value: "fullName", label: "Full Name" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resume });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.name,
              row.fullName,
              row.headline,
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
      const base = query.from({ row: db.collections.resume });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.name,
              row.fullName,
              row.headline,
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
      deleteWithReferences(db, "resume", id);
      toast.success("Résumé deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  function handleClone(sourceId: string) {
    const userId = viewer.user?.id;
    if (!userId) {
      toast.error("You must be signed in to clone a résumé");
      return;
    }
    try {
      const result = cloneResume(db, sourceId);
      toast.success("Résumé cloned");
      void navigate({
        to: "/resumes/$resumeId",
        params: { resumeId: result.resumeId },
        search: { tab: "edit" },
      });
    } catch (err: unknown) {
      toast.error("Failed to clone résumé", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="resumes" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setImportJsonOpen(true)}
        data-test="import-resume-json-btn"
      >
        <FileUp className="mr-1 size-4" /> JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-resumes-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  const jsonDialog = (
    <ImportResumeJsonDialog open={importJsonOpen} onOpenChange={setImportJsonOpen} />
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Résumés"
        description="Local-first résumés stored in your event-sourced collection."
        searchPlaceholder="Search résumés…"
        actions={actions}
        filters={filters}
        dataTest="resumes-list-page"
      >
        <RouterPendingComponent />
        {jsonDialog}
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Résumés"
        description="Local-first résumés stored in your event-sourced collection."
        searchPlaceholder="Search résumés…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="resumes-list-page"
      >
        <LibraryEmpty
          icon={FileText}
          title="No Résumés Yet"
          description="Create a résumé shell locally. Section library items (experience, education, …) live under Resume Data."
          actionLabel="Create Résumé"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="resumes-empty"
        />
        <ResumeCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
        {jsonDialog}
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Résumés"
      description="Local-first résumés stored in your event-sourced collection."
      searchPlaceholder="Search résumés…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="resumes-list-page"
    >
      <LibraryEntityCardGrid dataTest="resumes-table">
        {items.map((row) => (
          <LibraryEntityCard
            key={row.id}
            id={row.id}
            icon={FileText}
            title={getResumeCardDisplayName(row)}
            subtitle={row.headline}
            identity={row.fullName}
            updatedAt={row.updatedAt}
            onClick={() =>
              void navigate({
                to: "/resumes/$resumeId",
                params: { resumeId: row.id },
                search: { tab: "edit" },
              })
            }
            actions={
              <RowActionButtons
                onEdit={() => setEditing(row)}
                onDelete={() => handleDelete(row.id)}
                onClone={() => handleClone(row.id)}
                onNavigateToDetails={() =>
                  void navigate({
                    to: "/resumes/$resumeId",
                    params: { resumeId: row.id },
                    search: { tab: "edit" },
                  })
                }
              />
            }
          />
        ))}
      </LibraryEntityCardGrid>

      {jsonDialog}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Résumé</DialogTitle>
            <DialogDescription>
              Create a résumé, then fill it with entries from your library.
            </DialogDescription>
          </DialogHeader>
          <ResumeCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Résumé</DialogTitle>
            <DialogDescription>Update the details of this résumé.</DialogDescription>
          </DialogHeader>
          {editing ? <ResumeEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
