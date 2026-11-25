import { describe, expect, it } from "vitest";
import { mergeAuthOpenApi } from "./merge-auth-openapi.js";
import type { OpenAPIObject } from "@nestjs/swagger";

const nestDocument = {
  openapi: "3.0.0",
  info: { title: "Nest", version: "1" },
  paths: { "/me": { get: { responses: { "200": { description: "ok" } } } } },
  tags: [{ name: "auth" }],
  components: {
    schemas: { Me: { type: "object" } },
    securitySchemes: { cookie: { type: "apiKey", in: "cookie", name: "sid" } },
  },
} satisfies OpenAPIObject;

describe("mergeAuthOpenApi", () => {
  it("keeps Nest paths and adds Better Auth paths, tags, and components", () => {
    const combined = mergeAuthOpenApi({
      nestDocument,
      basePath: "/auth",
      authSchema: {
        paths: {
          "/sign-in/email": {
            post: {
              tags: ["Default"],
              responses: { "200": { description: "ok" } },
            },
          },
          "/admin/list-users": {
            get: {
              tags: ["Admin"],
              responses: { "200": { description: "ok" } },
            },
          },
        },
        tags: [{ name: "Default" }, { name: "Admin" }],
        components: {
          schemas: { User: { type: "object" } },
          securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer" },
          },
        },
      },
    });

    expect(combined.paths["/me"]).toBeDefined();
    expect(combined.paths["/auth/sign-in/email"]).toBeDefined();
    expect(combined.tags?.map((tag) => tag.name)).toEqual([
      "auth",
      "Better Auth",
      "Better Auth (Admin)",
    ]);
    expect(combined.paths["/auth/sign-in/email"]?.post?.tags).toEqual(["Better Auth"]);
    expect(combined.paths["/auth/admin/list-users"]?.get?.tags).toEqual(["Better Auth (Admin)"]);
    expect(combined.components?.schemas).toMatchObject({
      Me: { type: "object" },
      User: { type: "object" },
    });
    expect(combined.components?.securitySchemes).toMatchObject({
      cookie: { type: "apiKey" },
      bearerAuth: { type: "http" },
    });
  });
});
