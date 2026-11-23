import type { INestApplication } from "@nestjs/common";
import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas, walletOf } from "./support/personas.js";

describe("waitlist, credits, and sync stub", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it("lets an anonymous visitor join without granting credits", async () => {
    await request(app.getHttpServer())
      .post("/waitlist")
      .send({ email: "visitor@example.com", consent: true, source: "landing" })
      .expect(200)
      .expect({ joined: true });
    const wallet = await walletOf({ db, userId: personas.member.id });
    expect(wallet).toBeUndefined();
  });

  it("drops a honeypot submission without writing a row", async () => {
    await request(app.getHttpServer())
      .post("/waitlist")
      .send({ email: "bot@example.com", consent: true, website: "https://spam.example" })
      .expect(200)
      .expect({ joined: true });
    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, "bot@example.com"))
      .limit(1);
    expect(row).toBeUndefined();
  });

  it("links a signed-in join and grants the monthly credits", async () => {
    await request(app.getHttpServer())
      .post("/waitlist")
      .set("x-mock-user", personas.member.id)
      .send({ email: personas.member.email, name: "Member", consent: true, source: "dashboard" })
      .expect(200)
      .expect({ joined: true });
    const wallet = await walletOf({ db, userId: personas.member.id });
    expect(wallet?.monthlyBalance).toBe(CREDIT_POLICY.monthlyCredits);
  });

  it("answers the same way when the email is already on the list", async () => {
    await request(app.getHttpServer())
      .post("/waitlist")
      .send({ email: personas.member.email, consent: true })
      .expect(200)
      .expect({ joined: true });
  });

  it("claims an unlinked entry for the signed-in email", async () => {
    await db.insert(waitlistEntry).values({
      email: personas.admin.email,
      status: "joined",
      source: "landing",
      consentAt: new Date(),
    });
    await request(app.getHttpServer())
      .post("/waitlist/claim")
      .set("x-mock-user", personas.admin.id)
      .expect(200)
      .expect({ claimed: true });
    const wallet = await walletOf({ db, userId: personas.admin.id });
    expect(wallet?.monthlyBalance).toBe(CREDIT_POLICY.monthlyCredits);
  });

  it("reports the grant from GET /credits", async () => {
    const response = await request(app.getHttpServer())
      .get("/credits")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body.available).toBe(CREDIT_POLICY.monthlyCredits);
    expect(response.body.waitlistJoined).toBe(true);
  });

  it("turns down an unauthenticated sync call", async () => {
    await request(app.getHttpServer()).post("/sync").expect(401);
    await request(app.getHttpServer()).get("/sync").expect(401);
  });

  it("accepts a sync ping without spending credits", async () => {
    const before = await walletOf({ db, userId: personas.member.id });
    await request(app.getHttpServer())
      .post("/sync")
      .set("x-mock-user", personas.member.id)
      .expect(200)
      .expect({ status: "accepted", implementation: "pending" });
    const after = await walletOf({ db, userId: personas.member.id });
    expect(after?.monthlyBalance).toBe(before?.monthlyBalance);
    expect(after?.bonusBalance).toBe(before?.bonusBalance);
  });

  it("turns down a banned user before sync", async () => {
    await request(app.getHttpServer())
      .post("/sync")
      .set("x-mock-user", personas.banned.id)
      .expect(403);
  });
});

describe("waitlist required", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp({ policy: { ...CREDIT_POLICY, requireWaitlist: true } });
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it("turns down sync until the user is on the waitlist", async () => {
    await request(app.getHttpServer())
      .post("/sync")
      .set("x-mock-user", personas.member.id)
      .expect(403);
  });

  it("accepts sync for a waitlisted user and still does not charge", async () => {
    await request(app.getHttpServer())
      .get("/sync")
      .set("x-mock-user", personas.memberWaitlisted.id)
      .expect(200)
      .expect({ status: "accepted", implementation: "pending" });
    const credits = await request(app.getHttpServer())
      .get("/credits")
      .set("x-mock-user", personas.memberWaitlisted.id)
      .expect(200);
    expect(credits.body.monthly).toBe(CREDIT_POLICY.monthlyCredits);
  });
});
