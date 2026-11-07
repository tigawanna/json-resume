import { Badge } from "@/components/ui/badge";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { ListChecks } from "lucide-react";
import type { ReactNode } from "react";

interface ExperienceUniqueBulletsProps {
  /** Titles of the open company + period group, in display order. */
  titles: ResumeExperience[];
}

/**
 * Every bullet of the group listed once by id, no matter how many titles point
 * at it, so the user and the assistant act on bullets instead of chasing them
 * across titles.
 */
export function ExperienceUniqueBullets({ titles }: ExperienceUniqueBulletsProps) {
  const db = useEventSourcedDb();
  const titleIds = titles.map((title) => title.id);
  const titleIdsKey = titleIds.join(",");
  const roleById = new Map(titles.map((title) => [title.id, title.role]));

  const { data: bullets, isLoading } = useLiveQuery(
    (query) =>
      titleIds.length === 0
        ? undefined
        : query
            .from({ bullet: db.collections.resumeExperienceBullet })
            .where(({ bullet }) => inArray(bullet.experienceId, titleIds)),
    [titleIdsKey],
  );

  // Ordered by title, then bullet order; one row per id even if referenced twice.
  const ordered = titles.flatMap((title) =>
    (bullets ?? [])
      .filter((bullet) => bullet.experienceId === title.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const seen = new Set<string>();
  const titleIdsByBullet = new Map<string, Set<string>>();
  const unique: typeof ordered = [];
  for (const bullet of ordered) {
    const owners = titleIdsByBullet.get(bullet.id) ?? new Set<string>();
    owners.add(bullet.experienceId);
    titleIdsByBullet.set(bullet.id, owners);
    if (seen.has(bullet.id)) continue;
    seen.add(bullet.id);
    unique.push(bullet);
  }

  let bulletList: ReactNode;
  if (isLoading) {
    bulletList = <p className="text-xs text-muted-foreground">Loading bullets…</p>;
  } else if (unique.length === 0) {
    bulletList = (
      <p className="text-xs text-muted-foreground">
        No bullets in this period yet — add them under a title.
      </p>
    );
  } else {
    bulletList = (
      <ul className="flex flex-col gap-1.5">
        {unique.map((bullet) => {
          const owners = [...(titleIdsByBullet.get(bullet.id) ?? [])];
          return (
            <li
              key={bullet.id}
              data-test="experience-unique-bullet"
              className="flex items-start gap-2 rounded-md bg-base-200/40 px-3 py-2"
            >
              <p className="min-w-0 flex-1 text-sm wrap-break-word">{bullet.text}</p>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {owners.map((ownerId) => (
                  <Badge key={ownerId} variant="outline" className="text-[10px]">
                    {roleById.get(ownerId) ?? "Title"}
                  </Badge>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section
      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3"
      data-test="experience-unique-bullets"
      aria-label="Unique bullets"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <ListChecks className="size-3.5" aria-hidden /> Unique bullets
        </h2>
        <span className="text-xs text-muted-foreground" data-test="experience-unique-count">
          {unique.length} {unique.length === 1 ? "bullet" : "bullets"}
        </span>
      </div>
      <p className="text-muted-foreground text-[11px]">
        One row per bullet id, however many titles show it. The assistant rewrites, reassigns, and
        trims from here without chasing bullets across titles.
      </p>

      {bulletList}
    </section>
  );
}
