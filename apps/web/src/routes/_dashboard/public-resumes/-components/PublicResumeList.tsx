import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { ResourceCardActions } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
import type { PublicResumeListItemDto } from "@/services/nest/generated/models";
import {
  publicResumeControllerRename,
  publicResumeControllerUnpublishById,
} from "@/services/nest/client";
import {
  myPublicResumesListQueryOptions,
  publicResumeKeys,
} from "@/data-access-layer/public-resume/query-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { AppConfig } from "@/utils/system";
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
  const [renaming, setRenaming] = useState<PublicResumeListItemDto | null>(null);
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
    mutationFn: async (id: string) => publicResumeControllerUnpublishById({ path: { id } }),
    onSuccess(_data, id) {
      toast.success("Unpublished");
      qc.removeQueries({ queryKey: publicResumeKeys.byId(id) });
    },
    onError(err: unknown) {
      toast.error("Could not unpublish", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [publicResumeKeys.all] },
  });

  const renameMutation = useMutation({
    mutationFn: async (input: { id: string; title: string }) =>
      publicResumeControllerRename({ path: { id: input.id }, body: { title: input.title } }),
    onSuccess() {
      toast.success("Title updated");
      setRenaming(null);
    },
    onError(err: unknown) {
      toast.error("Could not rename", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [publicResumeKeys.all] },
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
      <div
        className="flex min-h-full w-full flex-1 items-center justify-center px-4 py-16"
        data-test="public-resumes-signin"
      >
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <AppConfig.icon className="size-12 text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium tracking-tight">{AppConfig.wordmark}</p>
            <h1 className="text-2xl font-bold tracking-tight">Public résumés</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to see résumés you have published for sharing.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/auth" search={{ returnTo: "/public-resumes" }}>
              Sign in
            </Link>
          </Button>
        </div>
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
            updatedAt={new Date(row.updatedAt).getTime()}
            identity={<span className="font-mono text-[11px]">{row.id}</span>}
            onClick={() => {
              window.open(`/r/${row.id}`, "_blank", "noopener,noreferrer");
            }}
            actions={
              <ResourceCardActions label="Public résumé actions">
                <DropdownMenuItem
                  onSelect={() => void handleCopy(row.id)}
                  data-test="public-resume-copy-btn"
                >
                  {copiedId === row.id ? (
                    <Check className="text-muted-foreground" />
                  ) : (
                    <Copy className="text-muted-foreground" />
                  )}
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    window.open(`/r/${row.id}`, "_blank", "noopener,noreferrer");
                  }}
                  data-test="public-resume-open-btn"
                >
                  <ExternalLink className="text-muted-foreground" /> Open public page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    void navigate({
                      to: "/resumes/$resumeId",
                      params: { resumeId: row.sourceResumeId },
                      search: { tab: "edit" },
                    })
                  }
                  data-test="public-resume-source-btn"
                >
                  <FileText className="text-muted-foreground" /> Open source résumé
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setRenaming(row);
                    setRenameTitle(row.title);
                  }}
                  data-test="public-resume-rename-btn"
                >
                  <Pencil className="text-muted-foreground" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={unpublishMutation.isPending}
                  onSelect={() => void unpublishMutation.mutateAsync(row.id)}
                  data-test="public-resume-unpublish-btn"
                >
                  <Trash2 /> Unpublish
                </DropdownMenuItem>
              </ResourceCardActions>
            }
          />
        ))}
      </LibraryEntityCardGrid>
      {renameDialog}
    </EventSourcedListScaffold>
  );
}
