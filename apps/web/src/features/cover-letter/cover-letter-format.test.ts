import { describe, expect, it } from "vitest";
import { coverLetterHtml, coverLetterPlainText, letterMarkdown } from "./cover-letter-format";

describe("letterMarkdown", () => {
  it("keeps single line breaks in prose", () => {
    expect(letterMarkdown("Best,\nDennis")).toBe("Best,\\\nDennis");
  });

  it("leaves paragraphs, lists, headings and code alone", () => {
    const body = "# Dennis\nHi\n\n- one\n- two\n\n```\na\nb\n```";
    expect(letterMarkdown(body)).toBe("# Dennis\nHi\n\n- one\n- two\n\n```\na\nb\n```");
  });
});

describe("cover letter output", () => {
  const body = "Dear team,\n\nI built **sync**.\n\n- Shipped it\n- Led 4\n\nBest,\nDennis";

  it("renders HTML with line breaks and formatting for Google Docs", () => {
    const html = coverLetterHtml(body);
    expect(html).toContain("<strong>sync</strong>");
    expect(html).toContain("<li>Shipped it</li>");
    expect(html).toContain("Best,<br>Dennis");
  });

  it("strips markdown for plain text", () => {
    expect(coverLetterPlainText(body)).toBe(
      "Dear team,\n\nI built sync.\n\n- Shipped it\n- Led 4\n\nBest,\nDennis",
    );
  });
});
