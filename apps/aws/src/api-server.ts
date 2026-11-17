import { handle } from "hono/aws-lambda";
import { loadSecretsIntoEnv } from "./secrets.js";

type LambdaHandler = ReturnType<typeof handle>;

/** `apps/api` validates env on import, so the app loads only after the secret is in `process.env`. */
async function loadHandler(): Promise<LambdaHandler> {
  await loadSecretsIntoEnv();
  const { app } = await import("@repo/api/app");
  return handle(app);
}

let ready: Promise<LambdaHandler> | undefined;

/** API Gateway HTTP API (payload v2) to the unchanged Hono app from `apps/api`. */
export async function handler(...args: Parameters<LambdaHandler>) {
  ready ??= loadHandler();
  const handle = await ready;
  return handle(...args);
}
