import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeSkill, ResumeSkillGroup } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { count, useLiveQuery } from "@tanstack/react-db";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/library-resolve";
import { skillsUsedUnderGroup } from "../-utils/group-skills";
import { Plus, Wrench } from "lucide-react";
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
import { Route } from "..";
import { SkillGroupCreateForm, SkillGroupCreateFormDialog } from "./SkillGroupCreateForm";
import { SkillGroupEditForm } from "./SkillGroupEditForm";

const ROUTE_ID = "/_dashboard/skill-groups/" as const;

type SkillGroupRow = ResumeSkillGroup & { skills: ResumeSkill[] };

export function SkillGroupList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SkillGroupRow | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeSkillGroup}
      sortableColumns={createSortableColumns(db.collections.resumeSkillGroup, [
        { value: "name", label: "Name" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: groups, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeSkillGroup });
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.name, row.searchableText))
        : base;
      return filtered
        .orderBy(({ row }) => listOrderByRef(row, sortBy, "updatedAt"), sortDir)
        .limit(ADMIN_LIST_PER_PAGE)
        .offset(offset);
    },
    [keyword, offset, sortBy, sortDir],
  );
  const { data: skillRows } = useLiveQuery(
    (query) => query.from({ skill: db.collections.resumeSkill }),
    [],
  );
  const { data: resumeRows } = useLiveQuery(
    (query) => query.from({ resume: db.collections.resume }),
    [],
  );
  const items: SkillGroupRow[] = groups.map((group) => ({
    ...group,
    skills: skillsUsedUnderGroup(group.id, resumeRows, skillRows),
  }));

  const { data: totals } = useLiveQuery(
    (query) => {
      const base = query.from({ row: db.collections.resumeSkillGroup });
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.name, row.searchableText))
        : base;
      return filtered.select(({ row }) => ({ total: count(row.id) }));
    },
    [keyword],
  );

  const totalItems = totals?.[0]?.total ?? 0;
  const totalPages = totalPagesFromCount(totalItems);
  const hasSearch = keyword.length > 0;

  function handleDelete(groupId: string) {
    try {
      deleteWithReferences(db, "resumeSkillGroup", groupId);
      toast.success("Skill group deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <>
      <ImportFromLegacyButton importer="skill-groups" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-skill-groups-btn"
      >
        <Plus className="mr-1 size-4" /> Add
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Skills"
        description="Skill groups in your local library."
        searchPlaceholder="Search skill groups…"
        actions={actions}
        filters={filters}
        dataTest="skill-groups-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Skills"
        description="Skill groups in your local library."
        searchPlaceholder="Search skill groups…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="skill-groups-list-page"
      >
        <LibraryEmpty
          icon={Wrench}
          title="No Skill Groups Yet"
          description="You haven't added any skill groups yet. Create your first group to get started."
          actionLabel="Create Skill Group"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="skill-groups-empty"
        />
        <SkillGroupCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Skills"
      description="Skill groups in your local library."
      searchPlaceholder="Search skill groups…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="skill-groups-list-page"
    >
      <LibraryEntityCardGrid dataTest="skill-groups-table">
        {items.map((row) => (
          <LibraryEntityCard
            key={row.id}
            id={row.id}
            icon={Wrench}
            title={row.name}
            subtitle={
              row.skills.length > 0 ? row.skills.map((skill) => skill.name).join(", ") : undefined
            }
            body={`${row.skills.length} skill${row.skills.length === 1 ? "" : "s"}`}
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
            <DialogTitle>New Skill Group</DialogTitle>
          </DialogHeader>
          <SkillGroupCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Skill Group</DialogTitle>
          </DialogHeader>
          {editing ? (
            <SkillGroupEditForm group={editing} onSuccess={() => setEditing(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
