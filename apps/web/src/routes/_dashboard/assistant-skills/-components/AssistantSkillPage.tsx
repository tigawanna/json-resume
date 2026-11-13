import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { skillExcerpt } from "@/data-access-layer/event-sourced/rows/assistant-skill-markdown";
import { ensureBuiltinAssistantSkills } from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import type {
  AssistantSkill,
  AssistantSkillScope,
} from "@/data-access-layer/event-sourced/schemas";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "@tanstack/react-db";
import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AssistantSkillEditor } from "./AssistantSkillEditor";

const SCOPE_LABEL: Record<AssistantSkillScope, string> = {
  resume: "Résumé",
  experience: "Experience",
  dashboard: "Dashboard",
};

type SkillDraft = { kind: "new" } | { kind: "edit"; id: string };

export function AssistantSkillPage() {
  const db = useEventSourcedDb();
  const [editing, setEditing] = useState<SkillDraft | null>(null);

  useEffect(() => {
    ensureBuiltinAssistantSkills(db);
  }, [db]);

  const { data } = useLiveQuery(
    (query) => query.from({ skill: db.collections.assistantSkill }),
    [db],
  );
  const skills = [...(data ?? [])].sort((a, b) => {
    if (Boolean(a.builtinKey) !== Boolean(b.builtinKey)) return a.builtinKey ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const selected =
    editing?.kind === "edit" ? (skills.find((skill) => skill.id === editing.id) ?? null) : null;

  let editor: ReactNode = null;
  if (editing?.kind === "new") {
    editor = (
      <AssistantSkillEditor
        key="new"
        skill={null}
        layout="drawer"
        onClose={() => setEditing(null)}
      />
    );
  } else if (selected) {
    editor = (
      <AssistantSkillEditor
        key={selected.id}
        skill={selected}
        layout="drawer"
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6"
      data-test="assistant-skills-page"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Assistant skills</h1>
          <p className="text-sm text-muted-foreground">
            Instructions the assistants follow when they rewrite bullets or tailor a résumé. A
            default skill loads on every chat you pick. Attach any skill from the composer when you
            want it for one message.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setEditing({ kind: "new" })}
          data-test="assistant-skill-create"
        >
          <Plus className="size-4" />
          New skill
        </Button>
      </div>

      <ul className="flex flex-col gap-2" data-test="assistant-skill-list">
        {skills.map((skill) => (
          <li key={skill.id}>
            <SkillRow skill={skill} onSelect={() => setEditing({ kind: "edit", id: skill.id })} />
          </li>
        ))}
      </ul>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 sm:max-w-xl"
          data-test="assistant-skill-drawer"
        >
          <SheetHeader className="border-b pr-10">
            <SheetTitle>{selected?.name ?? "New skill"}</SheetTitle>
            <SheetDescription>
              Opens here for a quick edit. Use the full page when the file is long.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{editor}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SkillRow({ skill, onSelect }: { skill: AssistantSkill; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-base-content/10 px-3 py-3 text-left transition-colors hover:bg-base-200/60",
      )}
      data-test={`assistant-skill-row-${skill.id}`}
    >
      <span className="flex items-center gap-2">
        <span className="font-medium">{skill.name}</span>
        {skill.builtinKey ? (
          <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
            Shipped
          </span>
        ) : null}
        {skill.isDefault ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
            Default
          </span>
        ) : null}
      </span>
      <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
        {skillExcerpt(skill)}
      </span>
      <span className="flex flex-wrap gap-1">
        {skill.scopes.map((scope) => (
          <span
            key={scope}
            className="rounded-full border border-base-content/10 px-2 py-0.5 text-[10px]"
          >
            {SCOPE_LABEL[scope]}
          </span>
        ))}
      </span>
    </button>
  );
}
