// @vitest-environment node
import { and, eq, inArray, queryOnce } from "@tanstack/db";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { composeSkillMarkdown } from "@/data-access-layer/event-sourced/rows/assistant-skill-markdown";
import {
  ensureBuiltinAssistantSkills,
  formatAssistantSkills,
  insertAssistantSkill,
} from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import { openTestAppDb } from "@/data-access-layer/event-sourced/testing/app-test-db";

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

describe("assistant skills", () => {
  it("seeds the shipped skills once and leaves later edits in place", () => {
    ensureBuiltinAssistantSkills(db);
    ensureBuiltinAssistantSkills(db);
    const bullets = db.collections.assistantSkill.get("builtin-dev-bullets");
    expect(bullets?.isDefault).toBe(true);
    expect(bullets?.body).toContain("Never silently delete a bullet.");
    expect(bullets?.body).toContain("end date is before 2023");
    expect(bullets?.body).toContain("Do not delete what they typed.");
    expect(db.collections.assistantSkill.get("builtin-pragmatic-tailoring")?.body).toContain(
      "Developer bullets wins",
    );
    expect(db.collections.assistantSkill.toArray).toHaveLength(4);
    expect(db.collections.assistantSkill.get("builtin-empty-resume")?.body).toContain(
      "low-fidelity",
    );
    expect(db.collections.assistantSkill.get("builtin-import-resumes")?.body).toContain(
      "Portable recipe",
    );

    db.collections.assistantSkill.update("builtin-dev-bullets", (row) => {
      row.body = "Custom bullets.";
    });
    ensureBuiltinAssistantSkills(db);
    expect(db.collections.assistantSkill.get("builtin-dev-bullets")?.body).toBe("Custom bullets.");
  });

  it("replaces an untouched older shipped skill and leaves an edited one", () => {
    const previous = composeSkillMarkdown({
      name: "Developer bullets",
      description: "One shipped change per line, using only tools and facts that role already had.",
      body: [
        "Write each bullet as one change that was shipped:",
        "Verb + what changed in the system + the stack that role actually used + an outcome only when the source bullet already states one.",
        "Past roles use past tense. The current role uses present tense.",
        'Name the system, service, or pipeline. Drop "responsible for", "worked on", "helped with", "leveraged", and "utilized".',
        "A technology belongs in the line only if that role used it. Do not add AI, LLMs, or any later stack to a role whose dates end before the user used them. Rewording is allowed. New facts are not.",
        "Do not invent metrics, employers, titles, or dates. If the original line has no number, leave it unquantified.",
        "One change per line. If a sentence could sit on anyone's résumé, rewrite it with a fact from this role or delete it.",
        "Keep the user's own names for tools and products.",
      ].join("\n"),
    });
    ensureBuiltinAssistantSkills(db);
    db.collections.assistantSkill.update("builtin-dev-bullets", (row) => {
      row.body = previous;
    });
    ensureBuiltinAssistantSkills(db);
    expect(db.collections.assistantSkill.get("builtin-dev-bullets")?.body).toContain(
      "Never silently delete a bullet.",
    );
  });

  it("keeps default skills for one scope, ordered by name", async () => {
    ensureBuiltinAssistantSkills(db);
    insertAssistantSkill(db, "user-1", {
      name: "Attached only",
      body: "Do not load this automatically.",
      scopes: ["resume"],
      isDefault: false,
    });
    insertAssistantSkill(db, "user-1", {
      name: "Dashboard only",
      body: "Dashboard default.",
      scopes: ["dashboard"],
      isDefault: true,
    });

    const scope = "resume" as const;
    const matched = await queryOnce((query) =>
      query
        .from({ skill: db.collections.assistantSkill })
        .where(({ skill }) => and(eq(skill.isDefault, true), inArray(scope, skill.scopes)))
        .orderBy(({ skill }) => skill.name, "asc"),
    );

    expect(matched.map((skill) => skill.name)).toEqual([
      "Developer bullets",
      "Empty résumé",
      "Import JSON résumés",
      "Pragmatic tailoring",
    ]);
  });

  it("formats only the skills passed in, under their names", () => {
    const created = insertAssistantSkill(db, "user-1", {
      name: "Voice",
      body: "Write the way I talk.",
      scopes: ["resume"],
      isDefault: true,
    });
    const text = formatAssistantSkills([created]);
    expect(text).toContain("name: Voice");
    expect(text).toContain("Write the way I talk.");
    expect(text.startsWith("---")).toBe(false);
    expect(formatAssistantSkills([])).toBe("");
  });
});
