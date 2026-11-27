import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { AppEnv } from "../src/config/env.schema.js";
import { createTestApp } from "./support/create-test-app.js";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("/docs (GET) serves Scalar", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs").expect(200);
    expect(response.text).toContain("Scalar");
  });

  it("/docs-json lists SERVER_URL and Better Auth paths", async () => {
    const serverUrl = app.get(ConfigService<AppEnv, true>).get("SERVER_URL", { infer: true });
    const response = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    expect(response.body.servers).toEqual([{ url: `${serverUrl}/api` }]);
    expect(response.body.paths["/me"]).toBeDefined();
    expect(response.body.paths["/auth/sign-in/email"]).toBeDefined();
    expect(response.body.tags.map((tag: { name: string }) => tag.name)).toContain("Better Auth");
    expect(response.body.tags.map((tag: { name: string }) => tag.name)).not.toContain("Default");
  });
});
