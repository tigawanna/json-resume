import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "@api/app";
import {
  type ApiError,
  type Entry,
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

  it("removes, restores, links, and unlinks an entry", async () => {
    const remove = await app.request(`/api/admin/waitlist/entries/${beta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "removed", notes: "requested removal" }),
    });
    expect(remove.status).toBe(200);
    const removed = (await remove.json()) as { entry: Entry };
    expect(removed.entry.status).toBe("removed");
    expect(removed.entry.notes).toBe("requested removal");

    const restore = await app.request(`/api/admin/waitlist/entries/${beta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "joined" }),
    });
    expect(restore.status).toBe(200);
    expect(((await restore.json()) as { entry: Entry }).entry.status).toBe("joined");

    const link = await app.request(`/api/admin/waitlist/entries/${beta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ userId: memberUserId }),
    });
    expect(link.status).toBe(200);
    expect(((await link.json()) as { entry: Entry }).entry.userId).toBe(memberUserId);

    const unlink = await app.request(`/api/admin/waitlist/entries/${beta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ userId: null }),
    });
    expect(unlink.status).toBe(200);
    expect(((await unlink.json()) as { entry: Entry }).entry.userId).toBeNull();
  });

  it("validates patches and rejects unknown entries or users", async () => {
    const invalidBody = await app.request(`/api/admin/waitlist/entries/${delta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "nope" }),
    });
    expect(invalidBody.status).toBe(400);
    expect(((await invalidBody.json()) as ApiError).error.code).toBe("VALIDATION_ERROR");

    const unknownEntry = await app.request("/api/admin/waitlist/entries/no-such-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "removed" }),
    });
    expect(unknownEntry.status).toBe(404);
    expect(((await unknownEntry.json()) as ApiError).error.code).toBe("NOT_FOUND");

    const unknownUser = await app.request(`/api/admin/waitlist/entries/${delta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ userId: "nonexistent-user-id" }),
    });
    expect(unknownUser.status).toBe(404);
    expect(((await unknownUser.json()) as ApiError).error.code).toBe("NOT_FOUND");
  });
});
