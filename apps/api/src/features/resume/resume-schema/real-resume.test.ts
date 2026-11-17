import { describe, expect, it } from "vitest";
import realResume from "./test-fixtures/real-resume.json";
import { moveSectionOrder, parseResumeJson, safeParseResumeJson } from "./parse";

const raw = JSON.stringify(realResume);

describe("résumé document parsing with a real user payload", () => {
  it("parses the real document and keeps its actual content", () => {
    const doc = parseResumeJson(raw);

    expect(doc.version).toBe(1);
    expect(doc.header.fullName).toBe("Dennis Waweru");
    expect(doc.header.email).toBe("denniskinuthiawaweru@gmail.com");
    expect(doc.header.links.map((link) => link.label)).toEqual(["GitHub", "LinkedIn"]);
    expect(doc.experience.items.length).toBe(realResume.experience.items.length);
    expect(doc.experience.items[0]).toMatchObject({
      company: realResume.experience.items[0]!.company,
      role: realResume.experience.items[0]!.role,
      start: realResume.experience.items[0]!.start,
    });
    expect(doc.skills.groups.length).toBeGreaterThan(0);
    // Every real section keeps its position; the migration appends `notes`,
    // which this older export predates.
    expect(doc.sectionOrder.slice(0, realResume.sectionOrder.length)).toEqual(
      realResume.sectionOrder,
    );
    expect(doc.sectionOrder.at(-1)).toBe("notes");
  });

  it("fills blocks the real document omits, then round-trips losslessly", () => {
    const doc = parseResumeJson(raw);
    // The real export predates the `notes` block; migration must supply it and
    // the result must still satisfy the current schema.
    expect("notes" in realResume).toBe(false);
    expect(doc.notes).toMatchObject({ enabled: expect.any(Boolean) });

    expect(parseResumeJson(JSON.stringify(doc))).toEqual(doc);
  });

  it("normalizes legacy/corrupt fields instead of rejecting them", () => {
    // The parse path is a migration first and validation second: these are the
    // exact coercions a real old export can hit. Pinning them here stops the
    // coercion layer from silently changing what a saved résumé looks like.
    const legacy = structuredClone(realResume);
    legacy.version = 2;
    legacy.meta.templateId = "not-a-template";
    legacy.sectionOrder = ["header", "made-up-section", "header", "skills"];
    delete (legacy as Record<string, unknown>).header;

    const result = safeParseResumeJson(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.version).toBe(1);
    expect(result.data.meta.templateId).toBe("classic");
    expect(result.data.sectionOrder).toEqual([
      "header",
      "skills",
      "summary",
      "experience",
      "education",
      "projects",
      "talks",
      "notes",
    ]);
    expect(result.data.header.fullName).toBe("");
    expect(result.data.header.email).toBe("");

    // The one thing this path genuinely rejects is not being JSON at all.
    expect(safeParseResumeJson("{not json")).toMatchObject({ ok: false });
  });

  it("moves only sections that exist in the real section order", () => {
    const order = parseResumeJson(raw).sectionOrder;
    const first = order[0]!;
    const second = order[1]!;

    expect(moveSectionOrder(order, first, 1)).toEqual([second, first, ...order.slice(2)]);
    expect(moveSectionOrder(order, first, -1)).toEqual(order);
    expect(moveSectionOrder(order, "not-a-section" as (typeof order)[number], 1)).toEqual(order);
  });
});
