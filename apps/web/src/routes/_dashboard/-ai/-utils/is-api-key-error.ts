const API_KEY_ERROR_PATTERN =
  /\b(401|403)\b|unauthori[sz]ed|forbidden|invalid[^.\n]*(api[ -]?)?key|incorrect api key|no auth credentials|user not found|api key/i;

/**
 * Our chat routes return 401 before calling OpenRouter when this browser has no session.
 * The client only keeps `HTTP error! status: 401`, which must not be read as a bad key.
 */
const APP_SIGNED_OUT_PATTERN = /HTTP error! status: 401|^\s*Unauthorized\s*$/i;

export function isAppSignedOutMessage(message: string | null): boolean {
  if (!message) return false;
  return APP_SIGNED_OUT_PATTERN.test(message);
}

export function isApiKeyErrorMessage(message: string | null): boolean {
  if (!message || isAppSignedOutMessage(message)) return false;
  return API_KEY_ERROR_PATTERN.test(message);
}
