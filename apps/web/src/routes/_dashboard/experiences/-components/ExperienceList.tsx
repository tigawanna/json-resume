import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
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
import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { Briefcase, Plus } from "lucide-react";
import { useState } from "react";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import { ImportFromLegacyButton } from "../../-components/ImportFromLegacyButton";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import {
  listOffset,
  listOrderByRef,
  listSortDirection,
  orIlike,
  totalPagesFromCount,
} from "../../-utils/list-query";
import { Route } from "..";
import { companyGroupKey } from "../-utils/split-company";
import { ExperienceCreateForm, ExperienceCreateFormDialog } from "./ExperienceCreateForm";
import { type ExperienceGroupData } from "./ExperienceGroup";
import { ExperienceTimelineItem } from "./ExperienceTimelineItem";

const ROUTE_ID = "/_dashboard/experiences/" as const;

function groupKey(experience: ResumeExperience) {
  return companyGroupKey(experience.company, experience.startDate, experience.endDate);
}

function groupExperiences(rows: ResumeExperience[]): ExperienceGroupData[] {
  const groupsByKey = new Map<string, ExperienceGroupData>();
  for (const row of rows) {
    const key = groupKey(row);
    const existing = groupsByKey.get(key);
    if (existing) {
      existing.titles.push(row);
    } else {
      groupsByKey.set(key, {
        key,
        company: row.company,
        startDate: row.startDate,
        endDate: row.endDate,
        titles: [row],
        groupId: row.id,
      });
    }
  }
  return [...groupsByKey.values()];
}

export function ExperienceList() {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const resumeFilter = useResumeFilter(ROUTE_ID);
  const libraryIds = resumeFilter.libraryIds("experiences");
  const [createOpen, setCreateOpen] = useState(false);

  const keyword = q.trim();
  const offset = listOffset(page);

  const sortDir = listSortDirection(sortDirection);
  const filters = (
    <EventSourcedSortToolbar
      collection={db.collections.resumeExperience}
      sortableColumns={createSortableColumns(db.collections.resumeExperience, [
        { value: "role", label: "Role" },
        { value: "company", label: "Company" },
        { value: "location", label: "Location" },
        { value: "startDate", label: "Start" },
        { value: "endDate", label: "End" },
        { value: "updatedAt", label: "Updated" },
      ])}
      defaultSortBy="updatedAt"
    />
  );

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const all = query.from({ row: db.collections.resumeExperience });
      const base = libraryIds ? all.where(({ row }) => inArray(row.id, libraryIds)) : all;
      const filtered = keyword
        ? base.where(({ row }) =>
            orIlike(
              keyword,
              row.role,
              row.company,
              row.location,
              row.startDate,
              row.endDate,
              row.searchableText,
            ),
          )
        : base;
      return filtered.orderBy(({ row }) => listOrderByRef(row, sortBy, "startDate"), sortDir);
    },
    [keyword, sortBy, sortDir, libraryIds?.join(",")],
  );

  const groups = groupExperiences(items);
  const totalGroups = groups.length;
  const pagedGroups = groups.slice(offset, offset + ADMIN_LIST_PER_PAGE);
  const totalPages = totalPagesFromCount(totalGroups);
  const hasSearch = keyword.length > 0 || resumeFilter.active;

  const actions = (
    <>
      <ImportFromLegacyButton importer="experiences" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
        data-test="add-experiences-btn"
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
        title="Experiences"
        description="Work experiences in your local library."
        searchPlaceholder="Search experiences…"
        actions={actions}
        filters={filters}
        dataTest="experiences-list-page"
      >
        <RouterPendingComponent />
      </EventSourcedListScaffold>
    );
  }

  if (groups.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        resumeFilter
        title="Experiences"
        description="Work experiences in your local library."
        searchPlaceholder="Search experiences…"
        totalPages={0}
        actions={actions}
        filters={filters}
        dataTest="experiences-list-page"
      >
        <LibraryEmpty
          icon={Briefcase}
          title="No Experiences Yet"
          description="You haven't added any experiences yet. Create your first entry to get started."
          actionLabel="Create Experience"
          onAction={() => setCreateOpen(true)}
          hasSearch={hasSearch}
          onClearSearch={resumeFilter.clearAll}
          dataTest="experiences-empty"
        />
        <ExperienceCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      resumeFilter
      title="Experiences"
      description="Work experiences in your local library."
      searchPlaceholder="Search experiences…"
      totalPages={totalPages}
      actions={actions}
      filters={filters}
      dataTest="experiences-list-page"
    >
      <ul className="relative grid gap-4" data-test="experiences-table">
        {pagedGroups.map((group) => (
          <ExperienceTimelineItem key={group.key} group={group} />
        ))}
      </ul>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Experience</DialogTitle>
            <DialogDescription>
              Add an experience to your library so any résumé can reuse it. Company and period are
              set here and will be fixed afterwards.
            </DialogDescription>
          </DialogHeader>
          <ExperienceCreateForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </EventSourcedListScaffold>
  );
}
