import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createTestApp } from "./support/create-test-app.js";

const secret = "postman-dev-key";

describe("auth admin bypass", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp({ adminBypassSecret: secret });
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it("lets x-admin through /me as admin", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/me")
      .set("x-admin", secret)
      .expect(200);
    expect(response.body.role).toBe("admin");
    expect(response.body.id).toBe("dev-admin-bypass");
  });

  it("lets x-admin through the admin session probe", async () => {
    await request(app.getHttpServer()).get("/api/admin/session").set("x-admin", secret).expect(200);
  });

  it("turns down a wrong x-admin value", async () => {
    await request(app.getHttpServer()).get("/api/me").set("x-admin", "wrong").expect(401);
  });
});
