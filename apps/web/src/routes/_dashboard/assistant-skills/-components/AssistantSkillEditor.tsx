import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import {
  composeSkillMarkdown,
  skillDocument,
} from "@/data-access-layer/event-sourced/rows/assistant-skill-markdown";
import {
  ASSISTANT_SKILL_BODY_MAX,
  deleteAssistantSkill,
  insertAssistantSkill,
  resetBuiltinAssistantSkill,
  updateAssistantSkill,
} from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import type {
  AssistantSkill,
  AssistantSkillScope,
} from "@/data-access-layer/event-sourced/schemas";
import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { useNavigate } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SCOPE_OPTIONS: { id: AssistantSkillScope; label: string }[] = [
  { id: "resume", label: "Résumé chat" },
  { id: "experience", label: "Experience chat" },
  { id: "dashboard", label: "Dashboard chat" },
];

const EMPTY_DOCUMENT = composeSkillMarkdown({ name: "", description: "", body: "" });

export function AssistantSkillEditor({
  skill,
  layout,
  onClose,
}: {
  /** Null starts a new skill. */
  skill: AssistantSkill | null;
  /** Drawer is the short view. Page is for a long skill file. */
  layout: "drawer" | "page";
  onClose: () => void;
}) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const [document, setDocument] = useState(() => (skill ? skillDocument(skill) : EMPTY_DOCUMENT));
  const [scopes, setScopes] = useState<AssistantSkillScope[]>(skill?.scopes ?? ["resume"]);
  const [isDefault, setIsDefault] = useState(skill?.isDefault ?? false);

  function toggleScope(scope: AssistantSkillScope) {
    setScopes((current) => {
      if (current.includes(scope)) return current.filter((item) => item !== scope);
      return [...current, scope];
    });
  }

  function persist() {
    if (scopes.length === 0) {
      toast.error("Pick at least one chat");
      return null;
    }
    const draft = { name: skill?.name ?? "", body: document, scopes, isDefault };
    try {
      if (skill) {
        updateAssistantSkill(db, skill.id, draft);
        return skill.id;
      }
      return insertAssistantSkill(db, viewer.user?.id, draft).id;
    } catch (error: unknown) {
      toast.error("Could not save the skill", { description: unwrapUnknownError(error).message });
      return null;
    }
  }

  function save() {
    const id = persist();
    if (!id) return;
    toast.success(skill ? "Skill saved" : "Skill added");
    onClose();
  }

  function openFullPage() {
    const id = persist();
    if (!id) return;
    void navigate({ to: "/assistant-skills/$skillId", params: { skillId: id } });
  }

  function remove() {
    if (!skill || skill.builtinKey) return;
    deleteAssistantSkill(db, skill.id);
    toast.success("Skill removed");
    onClose();
  }

  return (
    <form
      className="flex flex-col gap-4"
      data-test="assistant-skill-editor"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Load by default in</legend>
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map((scope) => {
            const selected = scopes.includes(scope.id);
            return (
              <button
                key={scope.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleScope(scope.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-base-content/15 text-base-content/70",
                )}
                data-test={`assistant-skill-scope-${scope.id}`}
              >
                {scope.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Default skill</p>
          <p className="text-xs text-muted-foreground">
            Loaded on every chat you checked above. You can still attach it by hand.
          </p>
        </div>
        <Switch
          checked={isDefault}
          onCheckedChange={setIsDefault}
          aria-label="Default skill"
          data-test="assistant-skill-default"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <label htmlFor="assistant-skill-body" className="text-sm font-medium">
          Skill file
        </label>
        <p className="text-xs text-muted-foreground">
          Markdown. The name and description stay in the front matter between the --- lines.
        </p>
        <Textarea
          id="assistant-skill-body"
          value={document}
          onChange={(event) => setDocument(event.target.value.slice(0, ASSISTANT_SKILL_BODY_MAX))}
          rows={layout === "page" ? 28 : 16}
          className={cn(
            "resize-y font-mono text-sm leading-6",
            layout === "page" ? "min-h-[70vh]" : "min-h-72",
          )}
          spellCheck={false}
          data-test="assistant-skill-body"
        />
        <p className="text-xs text-muted-foreground">
          {document.length.toLocaleString()} / {ASSISTANT_SKILL_BODY_MAX.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" data-test="assistant-skill-save">
          Save
        </Button>
        {layout === "drawer" ? (
          <Button
            type="button"
            variant="outline"
            onClick={openFullPage}
            data-test="assistant-skill-open-page"
          >
            <Maximize2 className="size-4" />
            Open full page
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose}>
          {layout === "page" ? "Back" : "Cancel"}
        </Button>
        {skill?.builtinKey ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetBuiltinAssistantSkill(db, skill.id);
              toast.success("Restored the shipped instructions");
              onClose();
            }}
            data-test="assistant-skill-reset"
          >
            Restore shipped text
          </Button>
        ) : null}
        {skill && !skill.builtinKey ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive ml-auto"
            onClick={remove}
            data-test="assistant-skill-delete"
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
