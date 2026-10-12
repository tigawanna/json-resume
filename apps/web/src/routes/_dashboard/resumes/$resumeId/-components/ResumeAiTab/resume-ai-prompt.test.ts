import type { Segment } from "@/components/prompt-area/types";
import { describe, expect, it } from "vitest";
import { attachChip, serializeSegments } from "./resume-ai-prompt";

function chip(trigger: string, value: string, displayText: string, data?: unknown): Segment {
  return { type: "chip", trigger, value, displayText, ...(data === undefined ? {} : { data }) };
}

function text(value: string): Segment {
  return { type: "text", text: value };
}

describe("serializeSegments", () => {
  it("returns nothing for blank input", () => {
    expect(serializeSegments([text("   ")])).toBe("");
  });

  it("appends directive instructions, with or without the slash", () => {
    const message = serializeSegments([
      chip("/", "/tailor", "tailor"),
      text(" for this role "),
      chip("/", "fit-analysis", "fit-analysis"),
      chip("/", "nope", "nope"),
    ]);
    expect(message.split("\n\n")[0]).toBe("/tailor for this role /fit-analysis/nope");
    expect(message).toContain("/tailor: Tailor this resume");
    expect(message).toContain("/fit-analysis: Analyze how well");
    expect(message).not.toContain("/nope:");
  });

  it("lists focus sections once", () => {
    const message = serializeSegments([
      text("tighten "),
      chip("#", "summary", "summary"),
      text(" and "),
      chip("#", "experience", "experience"),
      chip("#", "summary", "summary"),
    ]);
    expect(message).toContain("Focus sections: summary, experience (");
  });

  it("groups attachments into one block per type", () => {
    const resume = attachChip({ kind: "resume", id: "r1", name: "Backend" });
    const experience = attachChip({ kind: "experience", id: "e1", name: "Engineer at Acme" });
    const bullet = attachChip({ kind: "experience_bullet", id: "b1", name: "Cut p95 by 40%" });
    const message = serializeSegments([
      text("use "),
      chip(resume.trigger, resume.value, resume.displayText, resume.data),
      chip(experience.trigger, experience.value, experience.displayText, experience.data),
      chip(bullet.trigger, bullet.value, bullet.displayText, bullet.data),
      chip(bullet.trigger, bullet.value, bullet.displayText, bullet.data),
    ]);
    expect(message).toContain('Referenced resumes:\n- "Backend" (id: r1)');
    expect(message).toContain(
      'Referenced experiences:\n- "Engineer at Acme" (section: experience, id: e1)',
    );
    expect(message).toContain(
      'Referenced bullets:\n- "Cut p95 by 40%" (section: experience_bullet, id: b1)',
    );
    expect(message.match(/b1/g)).toHaveLength(1);
  });

  it("treats a typed @mention without kind as a résumé", () => {
    const message = serializeSegments([
      chip("@", "r2", "Frontend", { id: "r2", name: "Frontend" }),
    ]);
    expect(message.split("\n\n")[0]).toBe("@Frontend");
    expect(message).toContain('Referenced resumes:\n- "Frontend" (id: r2)');
  });

  it("shortens long chip labels but keeps the full name in the reference", () => {
    const name = "Led the migration of a monolith to services across four teams";
    const attached = attachChip({ kind: "experience_bullet", id: "b2", name });
    expect(attached.displayText.length).toBeLessThanOrEqual(40);
    const message = serializeSegments([
      chip(attached.trigger, attached.value, attached.displayText, attached.data),
    ]);
    expect(message).toContain(`"${name}"`);
  });
});
