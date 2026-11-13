import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import {
  ensureBuiltinAssistantSkills,
  formatAssistantSkills,
} from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import type { AssistantSkillScope } from "@/data-access-layer/event-sourced/schemas";
import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { useEffect } from "react";

/** Default skills for one chat, formatted for the system prompt. Seeds the shipped skills once. */
export function useAssistantSkillInstructions(scope: AssistantSkillScope) {
  const db = useEventSourcedDb();

  useEffect(() => {
    ensureBuiltinAssistantSkills(db);
  }, [db]);

  const { data } = useLiveQuery(
    (query) =>
      query
        .from({ skill: db.collections.assistantSkill })
        .where(({ skill }) => and(eq(skill.isDefault, true), inArray(scope, skill.scopes)))
        .orderBy(({ skill }) => skill.name, "asc"),
    [db, scope],
  );

  return formatAssistantSkills(data ?? []);
}
