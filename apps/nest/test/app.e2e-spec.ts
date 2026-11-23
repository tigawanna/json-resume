import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createTestApp } from "./support/create-test-app.js";

describe("AppController (e2e)", () => {
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

  it("/ (GET)", () => {
    return request(app.getHttpServer()).get("/").expect(200).expect("Hello World!");
  });
});
