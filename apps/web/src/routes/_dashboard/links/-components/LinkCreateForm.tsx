import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import {
  LINK_ICON_HINT,
  LINK_ICON_PLACEHOLDER,
  LINK_URL_HINT,
  LINK_URL_PLACEHOLDER,
  defaultLinkIconForUrl,
  normalizeLinkIcon,
  normalizeLinkUrl,
} from "@/modules/links/link-form";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { findExistingByExactTitle } from "../../-utils/find-existing";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";

const createOpts = formOptions({
  defaultValues: { label: "", icon: "", url: "" },
});

interface LinkCreateFormProps {
  onSuccess?: () => void;
}

export function LinkCreateForm({ onSuccess }: LinkCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const url = normalizeLinkUrl(value.url);
        if (!url.ok) {
          toast.error("Invalid link URL", { description: url.error });
          return;
        }
        const icon = normalizeLinkIcon(value.icon);
        if (!icon.ok) {
          toast.error("Invalid icon name", { description: icon.error });
          return;
        }
        const existing = findExistingByExactTitle(
          db.collections.resumeLink,
          value.label,
          (row) => row.label,
        );
        if (existing) {
          toast.success("Link already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const finalIcon = icon.icon || defaultLinkIconForUrl(url.url);
        const searchableText = joinSearchable(value.label, url.url, finalIcon);
        db.collections.resumeLink.insert({
          ...base,
          label: value.label,
          icon: finalIcon || null,
          url: url.url,
          searchableText,
        });
        toast.success("Link created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create link", {
          description: unwrapUnknownError(err).message,
        });
      } finally {
        setPending(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="label"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Label is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField
          name="icon"
          validators={{
            onChange: ({ value }) => {
              const result = normalizeLinkIcon(value ?? "");
              return result.ok ? undefined : result.error;
            },
          }}
        >
          {(field) => {
            const message = field.state.meta.errors[0];
            return (
              <div>
                <Label className="text-xs">Icon</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={LINK_ICON_PLACEHOLDER}
                  className="mt-1"
                />
                <p
                  className={`mt-1 text-[11px] ${message ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {message ?? LINK_ICON_HINT}
                </p>
              </div>
            );
          }}
        </form.AppField>
      </div>
      <form.AppField
        name="url"
        validators={{
          onChange: ({ value }) => {
            const result = normalizeLinkUrl(value ?? "");
            return result.ok ? undefined : result.error;
          },
        }}
      >
        {(field) => {
          const message = field.state.meta.errors[0];
          return (
            <div>
              <Label className="text-xs">URL</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={LINK_URL_PLACEHOLDER}
                className="mt-1"
              />
              <p
                className={`mt-1 text-[11px] ${message ? "text-destructive" : "text-muted-foreground"}`}
              >
                {message ?? LINK_URL_HINT}
              </p>
            </div>
          );
        }}
      </form.AppField>
      <form.Subscribe selector={(s) => s.canSubmit}>
        {(canSubmit) => {
          return (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={pending}
              >
                Reset
              </Button>
              <Button type="submit" disabled={pending || !canSubmit}>
                {pending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

interface LinkCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function LinkCreateFormDialog({ open, setOpen }: LinkCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Link</DialogTitle>
          <DialogDescription>
            Add a link to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <LinkCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
