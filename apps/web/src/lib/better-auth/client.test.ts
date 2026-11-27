import { describe, expect, it } from "vite-plus/test";
import { apiOrigin } from "../env/client-env";
import { authClient } from "./client";

describe("Better Auth client", () => {
  it("loads get-session from Nest", async () => {
    const { data, error } = await authClient.getSession();

    expect(error).toBeNull();
    expect(data === null || data.user).toBeTruthy();
  });

  it("lists api keys on Nest when the session is empty", async () => {
    const { error } = await authClient.apiKey.list({ query: {} });

    expect(error).not.toBeNull();
    expect(error?.status).toBe(401);
  });

  it("reaches the Nest auth origin from env", async () => {
    const response = await fetch(`${apiOrigin}/api/auth/ok`);

    expect(response.ok).toBe(true);
  });
});
