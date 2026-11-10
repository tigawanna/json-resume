import { EntityPickerSheet } from "@/components/entity-picker/EntityPickerSheet";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Library, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LinkRow {
  /** Library row id when the link exists, "" for a row not saved yet. */
  id: string;
  label: string;
  url: string;
  icon?: string;
}

type LinkPickerRow = { id: string; label: string; url: string; icon?: string | null };

export function LinksForm() {
  const { resume, updateLinks, searches } = useResumeWorkspace();
  const searchLinks = searches?.links;

  const [links, setLinks] = useState<LinkRow[]>(
    resume?.links.map((l) => ({
      id: l.id,
      label: l.label,
      url: l.url,
      icon: l.icon ?? undefined,
    })) ?? [],
  );

  const [pickOpen, setPickOpen] = useState(false);

  function savePromise(rows: LinkRow[]) {
    return updateLinks(rows.map(({ id: _id, ...link }) => link));
  }

  const saveMutation = useMutation({
    mutationFn: async (rows: LinkRow[]) => savePromise(rows),
    onSuccess() {
      toast.success("Links saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save links", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const pickMutation = useMutation({
    mutationFn: async ({ next, added }: { next: LinkRow[]; added: number }) => {
      await savePromise(next);
      return { added };
    },
    onSuccess({ added }) {
      toast.success(`Added ${added} link(s)`);
    },
    onError(err: unknown) {
      toast.error("Failed to add links", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  if (!resume) return null;

  function addLink() {
    setLinks((prev) => [...prev, { id: "", label: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLink(index: number, field: keyof LinkRow, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function pickExisting(rows: LinkPickerRow[]) {
    const picked = rows.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      icon: row.icon ?? undefined,
    }));
    setLinks((prev) => [...prev, ...picked]);
    pickMutation.mutate({ next: [...links, ...picked], added: picked.length });
  }

  return (
    <div className="flex flex-col gap-4" data-test="links-form">
      {links.map((link, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="w-32">
            <Label className="text-xs">Label</Label>
            <Input
              value={link.label}
              onChange={(e) => updateLink(index, "label", e.target.value)}
              placeholder="GitHub"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">URL</Label>
            <Input
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
          <div className="w-24">
            <Label className="text-xs">Icon</Label>
            <Input
              value={link.icon ?? ""}
              onChange={(e) => updateLink(index, "icon", e.target.value)}
              placeholder="github"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => removeLink(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Plus className="mr-1 size-3" /> Add Link
        </Button>
        {searchLinks && (
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
            <Library className="mr-1 size-3" /> Pick from Existing
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => saveMutation.mutate(links)}
          disabled={saveMutation.isPending}
        >
          Save Links
        </Button>
      </div>

      {searchLinks && (
        <EntityPickerSheet<LinkPickerRow>
          open={pickOpen}
          onOpenChange={setPickOpen}
          title="Pick from Existing Links"
          description="Attach links from your library. Editing them updates every résumé that uses them."
          searchPlaceholder="Search by label or URL…"
          multi
          attachedIds={links.map((link) => link.id).filter(Boolean)}
          getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "links", q]}
          getSearchQueryFn={(q) => () => searchLinks(q)}
          getItem={(link) => ({
            id: link.id,
            primary: link.label || link.url,
            secondary: link.label ? link.url : undefined,
          })}
          onPick={pickExisting}
        />
      )}
    </div>
  );
}
