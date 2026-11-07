import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_SNAPSHOT_MAX_CHARS,
  formatExperienceSnapshot,
  limitExperienceSnapshot,
  type ExperienceGroupSnapshot,
} from "./experience-snapshot";

function snapshot(bulletCount: number): ExperienceGroupSnapshot {
  return {
    company: "Acme",
    startDate: "2020-01",
    endDate: "2022-12",
    titles: [
      {
        id: "exp1",
        role: "Engineer",
        startDate: "2020-01",
        endDate: "2022-12",
        location: "Remote",
        bullets: Array.from({ length: bulletCount }, (_, i) => ({
          id: `b${i}`,
          text: `Shipped feature ${i} with a long enough description to take up space in the snapshot formatting`,
        })),
      },
      {
        id: "exp2",
        role: "Lead",
        startDate: "2020-01",
        endDate: "2022-12",
        location: "",
        bullets: [{ id: "x1", text: "Led the team" }],
      },
    ],
  };
}

describe("formatExperienceSnapshot", () => {
  it("embeds the company, titles, and bullet ids the tools accept", () => {
    const text = formatExperienceSnapshot(snapshot(2));

    expect(text).toContain("Company: Acme");
    expect(text).toContain("Period: 2020-01 -> 2022-12");
    expect(text).toContain("Title 1: Engineer (id exp1)");
    expect(text).toContain("- [b0] Shipped feature 0");
    expect(text).toContain("- [x1] Led the team");
  });
});

describe("limitExperienceSnapshot", () => {
  it("returns small snapshots unchanged", () => {
    const small = snapshot(3);
    expect(limitExperienceSnapshot(small)).toEqual(small);
  });

  it("drops bullets from the largest title until the snapshot fits the budget", () => {
    const huge = snapshot(5_000);
    expect(formatExperienceSnapshot(huge).length).toBeGreaterThan(EXPERIENCE_SNAPSHOT_MAX_CHARS);

    const limited = limitExperienceSnapshot(huge);

    expect(formatExperienceSnapshot(limited).length).toBeLessThanOrEqual(
      EXPERIENCE_SNAPSHOT_MAX_CHARS,
    );
    expect(limited.titles).toHaveLength(2);
    expect(limited.titles[1]?.bullets).toHaveLength(1);
    expect(limited.titles[0]?.bullets.length).toBeLessThan(5_000);
  });

  it("clamps runaway bullet wording instead of dropping the fact", () => {
    const long = snapshot(1);
    long.titles[0]!.bullets[0]!.text = "x".repeat(10_000);

    const limited = limitExperienceSnapshot(long);

    expect(limited.titles[0]?.bullets[0]?.text.length).toBeLessThanOrEqual(500);
    expect(limited.titles[0]?.bullets[0]?.text.endsWith("...")).toBe(true);
  });
});
