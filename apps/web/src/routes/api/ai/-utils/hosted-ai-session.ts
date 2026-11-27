import { anonymousHostedAiAllowed } from "@/lib/ai/hosted-ai-access";
import { viewerControllerViewer } from "@/services/nest/client";
import { jsonError } from "./same-origin-cors";

/** Signed-in user id, or `"local"` when this build may run AI without an account. */
export async function resolveHostedAiUserId(_request: Request): Promise<string | Response> {
  try {
    const session = await viewerControllerViewer<true>();
    if (session.user?.id) return session.user.id;
  } catch (err: unknown) {
    void err;
  }
  if (anonymousHostedAiAllowed()) return "local";
  return jsonError("Sign in to use AI. These requests run on our servers.", 401);
}
