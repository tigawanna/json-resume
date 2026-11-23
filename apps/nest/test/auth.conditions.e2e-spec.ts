import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas } from "./support/personas.js";

describe("auth conditions", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it("turns down /me with no credential", async () => {
    await request(app.getHttpServer()).get("/me").expect(401);
  });

  it("turns down /me for an unknown mock user", async () => {
    await request(app.getHttpServer()).get("/me").set("x-mock-user", "missing").expect(401);
  });

  it("turns down /me for a blank mock header", async () => {
    await request(app.getHttpServer()).get("/me").set("x-mock-user", "   ").expect(401);
  });

  it("returns the member id", async () => {
    const response = await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body.id).toBe(personas.member.id);
  });

  it("returns the member email", async () => {
    const response = await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body.email).toBe(personas.member.email);
  });

  it("returns the member role from the row, not the header", async () => {
    const response = await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body.role).toBe("user");
  });

  it("does not return a password", async () => {
    const response = await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.member.id)
      .expect(200);
    expect(response.body).not.toHaveProperty("password");
  });

  it("returns the admin role", async () => {
    const response = await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.admin.id)
      .expect(200);
    expect(response.body.role).toBe("admin");
  });

  it("returns null when the user has no role", async () => {
    const response = await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.noRole.id)
      .expect(200);
    expect(response.body.role).toBeNull();
  });

  it("turns down a banned member", async () => {
    await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.banned.id)
      .expect(403);
  });

  it("turns down a banned admin", async () => {
    await request(app.getHttpServer())
      .get("/me")
      .set("x-mock-user", personas.bannedAdmin.id)
      .expect(403);
  });

  it("turns down a member on the admin probe", async () => {
    await request(app.getHttpServer())
      .get("/admin/session")
      .set("x-mock-user", personas.member.id)
      .expect(403);
  });

  it("turns down a user with no role on the admin probe", async () => {
    await request(app.getHttpServer())
      .get("/admin/session")
      .set("x-mock-user", personas.noRole.id)
      .expect(403);
  });

  it("turns down a banned user on the admin probe", async () => {
    await request(app.getHttpServer())
      .get("/admin/session")
      .set("x-mock-user", personas.banned.id)
      .expect(403);
  });

  it("turns down a banned admin on the admin probe", async () => {
    await request(app.getHttpServer())
      .get("/admin/session")
      .set("x-mock-user", personas.bannedAdmin.id)
      .expect(403);
  });

  it("lets an admin open the admin probe", async () => {
    const response = await request(app.getHttpServer())
      .get("/admin/session")
      .set("x-mock-user", personas.admin.id)
      .expect(200);
    expect(response.body.role).toBe("admin");
  });

  it("lets a comma-separated admin role open the admin probe", async () => {
    const response = await request(app.getHttpServer())
      .get("/admin/session")
      .set("x-mock-user", personas.multiRole.id)
      .expect(200);
    expect(response.body.id).toBe(personas.multiRole.id);
  });

  it("turns down the admin probe with no credential", async () => {
    await request(app.getHttpServer()).get("/admin/session").expect(401);
  });

  it("serves the public hello route with no credential", async () => {
    await request(app.getHttpServer()).get("/").expect(200).expect("Hello World!");
  });

  it("serves the public hello route to a signed-in member", async () => {
    await request(app.getHttpServer())
      .get("/")
      .set("x-mock-user", personas.member.id)
      .expect(200)
      .expect("Hello World!");
  });
});
