import { anonymousHostedAiAllowed } from "@/lib/ai/hosted-ai-access";
import { auth } from "@/lib/auth";
import { jsonError } from "./same-origin-cors";

/** Signed-in user id, or `"local"` when this build may run AI without an account. */
export async function resolveHostedAiUserId(request: Request): Promise<string | Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user.id) return session.user.id;
  if (anonymousHostedAiAllowed()) return "local";
  return jsonError("Sign in to use AI. These requests run on our servers.", 401);
}
