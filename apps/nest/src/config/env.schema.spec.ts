import { validateEnv } from "./env.schema.js";

const required = {
  DATABASE_URL: "libsql://example.turso.io",
  BETTER_AUTH_SECRET: "secret",
  GITHUB_CLIENT_ID: "id",
  GITHUB_CLIENT_SECRET: "gh-secret",
};

describe("validateEnv", () => {
  it("coerces the port and builds trusted origins", () => {
    const env = validateEnv({
      source: {
        ...required,
        PORT: "3200",
        FRONTEND_URL: "http://localhost:3040",
        BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3040, https://app.example",
      },
    });

    expect(env.PORT).toBe(3200);
    expect(env.SERVER_URL).toBe("http://localhost:5040");
    expect(env.TRUSTED_ORIGINS).toEqual([
      "http://localhost:3040",
      "http://localhost:5040",
      "https://app.example",
    ]);
  });

  it("rejects a file database url outside tests", () => {
    expect(() =>
      validateEnv({
        source: { ...required, DATABASE_URL: "file:local.db" },
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("fills placeholder secrets when NODE_ENV is test", () => {
    const env = validateEnv({ source: { NODE_ENV: "test" } });
    expect(env.DATABASE_URL).toBe("http://127.0.0.1:8080");
    expect(env.BETTER_AUTH_SECRET).toBe("test-secret-test-secret-test-secret");
  });

  it("accepts ADMIN_BYPASS_SECRET outside production", () => {
    const env = validateEnv({
      source: { ...required, NODE_ENV: "development", ADMIN_BYPASS_SECRET: "postman-key" },
    });
    expect(env.ADMIN_BYPASS_SECRET).toBe("postman-key");
  });

  it("rejects ADMIN_BYPASS_SECRET in production", () => {
    expect(() =>
      validateEnv({
        source: { ...required, NODE_ENV: "production", ADMIN_BYPASS_SECRET: "postman-key" },
      }),
    ).toThrow(/ADMIN_BYPASS_SECRET/);
  });
});
