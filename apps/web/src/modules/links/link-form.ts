import { normalizeLinkUrl } from "@repo/isomorphic/links/link-url";

export { LINK_URL_MAX, linkUrlSchema, normalizeLinkUrl } from "@repo/isomorphic/links/link-url";
export type { LinkUrlResult } from "@repo/isomorphic/links/link-url";

/**
 * Link fields: what a URL may contain and what an icon name looks like. Link
 * URLs end up in résumé JSON, PDF exports and public pages, so only plain web
 * addresses belong here — no schemes that execute, no markup, no attributes.
 */

export const LINK_URL_PLACEHOLDER = "https://github.com/you";
export const LINK_URL_HINT = "Web link, https://… — scripts, markup and spaces are rejected.";
export const LINK_ICON_HINT =
  "React icon name, e.g. FaGithub — no < > { } or spaces. Left empty, it defaults from the URL.";
export const LINK_ICON_PLACEHOLDER = "FaGithub";

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
