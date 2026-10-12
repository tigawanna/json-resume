import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatText } from "./ResumeAiMarkdown";

const fixture = `# Fit analysis

## 1. Executive Summary

A paragraph with **bold**, *emphasis*, ~~struck~~ and \`inline code\`.
See [the guide](https://example.com/guide) or [this résumé](/resumes/abc).

### Strengths

- First point
  - Nested point
- [x] Done task

1. Step one
2. Step two

> A quoted line

---

| Skill | Level |
| ----- | ----- |
| React | Expert |

\`\`\`ts
const answer = 42;
\`\`\`
`;

function render(content: string) {
  return renderToStaticMarkup(<ChatText content={content} role="assistant" />);
}

describe("ChatText", () => {
  it("styles every element the model sends", () => {
    const html = render(fixture);

    for (const tag of ["h1", "h2", "h3", "p", "ul", "ol", "li", "blockquote", "hr", "table"]) {
      expect(html, tag).toMatch(new RegExp(`<${tag} [^>]*class="[^"]+"`));
    }
    expect(html).toContain("<em>emphasis</em>");
    expect(html).toContain("<del>struck</del>");
    expect(html).toMatch(/<input[^>]*type="checkbox"/);
  });

  it("leaves heading ids off so messages can't collide", () => {
    expect(render(fixture)).not.toMatch(/<h\d [^>]*id=/);
  });

  it("opens external links in a new tab and keeps app links in place", () => {
    const html = render(fixture);
    expect(html).toMatch(
      /<a href="https:\/\/example.com\/guide" target="_blank" rel="noopener noreferrer"/,
    );
    expect(html).toMatch(/<a href="\/resumes\/abc" class=/);
  });

  it("highlights fenced code with the theme classes and a copy button", () => {
    const html = render(fixture);
    expect(html).toMatch(/<pre [^>]*class="th-code [^"]*tm-code"/);
    expect(html).toContain("th-keyword");
    expect(html).toContain('data-test="resume-ai-code-copy"');
    expect(html).toMatch(/<code class="th-code-inline [^"]*">inline code<\/code>/);
  });

  it("drops half-typed trailing blocks while streaming", () => {
    expect(render("Intro\n\n- one\n- ")).not.toContain("<li></li>");
    expect(render("Intro\n\n## ")).not.toContain("<h2");
  });
});
