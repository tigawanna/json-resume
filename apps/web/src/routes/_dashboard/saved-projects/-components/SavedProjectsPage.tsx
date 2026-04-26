import {
  getSavedProjects,
  unsaveGithubProject,
} from "@/data-access-layer/saved-project/saved-project.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Edit, AlertCircle, Loader, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { unwrapUnknownError } from "@/utils/errors";
import { SavedProjectEditForm } from "./SavedProjectEditForm";

const savedProjectsQueryOptions = queryOptions({
  queryKey: ["saved-projects"],
  queryFn: () => getSavedProjects(),
});

export type SavedProject = Awaited<ReturnType<typeof getSavedProjects>>[number];

export function SavedProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const query = useSuspenseQuery(savedProjectsQueryOptions);
  const projects = query.data || [];

  const filteredProjects = projects.filter((p: SavedProject) => {
    const query_lower = searchQuery.toLowerCase();
    const tech = (() => {
      try {
        return typeof p.tech === "string" ? JSON.parse(p.tech) : p.tech || [];
      } catch {
        return [];
      }
    })();
    return (
      p.name?.toLowerCase().includes(query_lower) ||
      p.description?.toLowerCase().includes(query_lower) ||
      (Array.isArray(tech) && tech.some?.((t: string) => t.toLowerCase().includes(query_lower)))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Saved Projects</h1>
        <p className="text-muted-foreground">
          Manage your shortlisted projects. Edit descriptions, tags, or remove projects.
        </p>
      </div>

      <Input
        placeholder="Search by name, description, or tech..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="grid gap-4">
        {filteredProjects.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {projects.length === 0
                  ? "No saved projects yet. Start by browsing your GitHub repositories."
                  : "No projects match your search"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project: SavedProject) => (
            <SavedProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}

function SavedProjectCard({ project }: { project: SavedProject }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await unsaveGithubProject({ data: { url: project.url } });
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
    meta: {
      invalidates: [["saved-projects"]],
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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold hover:text-primary hover:underline truncate inline-flex items-center gap-2"
                title={project.name}
              >
                {project.name}
                <ExternalLink className="w-4 h-4" />
              </a>
              {project.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {project.description}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Tech tags */}
            {tech.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tech.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {/* Homepage link */}
            {project.homepageUrl && (
              <div>
                <a
                  href={project.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Visit Homepage
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Project</CardTitle>
            </CardHeader>
            <CardContent>
              <SavedProjectEditForm project={project} onSuccess={() => setEditDialogOpen(false)} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
