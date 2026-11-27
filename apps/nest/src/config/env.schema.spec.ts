import { validateEnv } from "./env.schema.js";

const required = {
  POSTGRES_URL: "postgresql://example.com/resume",
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

  it("expands ${NAME} references before URL checks", () => {
    const env = validateEnv({
      source: {
        ...required,
        SERVER_URL: "http://localhost:5040",
        BETTER_AUTH_URL: "${SERVER_URL}",
        FRONTEND_URL: "${SERVER_URL}",
      },
    });
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:5040");
    expect(env.FRONTEND_URL).toBe("http://localhost:5040");
  });

  it("accepts a postgres database url and coerces pool size", () => {
    const env = validateEnv({
      source: { ...required, POSTGRES_URL: "postgres://localhost/db", POSTGRES_POOL_MAX: "4" },
    });
    expect(env.POSTGRES_URL).toBe("postgres://localhost/db");
    expect(env.POSTGRES_POOL_MAX).toBe(4);
  });

  it("rejects a non-postgres database url", () => {
    expect(() =>
      validateEnv({
        source: { ...required, POSTGRES_URL: "libsql://example.turso.io" },
      }),
    ).toThrow(/POSTGRES_URL/);
  });

  it("fills placeholder secrets and Postgres URL when NODE_ENV is test", () => {
    const env = validateEnv({ source: { NODE_ENV: "test" } });
    expect(env.POSTGRES_URL).toContain("postgresql://");
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
