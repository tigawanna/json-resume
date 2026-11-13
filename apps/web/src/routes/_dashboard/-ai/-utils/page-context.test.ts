// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { PAGE_CONTEXTS, resolvePageContext } from "./page-context";
import { buildPageBlock } from "./dashboard-system-prompt";

const LAYOUT_IDS = new Set(["/_dashboard", "/_dashboard/admin/route"]);

describe("page assistant registry", () => {
  it("covers every dashboard page route", () => {
    const tree = readFileSync(new URL("../../../../routeTree.gen.ts", import.meta.url), "utf8");
    const ids = [...tree.matchAll(/id: '(\/_dashboard[^']*)'/g)].map((match) => match[1]);
    const missing = [...new Set(ids)].filter((id) => !LAYOUT_IDS.has(id) && !PAGE_CONTEXTS[id]);
    expect(missing).toEqual([]);
  });

  it("falls back to the library pack for an unknown route", () => {
    expect(resolvePageContext("/_dashboard/not-a-page/").toolPack).toBe("library");
  });

  it("tells the model the page, the focus id, and to call a tool first", () => {
    const block = buildPageBlock({
      label: "Job",
      summary: "One tracked job is open.",
      instructions: "",
      pathname: "/jobs/job-1",
      focus: { collection: "job", id: "job-1", title: "Acme · Engineer" },
      conversationStartedOn: "Notes",
    });

    expect(block).toContain("You are on Job");
    expect(block).toContain("job-1");
    expect(block).toContain("Call a tool before you state a field value.");
    expect(block).toContain("started on Notes");
  });
});
