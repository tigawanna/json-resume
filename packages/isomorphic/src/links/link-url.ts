import { z } from "zod";

/** Link URLs end up in résumé JSON, PDF exports and public pages. */
export const LINK_URL_MAX = 500;

/** Characters that turn a URL into markup or break out of an attribute. */
const BAD_URL_CHARS = /[<>"'`{}\\]/;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export type LinkUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Validates and normalizes one link URL: adds https://, rejects everything else. */
export function normalizeLinkUrl(raw: string): LinkUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "URL is required" };
  if (trimmed.length > LINK_URL_MAX) {
    return { ok: false, error: `Keep URLs under ${LINK_URL_MAX} characters` };
  }
  if (/\s/.test(trimmed)) {
    return { ok: false, error: "URLs can't contain spaces — percent-encode them" };
  }
  if (BAD_URL_CHARS.test(trimmed)) {
    return {
      ok: false,
      error: "URLs can't contain < > \" ' ` { } — paste the plain web address",
    };
  }
  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "That doesn't look like a web address" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https links are allowed" };
  }
  if (!parsed.hostname.includes(".")) {
    return { ok: false, error: "Include a domain, e.g. example.com" };
  }
  return { ok: true, url: parsed.href };
}

/** Zod view of the same rule for shared schemas (AI tools). */
export const linkUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(LINK_URL_MAX)
  .refine((value) => normalizeLinkUrl(value).ok, "Must be a plain http(s) web address");
