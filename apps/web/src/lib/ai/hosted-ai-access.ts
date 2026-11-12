/**
 * Hosted AI runs on our servers, so the web app requires a signed-in user.
 * A desktop build (`VITE_DESKTOP=true`) keeps local, key-based use without an account.
 * `VITE_AI_ALLOW_ANONYMOUS=true` skips the check only while `import.meta.env.DEV` is set.
 */
export function anonymousHostedAiAllowed() {
  if (import.meta.env.VITE_DESKTOP === "true") return true;
  return import.meta.env.DEV && import.meta.env.VITE_AI_ALLOW_ANONYMOUS === "true";
}

export function hostedAiLoginRequired() {
  return !anonymousHostedAiAllowed();
}
