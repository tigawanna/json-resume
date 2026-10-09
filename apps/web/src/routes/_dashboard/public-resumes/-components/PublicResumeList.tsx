import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useViewer } from "@/data-access-layer/auth/viewer";
import type { PublicResumeListItemDTO } from "@/data-access-layer/public-resume/public-resume.types";
import {
  renamePublicResume,
  unpublishPublicResumeById,
} from "@/data-access-layer/public-resume/public-resume.functions";
import {
  myPublicResumesListQueryOptions,
  publicResumeKeys,
} from "@/data-access-layer/public-resume/query-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, FileText, Globe, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { LibraryEntityCard, LibraryEntityCardGrid } from "../../-components/LibraryEntityCard";
import { totalPagesFromCount } from "../../-utils/list-query";
import { Route } from "..";

const ROUTE_ID = "/_dashboard/public-resumes/" as const;

function publicResumeUrl(id: string): string {
  if (typeof window === "undefined") return `/r/${id}`;
  return `${window.location.origin}/r/${id}`;
}

export function PublicResumeList() {
  const { viewer } = useViewer();
  const isAuthenticated = Boolean(viewer.user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const { page = 1, q = "" } = search;
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const keyword = q.trim();
  const [renaming, setRenaming] = useState<PublicResumeListItemDTO | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listQuery = useQuery({
    ...myPublicResumesListQueryOptions({
      keyword: keyword || undefined,
      page,
      limit: ADMIN_LIST_PER_PAGE,
    }),
    enabled: isAuthenticated,
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => unpublishPublicResumeById({ data: { id } }),
    onSuccess(_data, id) {
      void qc.invalidateQueries({ queryKey: publicResumeKeys.all });
      toast.success("Unpublished");
      qc.removeQueries({ queryKey: publicResumeKeys.byId(id) });
    },
    onError(err: unknown) {
      toast.error("Could not unpublish", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (input: { id: string; title: string }) => renamePublicResume({ data: input }),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: publicResumeKeys.all });
      toast.success("Title updated");
      setRenaming(null);
    },
    onError(err: unknown) {
      toast.error("Could not rename", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  async function handleCopy(id: string) {
    try {
      await navigator.clipboard.writeText(publicResumeUrl(id));
      setCopiedId(id);
      toast.success("Link copied");
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch (err: unknown) {
      toast.error("Could not copy link", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-full w-full flex-col gap-4" data-test="public-resumes-signin">
        <h1 className="text-2xl font-bold tracking-tight">Public résumés</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to see résumés you have published for sharing.
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to="/auth" search={{ returnTo: "/public-resumes" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  const items = listQuery.data?.items ?? [];
  const totalItems = listQuery.data?.total ?? 0;
  const totalPages = totalPagesFromCount(totalItems);
  const hasSearch = keyword.length > 0;

  const renameDialog = (
    <Dialog
      open={Boolean(renaming)}
      onOpenChange={(open) => {
        if (!open) setRenaming(null);
      }}
    >
      <DialogContent className="sm:max-w-md" data-test="rename-public-resume-dialog">
        <DialogHeader>
          <DialogTitle>Rename public listing</DialogTitle>
          <DialogDescription>
            Choose the name shown for this résumé on its public listing.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={renameTitle}
          onChange={(e) => setRenameTitle(e.target.value)}
          placeholder="Listing title"
          data-test="rename-public-resume-input"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!renameTitle.trim() || renameMutation.isPending}
            onClick={() => {
              if (!renaming) return;
              void renameMutation.mutateAsync({
                id: renaming.id,
                title: renameTitle.trim(),
              });
            }}
            data-test="rename-public-resume-save"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (listQuery.isLoading) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Public résumés"
        description="Snapshots you published for sharing. Managed on the server — not via local-first sync."
        searchPlaceholder="Search public résumés…"
        dataTest="public-resumes-list-page"
      >
        <RouterPendingComponent />
        {renameDialog}
      </EventSourcedListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <EventSourcedListScaffold
        routeID={ROUTE_ID}
        title="Public résumés"
        description="Snapshots you published for sharing. Managed on the server — not via local-first sync."
        searchPlaceholder="Search public résumés…"
        totalPages={0}
        dataTest="public-resumes-list-page"
      >
        <LibraryEmpty
          icon={Globe}
          title="No public résumés"
          description="Open a résumé and choose Make public to publish a shareable snapshot."
          actionLabel="Go to résumés"
          onAction={() => void navigate({ to: "/resumes" })}
          hasSearch={hasSearch}
          onClearSearch={clearSearch}
          dataTest="public-resumes-empty"
        />
        {renameDialog}
      </EventSourcedListScaffold>
    );
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Public résumés"
      description="Snapshots you published for sharing. Managed on the server — not via local-first sync."
      searchPlaceholder="Search public résumés…"
      totalPages={totalPages}
      dataTest="public-resumes-list-page"
    >
      <LibraryEntityCardGrid dataTest="public-resumes-table">
        {items.map((row) => (
          <LibraryEntityCard
            key={row.id}
            id={row.id}
            icon={Globe}
            title={row.title}
            subtitle={row.headline || undefined}
            updatedAt={
              row.updatedAt instanceof Date ? row.updatedAt.getTime() : Number(row.updatedAt)
            }
            identity={<span className="font-mono text-[11px]">{row.id}</span>}
            onClick={() => {
              window.open(`/r/${row.id}`, "_blank", "noopener,noreferrer");
            }}
            actions={
              <div className="flex items-center justify-end gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => void handleCopy(row.id)}
                  data-test="public-resume-copy-btn"
                  aria-label="Copy public link"
                >
                  {copiedId === row.id ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  asChild
                  data-test="public-resume-open-btn"
                >
                  <a
                    href={`/r/${row.id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open public page"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    void navigate({
                      to: "/resumes/$resumeId",
                      params: { resumeId: row.sourceResumeId },
                      search: { tab: "edit" },
                    })
                  }
                  data-test="public-resume-source-btn"
                  aria-label="Open source résumé"
                >
                  <FileText className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setRenaming(row);
                    setRenameTitle(row.title);
                  }}
                  data-test="public-resume-rename-btn"
                  aria-label="Rename listing"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8"
                  disabled={unpublishMutation.isPending}
                  onClick={() => void unpublishMutation.mutateAsync(row.id)}
                  data-test="public-resume-unpublish-btn"
                  aria-label="Unpublish"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            }
          />
        ))}
      </LibraryEntityCardGrid>
      {renameDialog}
    </EventSourcedListScaffold>
  );
}
