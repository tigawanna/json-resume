import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiClient, sessionInit } from "@api/core/testing/api-client";
import {
  cleanupTouchedRecords,
  makeAdmin,
  seedEntry,
  signUp,
} from "./helpers";

afterAll(cleanupTouchedRecords);

describe("PATCH /api/admin/waitlist/entries/:id", () => {
  let adminCookie = "";
  let memberUserId = "";
  let beta: { id: string; email: string };
  let delta: { id: string; email: string };

  beforeAll(async () => {
    const admin = await signUp({ label: "actions-admin", name: "Admin" });
    await makeAdmin({ email: admin.email });
    adminCookie = admin.cookie;

    const member = await signUp({ label: "actions-member", name: "Member" });
    memberUserId = member.userId;

    beta = await seedEntry({ label: "beta", name: "Beta" });
    delta = await seedEntry({ label: "delta", name: "Delta" });
  });

  function patchEntry({
    id,
    json,
  }: {
    id: string;
    json: { status?: "joined" | "removed"; userId?: string | null; notes?: string | null };
  }) {
    return apiClient.api.admin.waitlist.entries[":id"].$patch(
      { param: { id }, json },
      sessionInit({ cookie: adminCookie }),
    );
  }

  it("removes, restores, links, and unlinks an entry", async () => {
    const remove = await patchEntry({
      id: beta.id,
      json: { status: "removed", notes: "requested removal" },
    });
    expect(remove.status).toBe(200);
    if (!remove.ok) throw new Error("expected remove to succeed");
    const removed = await remove.json();
    expect(removed.entry?.status).toBe("removed");
    expect(removed.entry?.notes).toBe("requested removal");

    const restore = await patchEntry({ id: beta.id, json: { status: "joined" } });
    expect(restore.status).toBe(200);
    if (!restore.ok) throw new Error("expected restore to succeed");
    expect((await restore.json()).entry?.status).toBe("joined");

    const link = await patchEntry({ id: beta.id, json: { userId: memberUserId } });
    expect(link.status).toBe(200);
    if (!link.ok) throw new Error("expected link to succeed");
    expect((await link.json()).entry?.userId).toBe(memberUserId);

    const unlink = await patchEntry({ id: beta.id, json: { userId: null } });
    expect(unlink.status).toBe(200);
    if (!unlink.ok) throw new Error("expected unlink to succeed");
    expect((await unlink.json()).entry?.userId).toBeNull();
  });

  it("validates patches and rejects unknown entries or users", async () => {
    const invalidBody = await patchEntry({
      id: delta.id,
      json: { status: "nope" as "joined" },
    });
    expect(invalidBody.status).toBe(400);
    expect(await invalidBody.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });

    const unknownEntry = await patchEntry({
      id: "no-such-id",
      json: { status: "removed" },
    });
    expect(unknownEntry.status).toBe(404);
    expect(await unknownEntry.json()).toMatchObject({ error: { code: "NOT_FOUND" } });

    const unknownUser = await patchEntry({
      id: delta.id,
      json: { userId: "nonexistent-user-id" },
    });
    expect(unknownUser.status).toBe(404);
    expect(await unknownUser.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
