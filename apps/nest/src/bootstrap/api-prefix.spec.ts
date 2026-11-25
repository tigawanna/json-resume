import { describe, expect, it } from "vitest";
import { joinOriginPath, pathAfterGlobalPrefix } from "./api-prefix.js";

describe("joinOriginPath", () => {
  it("joins origin and path without duplicate slashes", () => {
    expect(
      joinOriginPath({ origin: "http://localhost:5040", path: "api" }),
    ).toBe("http://localhost:5040/api");
    expect(
      joinOriginPath({ origin: "http://localhost:5040/", path: "/api" }),
    ).toBe("http://localhost:5040/api");
  });
});

describe("pathAfterGlobalPrefix", () => {
  it("strips the Nest prefix from Better Auth's base path", () => {
    expect(
      pathAfterGlobalPrefix({ absolutePath: "/api/auth", prefix: "api" }),
    ).toBe("/auth");
  });
});
