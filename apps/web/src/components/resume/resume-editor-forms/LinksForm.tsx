import { EntityPickerSheet } from "@/components/entity-picker/EntityPickerSheet";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import type { LinkDraft } from "@/components/resume/resume-workspace/resume-workspace-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import {
  LINK_ICON_HINT,
  LINK_ICON_PLACEHOLDER,
  LINK_URL_HINT,
  LINK_URL_PLACEHOLDER,
  defaultLinkIconForUrl,
  normalizeLinkIcon,
  normalizeLinkUrl,
} from "@/modules/links/link-form";
import { Library, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AutosaveStatus, useResumeAutosave } from "./use-resume-autosave";

interface LinkRow {
  /** Library row id when the link exists, "" for a row not saved yet. */
  id: string;
  label: string;
  url: string;
  icon?: string;
}

type LinkPickerRow = { id: string; label: string; url: string; icon?: string | null };

function linkContent(rows: LinkRow[]) {
  return rows.map(({ label, url, icon }) => ({ label, url, icon: icon ?? "" }));
}

function linkDrafts(rows: LinkRow[]): { ok: true; drafts: LinkDraft[] } | { ok: false } {
  const drafts: LinkDraft[] = [];
  for (const link of rows) {
    const url = normalizeLinkUrl(link.url);
    if (!url.ok) return { ok: false };
    const icon = normalizeLinkIcon(link.icon ?? "");
    if (!icon.ok) return { ok: false };
    drafts.push({
      label: link.label,
      url: url.url,
      icon: icon.icon || defaultLinkIconForUrl(url.url),
    });
  }
  return { ok: true, drafts };
}

export function LinksForm() {
  const { resume, updateLinks, searches } = useResumeWorkspace();
  const searchLinks = searches?.links;
  const saved =
    resume?.links.map((l) => ({
      id: l.id,
      label: l.label,
      url: l.url,
      icon: l.icon ?? undefined,
    })) ?? [];
  const savedKey = JSON.stringify(saved);

  const [links, setLinks] = useState<LinkRow[]>(saved);
  const [pickOpen, setPickOpen] = useState(false);
  const drafts = linkDrafts(links);
  const savedDrafts = linkContent(saved);
  const savedDraftsKey = JSON.stringify(savedDrafts);
  const draftKey = drafts.ok ? JSON.stringify(drafts.drafts) : JSON.stringify(linkContent(links));

  useEffect(() => {
    if (!drafts.ok || draftKey !== savedDraftsKey) return;
    if (JSON.stringify(links) !== savedKey) setLinks(saved);
  }, [savedKey, savedDraftsKey, draftKey, drafts.ok, links, saved]);

  const status = useResumeAutosave({
    fingerprint: draftKey,
    savedFingerprint: savedDraftsKey,
    canSave: drafts.ok,
    save: () => {
      const next = linkDrafts(links);
      if (!next.ok) return Promise.resolve();
      return updateLinks(next.drafts);
    },
  });

  if (!resume) return null;

  function addLink() {
    setLinks((prev) => [...prev, { id: "", label: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLink(index: number, field: keyof LinkRow, value: string) {
    setLinks((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        // typing a URL suggests the matching icon while the field is still empty
        if (field === "url" && !l.icon) {
          const suggested = defaultLinkIconForUrl(value);
          return suggested ? { ...l, url: value, icon: suggested } : { ...l, url: value };
        }
        return { ...l, [field]: value };
      }),
    );
  }

  function pickExisting(rows: LinkPickerRow[]) {
    const picked = rows.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      icon: row.icon ?? undefined,
    }));
    setLinks((prev) => [...prev, ...picked]);
    toast.success(`Added ${picked.length} link(s)`);
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
              placeholder={LINK_URL_PLACEHOLDER}
            />
          </div>
          <div className="w-24">
            <Label className="text-xs">Icon</Label>
            <Input
              value={link.icon ?? ""}
              onChange={(e) => updateLink(index, "icon", e.target.value)}
              placeholder={LINK_ICON_PLACEHOLDER}
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
      </div>
      <AutosaveStatus status={status} blocked={drafts.ok ? undefined : "Add a valid URL to save"} />
      <p className="text-muted-foreground text-[11px]">
        {LINK_URL_HINT} Icon: {LINK_ICON_HINT}
      </p>

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
