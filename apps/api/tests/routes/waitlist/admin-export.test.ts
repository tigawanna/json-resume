import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "@api/app";
import { cleanupTouchedRecords, makeAdmin, seedEntry, signUp } from "./helpers";

afterAll(cleanupTouchedRecords);

describe("waitlist admin export and stats", () => {
  let adminCookie = "";
  let adminEmail = "";
  let alpha: { id: string; email: string };
  let gamma: { id: string; email: string };

  beforeAll(async () => {
    const admin = await signUp({ label: "export-admin", name: "Admin" });
    await makeAdmin({ email: admin.email });
    adminCookie = admin.cookie;
    adminEmail = admin.email;

    alpha = await seedEntry({
      label: "alpha",
      name: 'Alpha, "Ace"',
      userId: admin.userId,
    });
    gamma = await seedEntry({ label: "gamma", name: "Gamma", status: "removed" });
  });

  it("exports every entry as escaped CSV", async () => {
    const res = await app.request("/api/admin/waitlist/export", {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain('filename="waitlist.csv"');

    const csv = await res.text();
    expect(csv.split("\n")[0]).toBe(
      "email,name,status,source,userId,userEmail,consentAt,createdAt",
    );
    expect(csv).toContain(alpha.email);
    expect(csv).toContain('"Alpha, ""Ace"""');
    expect(csv).toContain(adminEmail);
    expect(csv).toContain(gamma.email);
  });

  it("returns stats for the admin home card", async () => {
    const res = await app.request("/api/admin/waitlist/stats", {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { joined: number; linked: number; removed: number };
    expect(body.joined).toBeGreaterThanOrEqual(1);
    expect(body.linked).toBeGreaterThanOrEqual(1);
    expect(body.removed).toBeGreaterThanOrEqual(1);
  });
});
