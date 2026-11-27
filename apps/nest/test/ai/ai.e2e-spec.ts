import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { AppEnv } from "../../src/config/env.schema.js";
import { createTestApp } from "../support/create-test-app.js";
import { personas } from "../support/personas.js";
import { dashboardBody, dashboardForwardedProps } from "./fixtures.js";

const paths = ["/api/ai/dashboard-assistant", "/api/ai/event-sourced-resume-tailor"];

describe("hosted AI HTTP contract", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;
  let frontendOrigin: string;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
    frontendOrigin = app
      .get(ConfigService<AppEnv, true>)
      .get("FRONTEND_URL", { infer: true })
      .replace(/\/+$/, "");
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it.each(paths)("allows credentialed preflight for %s", async (path) => {
    const response = await request(app.getHttpServer())
      .options(path)
      .set("Origin", frontendOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-run-id")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe(frontendOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-headers"]).toContain("x-run-id");
  });

  it.each(paths)("rejects missing and untrusted origins for %s", async (path) => {
    for (const origin of [undefined, "https://untrusted.example"]) {
      const pending = request(app.getHttpServer()).post(path).send(dashboardBody());
      if (origin) pending.set("Origin", origin);
      const response = await pending.expect(403);
      expect(response.body).toEqual({ error: "Forbidden" });
    }
  });

  it.each(paths)("requires a hosted session for %s", async (path) => {
    const response = await request(app.getHttpServer())
      .post(path)
      .set("Origin", frontendOrigin)
      .send(dashboardBody())
      .expect(401);

    expect(response.body).toEqual({
      error: "Sign in to use AI. These requests run on our servers.",
    });
  });

  it.each(paths)("does not let banned users fall back to anonymous for %s", async (path) => {
    await request(app.getHttpServer())
      .post(path)
      .set("Origin", frontendOrigin)
      .set("x-mock-user", personas.banned.id)
      .send(dashboardBody())
      .expect(401);
  });

  it("preserves the pre-stream payload error shape", async () => {
    const response = await request(app.getHttpServer())
      .post(paths[0])
      .set("Origin", frontendOrigin)
      .set("x-mock-user", personas.member.id)
      .send({ ...dashboardBody(), forwardedProps: { page: {} } })
      .expect(400);

    expect(response.body).toEqual({ error: "Invalid AI request payload" });
  });

  it("rejects malformed JSON before orchestration", async () => {
    const response = await request(app.getHttpServer())
      .post(paths[0])
      .set("Origin", frontendOrigin)
      .set("x-mock-user", personas.member.id)
      .set("Content-Type", "application/json")
      .send("{")
      .expect(400);

    expect(response.body).toEqual({ error: "Invalid AI request payload" });
  });

  it("keeps the missing BYOK key/model error", async () => {
    const response = await request(app.getHttpServer())
      .post(paths[0])
      .set("Origin", frontendOrigin)
      .set("x-mock-user", personas.member.id)
      .send({
        ...dashboardBody(),
        forwardedProps: { ...dashboardForwardedProps, apiKey: undefined, model: undefined },
      })
      .expect(400);

    expect(response.body).toEqual({ error: "apiKey and model are required" });
  });

  it("keeps SSE routes out of the generated JSON API contract", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    for (const path of paths) expect(response.body.paths[path]).toBeUndefined();
  });
});
