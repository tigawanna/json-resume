import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { removeFromLayouts } from "@/data-access-layer/event-sourced/rows/resume-layout-rows";
import { newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type BulletDraft = {
  id: string | null;
  text: string;
};

interface ExperienceBulletsEditorProps {
  experienceId: string;
}

export function ExperienceBulletsEditor({ experienceId }: ExperienceBulletsEditorProps) {
  const db = useEventSourcedDb();
  const [pending, setPending] = useState(false);
  const { data: bullets, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ bullet: db.collections.resumeExperienceBullet })
        .where(({ bullet }) => eq(bullet.experienceId, experienceId))
        .orderBy(({ bullet }) => bullet.sortOrder),
    [experienceId],
  );

  // Local drafts synced from the live rows when they load. Edits stay local until Save.
  const [drafts, setDrafts] = useState<BulletDraft[] | null>(null);
  const currentDrafts: BulletDraft[] | null =
    drafts ?? (bullets ? bullets.map((b) => ({ id: b.id, text: b.text })) : null);

  function addBullet() {
    setDrafts([...(currentDrafts ?? []), { id: null, text: "" }]);
  }

  function removeBullet(index: number) {
    setDrafts((currentDrafts ?? []).filter((_, i) => i !== index));
  }

  function updateBullet(index: number, text: string) {
    setDrafts((currentDrafts ?? []).map((b, i) => (i === index ? { ...b, text } : b)));
  }

  function moveBullet(index: number, direction: -1 | 1) {
    const list = currentDrafts ?? [];
    const next = index + direction;
    if (next < 0 || next >= list.length) return;
    const copy = [...list];
    const current = copy[index];
    copy[index] = copy[next];
    copy[next] = current;
    setDrafts(copy);
  }

  function handleSave() {
    if (!currentDrafts) return;
    setPending(true);
    try {
      const live = db.collections.resumeExperienceBullet.toArray.filter(
        (b) => b.experienceId === experienceId,
      );
      const liveById = new Map(live.map((b) => [b.id, b]));
      const keptIds = new Set<string>();

      for (let i = 0; i < currentDrafts.length; i += 1) {
        const draft = currentDrafts[i];
        const text = draft.text.trim();
        if (!text) continue;
        const sortOrder = i;
        if (draft.id) {
          const existing = liveById.get(draft.id);
          if (!existing) continue;
          keptIds.add(existing.id);
          db.collections.resumeExperienceBullet.update(existing.id, (row) => {
            row.text = text;
            row.searchableText = text;
            row.sortOrder = sortOrder;
            row.updatedAt = nowMs();
          });
        } else {
          const id = newId();
          const ts = nowMs();
          db.collections.resumeExperienceBullet.insert({
            id,
            experienceId,
            text,
            sortOrder,
            searchableText: text,
            embedding: null,
            embeddingModel: null,
            createdAt: ts,
            updatedAt: ts,
          });
          keptIds.add(id);
        }
      }

      for (const bullet of live) {
        if (!keptIds.has(bullet.id)) {
          removeFromLayouts(db, [bullet.id]);
          db.collections.resumeExperienceBullet.delete(bullet.id);
        }
      }

      setDrafts(null);
      toast.success("Bullets saved");
    } catch (err: unknown) {
      toast.error("Failed to save bullets", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading || !currentDrafts) {
    return <RouterPendingComponent />;
  }

  const hasRequired =
    currentDrafts.some((b) => b.text.trim().length > 0) || currentDrafts.length === 0;

  return (
    <div className="flex flex-col gap-2" data-test="experience-bullets">
      <Label className="text-xs font-medium">Bullet points</Label>
      {currentDrafts.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No bullets yet — add points that prove impact for targeting roles.
        </p>
      ) : null}
      {currentDrafts.map((bullet, index) => (
        <div key={bullet.id ?? `new-${index}`} className="flex items-start gap-1">
          <div className="flex shrink-0 flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => moveBullet(index, -1)}
              disabled={index === 0}
              aria-label="Move bullet up"
            >
              <ArrowUp className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => moveBullet(index, 1)}
              disabled={index === currentDrafts.length - 1}
              aria-label="Move bullet down"
            >
              <ArrowDown className="size-3" />
            </Button>
          </div>
          <Textarea
            value={bullet.text}
            onChange={(event) => updateBullet(index, event.target.value)}
            rows={1}
            className="min-h-8 field-sizing-content py-1.5 text-sm"
            placeholder="Achievement or responsibility"
            data-test="experience-bullet"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={() => removeBullet(index)}
            aria-label="Remove bullet"
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBullet}
          data-test="experience-add-bullet"
        >
          <Plus className="mr-1 size-3" /> Add bullet
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={pending || !hasRequired}
          data-test="experience-save-bullets"
        >
          {pending ? "Saving…" : "Save bullets"}
        </Button>
      </div>
    </div>
  );
}
