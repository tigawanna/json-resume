import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, List, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatLibraryDateRange } from "../../../-components/LibraryEntityCard";
import { joinSearchable, libraryRowBase, touchUpdatedAt } from "../../../-utils/row-helpers";
import { companyGroupKey, splitCompanyHint } from "../../-utils/split-company";
import { ExperienceTitleEditor } from "../../-components/ExperienceTitleEditor";
import { ExperienceUniqueBullets } from "./ExperienceUniqueBullets";

interface ExperienceDetailPageProps {
  experienceId: string;
}

export function ExperienceDetailPage({ experienceId }: ExperienceDetailPageProps) {
  const db = useEventSourcedDb();
  const navigate = useNavigate();
  const { viewer } = useViewer();
  // TODO : Unslopify this componet and experince fetaure in gebral
  const [newTitle, setNewTitle] = useState("");
  const [pendingAddTitle, setPendingAddTitle] = useState(false);
  const [pendingIdentity, setPendingIdentity] = useState(false);
  const [companyDraft, setCompanyDraft] = useState("");
  const [startDraft, setStartDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [identitySeed, setIdentitySeed] = useState<string | null>(null);
  const [view, setView] = useState<"titles" | "unique">("titles");

  const { data: anchorData, isLoading: anchorLoading } = useLiveQuery(
    (query) =>
      query
        .from({ experience: db.collections.resumeExperience })
        .where(({ experience }) => eq(experience.id, experienceId)),
    [experienceId],
  );
  const anchor = anchorData?.[0];

  const { data: allExperiences, isLoading: allLoading } = useLiveQuery(
    (query) => query.from({ experience: db.collections.resumeExperience }),
    [],
  );

  const isLoading = anchorLoading || allLoading;

  function handleDeleteTitle(id: string) {
    try {
      deleteWithReferences(db, "resumeExperience", id);
      toast.success("Experience deleted");
      if (id === experienceId) {
        void navigate({ to: "/experiences" });
      }
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  function handleDeleteGroup(titles: ResumeExperience[]) {
    try {
      for (const title of titles) {
        deleteWithReferences(db, "resumeExperience", title.id);
      }
      toast.success("Experience deleted");
      void navigate({ to: "/experiences" });
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  if (isLoading) {
    return <RouterPendingComponent />;
  }

  if (!anchor) {
    return (
      <Empty className="border-border/40 border" data-test="experience-not-found">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Briefcase />
          </EmptyMedia>
          <EmptyTitle>Experience not found</EmptyTitle>
          <EmptyDescription>
            This company and period doesn&apos;t exist or may have been deleted.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/experiences" data-test="experience-not-found-back">
              <ArrowLeft className="size-4" />
              Back to experiences
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const anchorKey = companyGroupKey(anchor.company, anchor.startDate, anchor.endDate);
  const groupTitles = (allExperiences ?? [])
    .filter((row) => companyGroupKey(row.company, row.startDate, row.endDate) === anchorKey)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);

  const { name: companyName, hint } = splitCompanyHint(anchor.company);
  const dateRange = formatLibraryDateRange(anchor.startDate, anchor.endDate);
  const nextIdentitySeed = `${anchor.id}:${anchor.company}:${anchor.startDate}:${anchor.endDate}`;
  if (nextIdentitySeed !== identitySeed) {
    setIdentitySeed(nextIdentitySeed);
    setCompanyDraft(companyName);
    setStartDraft(anchor.startDate);
    setEndDraft(anchor.endDate);
  }

  function handleSaveIdentity() {
    const name = companyDraft.trim();
    if (!name) return;
    const company = hint ? `${name} (${hint})` : name;
    const startDate = startDraft.trim();
    const endDate = endDraft.trim();
    setPendingIdentity(true);
    try {
      for (const title of groupTitles) {
        db.collections.resumeExperience.update(title.id, (draft) => {
          draft.company = company;
          draft.startDate = startDate;
          draft.endDate = endDate;
          draft.searchableText = joinSearchable(
            draft.role,
            company,
            draft.location,
            startDate,
            endDate,
          );
          draft.updatedAt = touchUpdatedAt();
        });
      }
      toast.success("Company and period saved");
    } catch (err: unknown) {
      toast.error("Failed to save company and period", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setPendingIdentity(false);
    }
  }

  function handleAddTitle() {
    const title = newTitle.trim();
    if (!title) return;
    setPendingAddTitle(true);
    try {
      const base = libraryRowBase(viewer.user?.id);
      const searchableText = joinSearchable(
        title,
        anchor.company,
        anchor.location,
        anchor.startDate,
        anchor.endDate,
      );
      db.collections.resumeExperience.insert({
        ...base,
        role: title,
        company: anchor.company,
        startDate: anchor.startDate,
        endDate: anchor.endDate,
        location: anchor.location,
        searchableText,
      });
      setNewTitle("");
      toast.success("Title added for this period");
    } catch (err: unknown) {
      toast.error("Failed to add title", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setPendingAddTitle(false);
    }
  }

  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4"
      data-test="experience-detail-page"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Button asChild variant="ghost" size="icon-sm">
            <Link
              to="/experiences"
              aria-label="Back to experiences"
              data-test="experience-detail-back"
            >
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{companyName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{dateRange || "—"}</span>
              {hint ? <Badge variant="secondary">{hint}</Badge> : null}
              <span>
                {groupTitles.length} {groupTitles.length === 1 ? "title" : "titles"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Titles and bullets belong to this company and period.
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive shrink-0"
              aria-label="Delete experience period"
              data-test="experience-delete"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this company and period?</AlertDialogTitle>
              <AlertDialogDescription>
                Every title and bullet for {companyName} {dateRange ? `· ${dateRange}` : ""} is
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="sm" variant="outline">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteGroup(groupTitles)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <section
        className="flex flex-col gap-3 rounded-lg border border-border/60 bg-base-200/40 p-3"
        aria-label="Company and period"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs" htmlFor="experience-company">
              Company
            </Label>
            <Input
              id="experience-company"
              value={companyDraft}
              onChange={(event) => setCompanyDraft(event.target.value)}
              className="mt-1"
              data-test="experience-company-input"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="experience-start">
              Start
            </Label>
            <Input
              id="experience-start"
              value={startDraft}
              onChange={(event) => setStartDraft(event.target.value)}
              placeholder="2020-01"
              className="mt-1"
              data-test="experience-start-input"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="experience-end">
              End
            </Label>
            <Input
              id="experience-end"
              value={endDraft}
              onChange={(event) => setEndDraft(event.target.value)}
              placeholder="Present"
              className="mt-1"
              data-test="experience-end-input"
            />
          </div>
        </div>
        {hint ? (
          <p className="text-muted-foreground text-[11px]">
            Work hint kept beside the name: <Badge variant="outline">{hint}</Badge>
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={pendingIdentity || !companyDraft.trim()}
          onClick={handleSaveIdentity}
          data-test="experience-save-identity"
        >
          {pendingIdentity ? "Saving…" : "Save company and period"}
        </Button>
      </section>

      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === "titles" || value === "unique") setView(value);
        }}
        className="w-fit gap-0"
        data-test="experience-view-toggle"
      >
        <TabsList aria-label="Experience detail view">
          <TabsTrigger value="titles" data-test="experience-view-titles">
            <Briefcase />
            Titles
          </TabsTrigger>
          <TabsTrigger value="unique" data-test="experience-view-unique">
            <List />
            Unique bullets
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "titles" ? (
        <section className="flex flex-col gap-3" aria-label="Titles and bullets for this period">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Titles & bullets — {groupTitles.length} {groupTitles.length === 1 ? "title" : "titles"}
          </h2>
          {groupTitles.map((title) => (
            <div key={title.id} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Title · {title.role}</p>
              <ExperienceTitleEditor
                experience={title}
                onDelete={() => handleDeleteTitle(title.id)}
              />
            </div>
          ))}
        </section>
      ) : (
        <ExperienceUniqueBullets titles={groupTitles} />
      )}

      <section
        className="flex flex-col gap-2 rounded-lg border border-border/60 p-3"
        aria-label="Add title for this period"
      >
        <Label className="text-xs font-medium">Add title for this period</Label>
        <p className="text-muted-foreground text-[11px]">
          Add another title for {companyName} {dateRange ? `· ${dateRange}` : ""} when targeting a
          different role.
        </p>
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="e.g. Senior Engineer"
            className="flex-1"
            data-test="experience-new-title"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTitle}
            disabled={pendingAddTitle || !newTitle.trim()}
            data-test="experience-add-title-btn"
          >
            <Plus className="mr-1 size-3" /> Add
          </Button>
        </div>
      </section>
    </div>
  );
}
