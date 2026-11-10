import { z } from "zod";

/**
 * Link fields: what a URL may contain and what an icon name looks like. Link
 * URLs end up in résumé JSON, PDF exports and public pages, so only plain web
 * addresses belong here — no schemes that execute, no markup, no attributes.
 */

export const LINK_URL_MAX = 500;

export const LINK_URL_PLACEHOLDER = "https://github.com/you";
export const LINK_URL_HINT = "Web link, https://… — scripts, markup and spaces are rejected.";
export const LINK_ICON_HINT =
  "React icon name, e.g. FaGithub — no < > { } or spaces. Left empty, it defaults from the URL.";
export const LINK_ICON_PLACEHOLDER = "FaGithub";

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

const ICON_NAME = /^[A-Z][A-Za-z0-9]*$/;

export type LinkIconResult = { ok: true; icon: string } | { ok: false; error: string };

/**
 * Validates a react-icons component name ("FaGithub", "SiHashnode" — no
 * braces). Tolerates pasted JSX like `<FaGithub />` and trailing props by
 * taking the first identifier-looking token.
 */
export function normalizeLinkIcon(raw: string): LinkIconResult {
  const firstToken =
    raw
      .trim()
      .replace(/^[<({[\s]+/, "")
      .split(/[\s>}/]/)[0] ?? "";
  const value = firstToken.replace(/[^A-Za-z0-9]/g, "");
  if (!value) return { ok: true, icon: "" };
  if (!ICON_NAME.test(value)) {
    return {
      ok: false,
      error: 'Use a react-icons name like "FaGithub" — no < > { } or spaces',
    };
  }
  return { ok: true, icon: value };
}

/** react-icons component name per known hostname; brands get their mark, everything else a globe. */
const ICON_BY_HOST: ReadonlyArray<readonly [string, string]> = [
  ["github.com", "FaGithub"],
  ["gitlab.com", "FaGitlab"],
  ["linkedin.com", "FaLinkedin"],
  ["x.com", "FaXTwitter"],
  ["twitter.com", "FaXTwitter"],
  ["medium.com", "FaMedium"],
  ["dev.to", "FaDev"],
  ["youtube.com", "FaYoutube"],
  ["stackoverflow.com", "FaStackOverflow"],
  ["codepen.io", "FaCodepen"],
  ["dribbble.com", "FaDribbble"],
  ["behance.net", "FaBehance"],
  ["figma.com", "FaFigma"],
  ["npmjs.com", "FaNpm"],
  ["docker.com", "FaDocker"],
  ["hashnode.com", "SiHashnode"],
];

export const DEFAULT_LINK_ICON = "FaGlobe";

/** The icon a link defaults to when the user leaves the field empty. */
export function defaultLinkIconForUrl(raw: string): string {
  const result = normalizeLinkUrl(raw);
  if (!result.ok) return "";
  const { hostname } = new URL(result.url);
  const host = hostname.replace(/^www\./, "");
  for (const [domain, icon] of ICON_BY_HOST) {
    if (host === domain || host.endsWith(`.${domain}`)) return icon;
  }
  return DEFAULT_LINK_ICON;
}
