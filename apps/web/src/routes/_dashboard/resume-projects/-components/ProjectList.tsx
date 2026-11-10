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
import type { ResumeProject } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { count, inArray, useLiveQuery } from "@tanstack/react-db";
import { FolderKanban, Plus } from "lucide-react";
import { useEffect, useState } from "react";
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

  const { page = 1, q = "", view, sortBy, sortDirection } = Route.useSearch();
  const tableView = view === "table";
  const resumeFilter = useResumeFilter(ROUTE_ID);
  const libraryIds = resumeFilter.libraryIds("projects");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResumeProject | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <>
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
      <EntityViewToggle dataTest="resume-projects-view-toggle" />
    </>
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.resumeProject });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
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
    [keyword, offset, sortBy, sortDir, libraryIds?.join(",")],
  );

  const { data: totals } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.resumeProject });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
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
    [keyword, libraryIds?.join(",")],
  );

  const totalItems = totals?.[0]?.total ?? 0;
  const totalPages = totalPagesFromCount(totalItems);
  const hasSearch = keyword.length > 0 || resumeFilter.active;

  function handleDelete(id: string) {
    try {
      deleteWithReferences(db, "resumeProject", id);
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
        resumeFilter
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
        resumeFilter
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
          onClearSearch={resumeFilter.clearAll}
          dataTest="resume-projects-empty"
        />
        <ProjectCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      resumeFilter
      title="Projects"
      description="Projects in your local library."
      searchPlaceholder="Search projects…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="resume-projects-list-page"
    >
      {tableView ? (
        <ResponsiveEntityTable
          rows={items}
          defaultSortBy="updatedAt"
          tableClassName="table-fixed"
          columns={[
            {
              id: "name",
              header: "Name",
              headClassName: "w-[30%]",
              className: "max-w-0 w-[30%]",
              cell: (row) => (
                <span className="block truncate font-medium">{row.name || "Untitled project"}</span>
              ),
            },
            {
              id: "description",
              header: "Description",
              sortable: false,
              hideOnMobile: true,
              className: "max-w-0",
              cell: (row) =>
                row.description ? (
                  <TruncatedWithTooltip text={row.description} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              id: "tech",
              header: "Tech",
              sortable: false,
              hideOnMobile: true,
              className: "max-w-0",
              cell: (row) => {
                const tags = parseTechTags(row.tech);
                return tags.length > 0 ? (
                  <TruncatedWithTooltip text={tags.join(" · ")} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                );
              },
            },
            {
              id: "updatedAt",
              header: "Updated",
              headClassName: "w-[14%]",
              className: "w-[14%] whitespace-nowrap",
              cell: (row) => formatLocaleDate(row.updatedAt),
            },
          ]}
          mobileTitle={(row) => row.name || "Untitled project"}
          mobileSubtitle={(row) => row.description}
          dataTest="resume-projects-table"
          actions={(row) => (
            <RowActionButtons
              onEdit={() => setEditing(row)}
              onDelete={() => handleDelete(row.id)}
            />
          )}
        />
      ) : (
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
                onEdit={() => setEditing(row)}
                onDelete={() => handleDelete(row.id)}
              />
            );
          })}
        </LibraryEntityCardGrid>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Add a project to your library so any résumé can reuse it.
            </DialogDescription>
          </DialogHeader>
          <ProjectCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Changes apply to every résumé that uses this project.
            </DialogDescription>
          </DialogHeader>
          {editing ? <ProjectEditForm item={editing} onSuccess={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
