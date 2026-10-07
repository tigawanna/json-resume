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
import {
  publishPublicResume,
  unpublishPublicResume,
} from "@/data-access-layer/public-resume/public-resume.functions";
import {
  myPublicResumeQueryOptions,
  publicResumeKeys,
} from "@/data-access-layer/public-resume/query-options";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe, GlobeLock, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

function publicResumeUrl(id: string): string {
  if (typeof window === "undefined") return `/r/${id}`;
  return `${window.location.origin}/r/${id}`;
}

interface PublishResumeButtonProps {
  sourceResumeId: string;
  title: string;
  document: ResumeDocumentV1;
  className?: string;
}

export function PublishResumeButton({
  sourceResumeId,
  title,
  document,
  className,
}: PublishResumeButtonProps) {
  const { viewer } = useViewer();
  const isAuthenticated = Boolean(viewer.user?.id);
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusQuery = useQuery({
    ...myPublicResumeQueryOptions(sourceResumeId),
    enabled: isAuthenticated,
  });

  const published = statusQuery.data ?? null;

  const publishMutation = useMutation({
    mutationFn: async () =>
      publishPublicResume({
        data: { sourceResumeId, title, document },
      }),
    onSuccess(data) {
      const wasPublished = Boolean(
        qc.getQueryData(myPublicResumeQueryOptions(sourceResumeId).queryKey),
      );
      qc.setQueryData(myPublicResumeQueryOptions(sourceResumeId).queryKey, data);
      void qc.invalidateQueries({ queryKey: publicResumeKeys.byId(data.id) });
      void qc.invalidateQueries({ queryKey: [...publicResumeKeys.all, "list"] });
      toast.success(wasPublished ? "Public link updated" : "Résumé is public");
      setDialogOpen(true);
    },
    onError(err: unknown) {
      toast.error("Could not publish résumé", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => unpublishPublicResume({ data: { sourceResumeId } }),
    onSuccess() {
      qc.setQueryData(myPublicResumeQueryOptions(sourceResumeId).queryKey, null);
      void qc.invalidateQueries({ queryKey: [...publicResumeKeys.all, "list"] });
      toast.success("Public link removed");
      setDialogOpen(false);
    },
    onError(err: unknown) {
      toast.error("Could not unpublish résumé", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err: unknown) {
      toast.error("Could not copy link", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className={twMerge("gap-2", className)}
        data-test="publish-resume-signin"
      >
        <Link to="/auth" search={{ returnTo: `/resumes/${sourceResumeId}` }}>
          <Globe className="size-4" />
          Sign in to share
        </Link>
      </Button>
    );
  }

  const busy = publishMutation.isPending || unpublishMutation.isPending;
  const shareUrl = published ? publicResumeUrl(published.id) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={twMerge("gap-2", className)}
        disabled={busy || statusQuery.isLoading}
        onClick={() => {
          if (published) {
            setDialogOpen(true);
            return;
          }
          void publishMutation.mutateAsync();
        }}
        data-test="publish-resume-btn"
      >
        {busy || statusQuery.isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : published ? (
          <Globe className="size-4" />
        ) : (
          <GlobeLock className="size-4" />
        )}
        {published ? "Public link" : "Make public"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-test="publish-resume-dialog">
          <DialogHeader>
            <DialogTitle>{published ? "Public link" : "Publishing…"}</DialogTitle>
            <DialogDescription>
              Anyone with this link can view and download a snapshot of this résumé. Publishing
              again refreshes the snapshot without changing the URL.
            </DialogDescription>
          </DialogHeader>

          {shareUrl ? (
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                data-test="publish-resume-url"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => void handleCopy(shareUrl)}
                data-test="publish-resume-copy"
                aria-label="Copy public link"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy || !published}
              onClick={() => void unpublishMutation.mutateAsync()}
              data-test="unpublish-resume-btn"
            >
              {unpublishMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Unpublish
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to="/public-resumes">Manage all</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void publishMutation.mutateAsync()}
                data-test="republish-resume-btn"
              >
                {publishMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Update snapshot
              </Button>
              <DialogClose asChild>
                <Button type="button" size="sm">
                  Done
                </Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
