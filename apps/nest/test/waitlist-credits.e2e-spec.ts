import type { INestApplication } from "@nestjs/common";
import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { WAITLIST_RATE_LIMIT } from "../src/waitlist/waitlist.constants.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas, walletOf } from "./support/personas.js";

describe("waitlist, credits, and sync", () => {
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
      .post("/api/waitlist")
      .send({ email: "visitor@example.com", consent: true, source: "landing" })
      .expect(200)
      .expect({ joined: true });
    const wallet = await walletOf({ db, userId: personas.member.id });
    expect(wallet).toBeUndefined();
  });

  it("drops a honeypot submission without writing a row", async () => {
    await request(app.getHttpServer())
      .post("/api/waitlist")
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
      .post("/api/waitlist")
      .set("x-mock-user", personas.member.id)
      .send({ email: personas.member.email, name: "Member", consent: true, source: "dashboard" })
      .expect(200)
      .expect({ joined: true });
    const wallet = await walletOf({ db, userId: personas.member.id });
    expect(wallet?.monthlyBalance).toBe(CREDIT_POLICY.monthlyCredits);
  });

  it("answers the same way when the email is already on the list", async () => {
    await request(app.getHttpServer())
      .post("/api/waitlist")
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
      .post("/api/waitlist/claim")
      .set("x-mock-user", personas.admin.id)
      .expect(200)
      .expect({ claimed: true });
    const wallet = await walletOf({ db, userId: personas.admin.id });
    expect(wallet?.monthlyBalance).toBe(CREDIT_POLICY.monthlyCredits);
  });

  it("reports the grant, reset time, and policy from GET /credits", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/credits")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body.available).toBe(CREDIT_POLICY.monthlyCredits);
    expect(response.body.waitlistJoined).toBe(true);
    expect(response.body.resetsAt).toEqual(expect.any(String));
    expect(response.body.policy).toEqual(CREDIT_POLICY);
  });

  it("checks credits without spending them", async () => {
    const before = await walletOf({ db, userId: personas.member.id });
    const response = await request(app.getHttpServer())
      .post("/api/credits/checks")
      .set("x-mock-user", personas.member.id)
      .send({ action: "create" })
      .expect(200);
    expect(response.body).toMatchObject({
      available: before?.monthlyBalance,
      monthly: before?.monthlyBalance,
      bonus: before?.bonusBalance,
      resetsAt: expect.any(String),
    });
  });

  it("turns down an unauthenticated sync call", async () => {
    await request(app.getHttpServer()).post("/api/sync/events").send([]).expect(401);
    await request(app.getHttpServer()).get("/api/sync/events").expect(401);
  });

  it("accepts an empty event batch and returns an empty page", async () => {
    await request(app.getHttpServer())
      .post("/api/sync/events")
      .set("x-mock-user", personas.member.id)
      .send([])
      .expect(200)
      .expect({ confirmed: [] });
    const response = await request(app.getHttpServer())
      .get("/api/sync/events")
      .query({ since: 0 })
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body).toMatchObject({
      events: [],
      cursor: "0",
      hasMore: false,
      backendId: expect.any(String),
    });
  });

  it("turns down a banned user before sync", async () => {
    await request(app.getHttpServer())
      .post("/api/sync/events")
      .set("x-mock-user", personas.banned.id)
      .send([])
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

  it("gives monthly credits only to a waitlisted user", async () => {
    const member = await request(app.getHttpServer())
      .get("/api/credits")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(member.body.monthly).toBe(0);

    const waitlisted = await request(app.getHttpServer())
      .get("/api/credits")
      .set("x-mock-user", personas.memberWaitlisted.id)
      .expect(200);
    expect(waitlisted.body.monthly).toBe(CREDIT_POLICY.monthlyCredits);
  });
});

describe("waitlist IP throttle", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp({ throttle: true });
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it("returns 429 after the join limit from one IP", async () => {
    const server = app.getHttpServer();
    for (let index = 0; index < WAITLIST_RATE_LIMIT.limit; index += 1) {
      await request(server)
        .post("/api/waitlist")
        .send({ email: `throttle-${index}@example.com`, consent: true })
        .expect(200);
    }
    await request(server)
      .post("/api/waitlist")
      .send({ email: "throttle-over@example.com", consent: true })
      .expect(429);
  });
});
