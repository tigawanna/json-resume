// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_LINK_ICON,
  defaultLinkIconForUrl,
  normalizeLinkIcon,
  normalizeLinkUrl,
} from "./link-form";

describe("normalizeLinkUrl", () => {
  it("adds https:// and normalizes the address", () => {
    expect(normalizeLinkUrl("github.com/you")).toEqual({
      ok: true,
      url: "https://github.com/you",
    });
    expect(normalizeLinkUrl("  http://Example.com/a ").ok).toBe(true);
  });

  it("rejects script schemes, markup, attributes and junk", () => {
    expect(normalizeLinkUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizeLinkUrl("data:text/html,<h1>x</h1>").ok).toBe(false);
    expect(normalizeLinkUrl("vbscript:x").ok).toBe(false);
    expect(normalizeLinkUrl("<script>alert(1)</script>").ok).toBe(false);
    expect(normalizeLinkUrl('https://example.com" onmouseover="steal()').ok).toBe(false);
    expect(normalizeLinkUrl("https://example.com/x y").ok).toBe(false);
    expect(normalizeLinkUrl("not a url").ok).toBe(false);
    expect(normalizeLinkUrl("").ok).toBe(false);
  });

  it("allows only http(s) and requires a domain", () => {
    expect(normalizeLinkUrl("ftp://example.com/file").ok).toBe(false);
    expect(normalizeLinkUrl("file:///etc/passwd").ok).toBe(false);
    expect(normalizeLinkUrl("https://localhost").ok).toBe(false);
    expect(normalizeLinkUrl("mailto:ada@example.com").ok).toBe(false);
  });
});

describe("normalizeLinkIcon", () => {
  it("accepts react-icons names and cleans pasted JSX", () => {
    expect(normalizeLinkIcon("FaGithub")).toEqual({ ok: true, icon: "FaGithub" });
    expect(normalizeLinkIcon("<FaGithub />")).toEqual({ ok: true, icon: "FaGithub" });
    expect(normalizeLinkIcon("{FaGithub}")).toEqual({ ok: true, icon: "FaGithub" });
    expect(normalizeLinkIcon('<FaGithub size={4} className="x"/>')).toEqual({
      ok: true,
      icon: "FaGithub",
    });
    expect(normalizeLinkIcon("")).toEqual({ ok: true, icon: "" });
  });

  it("rejects anything that is not a component name", () => {
    expect(normalizeLinkIcon("fa github").ok).toBe(false);
    expect(normalizeLinkIcon("github").ok).toBe(false);
    expect(normalizeLinkIcon("onerror=alert(1)").ok).toBe(false);
    expect(normalizeLinkIcon("123Icon").ok).toBe(false);
  });
});

describe("defaultLinkIconForUrl", () => {
  it("maps known hosts to their brand icon and subdomains too", () => {
    expect(defaultLinkIconForUrl("github.com/you")).toBe("FaGithub");
    expect(defaultLinkIconForUrl("https://www.linkedin.com/in/ada")).toBe("FaLinkedin");
    expect(defaultLinkIconForUrl("https://blog.hashnode.dev")).toBe(DEFAULT_LINK_ICON);
    expect(defaultLinkIconForUrl("https://sub.hashnode.com/x")).toBe("SiHashnode");
  });

  it("falls back to a globe for unknown hosts and empty for invalid urls", () => {
    expect(defaultLinkIconForUrl("https://example.com")).toBe(DEFAULT_LINK_ICON);
    expect(defaultLinkIconForUrl("nope")).toBe("");
  });
});
