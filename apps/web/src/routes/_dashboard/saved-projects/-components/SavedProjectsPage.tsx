import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { savedProjectsCollection } from "@/data-access-layer/saved-project/saved-project.collection";
import type { SavedProjectRow } from "@/data-access-layer/saved-project/saved-project.server";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Edit, ExternalLink, Loader, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import {
  listOrderByRef,
  listSortDirection,
  orIlike,
} from "../../-utils/list-query";
import { Route } from "..";
import { SavedProjectEditForm } from "./SavedProjectEditForm";

export type SavedProject = SavedProjectRow;

const ROUTE_ID = "/_dashboard/saved-projects/" as const;

const sortableColumns = createSortableColumns(savedProjectsCollection, [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
]);

export function SavedProjectsPage() {
  const { q = "", sortBy, sortDirection } = Route.useSearch();
  const { inputValue, onSearchChange } = usePageSearchQuery(ROUTE_ID);

  const keyword = q.trim();
  const sortDir = listSortDirection(sortDirection);

  const { data: projects, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ row: savedProjectsCollection });
      const filtered = keyword
        ? base.where(({ row }) => orIlike(keyword, row.name, row.description, row.tech))
        : base;
      return filtered.orderBy(({ row }) => listOrderByRef(row, sortBy, "createdAt"), sortDir);
    },
    [keyword, sortBy, sortDir],
  );

  const items = projects ?? [];

  return (
    <div className="space-y-6" data-test="saved-projects-page">
      <div>
        <h1 className="text-3xl font-bold">Saved Projects</h1>
        <p className="text-muted-foreground">
          Manage your shortlisted projects. Edit descriptions, tags, or remove projects.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, description, or tech..."
          value={inputValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-md"
          data-test="saved-projects-search"
        />
        <EventSourcedSortToolbar
          collection={savedProjectsCollection}
          sortableColumns={sortableColumns}
          defaultSortBy="createdAt"
          defaultSortDirection="desc"
        />
      </div>

      {isLoading ? (
        <RouterPendingComponent />
      ) : items.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 size-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {keyword
                ? "No projects match your search"
                : "No saved projects yet. Start by browsing your GitHub repositories."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((project) => (
            <SavedProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedProjectCard({ project }: { project: SavedProject }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      savedProjectsCollection.utils.writeDelete(project.id);
    },
    onSuccess() {
      toast.success("Project removed", {
        description: "Removed from your saved projects",
      });
    },
    onError(err: unknown) {
      toast.error("Failed to remove project", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const tech = (() => {
    try {
      return typeof project.tech === "string" ? JSON.parse(project.tech) : project.tech || [];
    } catch {
      return [];
    }
  })();

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 truncate text-lg font-semibold hover:text-primary hover:underline"
                title={project.name}
              >
                {project.name}
                <ExternalLink className="size-4" />
              </a>
              {project.description ? (
                <CardDescription className="mt-1 line-clamp-2">
                  {project.description}
                </CardDescription>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader className="size-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="mr-2 size-4" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {Array.isArray(tech) && tech.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tech.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}

            {project.homepageUrl ? (
              <div>
                <a
                  href={project.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Visit Homepage
                  <ExternalLink className="size-3" />
                </a>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {editDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Project</CardTitle>
            </CardHeader>
            <CardContent>
              <SavedProjectEditForm project={project} onSuccess={() => setEditDialogOpen(false)} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
