import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeProject } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, useLiveQuery } from "@tanstack/react-db";
import { FolderKanban, Plus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { adoptSavedProjects } from "../../-utils/adopt-saved-projects";
import { Route } from "..";
import { ProjectCreateForm, ProjectCreateFormDialog } from "./ProjectCreateForm";
import { ProjectEditForm } from "./ProjectEditForm";

const ROUTE_ID = "/_dashboard/resume-projects/" as const;

function parseTechTags(tech: string): string[] {
  try {
    const parsed: unknown = JSON.parse(tech);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return tech
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function ProjectList() {
  const db = useEventSourcedDb();

  useEffect(() => {
    adoptSavedProjects(db);
  }, [db]);

  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeProject | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeProject}
      sortableColumns={createSortableColumns(db.collections.resumeProject, [
        { value: "name", label: "Name" },
        { value: "description", label: "Description" },
        { value: "tech", label: "Tech" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeProject });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.name,
              row.url,
              row.homepageUrl,
              row.description,
              row.tech,
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
      const base = query.from({ row: db.collections.resumeProject });
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.name,
              row.url,
              row.homepageUrl,
              row.description,
              row.tech,
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
      db.collections.resumeProject.delete(id);
      toast.success("Project deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="projects" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-resume-projects-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Projects"
        description="Projects in your local library."
        searchPlaceholder="Search projects…"
        actions={actions}
        filters={filters}
        dataTest="resume-projects-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Projects"
        description="Projects in your local library."
        searchPlaceholder="Search projects…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="resume-projects-list-page"
      >
        <LibraryEmpty
          icon={FolderKanban}
          title="No Projects Yet"
          description="You haven't added any projects yet. Create your first entry to get started."
          actionLabel="Create Project"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="resume-projects-empty"
        />
        <ProjectCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Projects"
      description="Projects in your local library."
      searchPlaceholder="Search projects…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="resume-projects-list-page"
    >
      <LibraryEntityCardGrid dataTest="resume-projects-table">
        {items.map((row) => {
          const tags = parseTechTags(row.tech);
          return (
            <LibraryEntityCard
              key={row.id}
              id={row.id}
              icon={FolderKanban}
              title={row.name}
              subtitle={row.description}
              body={tags.length > 0 ? tags.join(" · ") : undefined}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <ProjectCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editing ? <ProjectEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
