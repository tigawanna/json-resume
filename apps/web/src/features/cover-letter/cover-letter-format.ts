import { renderHtml } from "@tanstack/markdown/html";
import { parseMarkdown } from "@tanstack/markdown/parser";
import type { BlockNode, InlineNode } from "@tanstack/markdown";

/** Inline styles survive a paste into Google Docs or Word; class names do not. */
const DOCUMENT_STYLE =
  "font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.5;";

const BLOCK_START = /^\s*([-*+]\s|\d+[.)]\s|#{1,6}\s|>|```|~~~|\|)/;

/**
 * Letters keep their line breaks ("Best,\nDennis", address blocks), which
 * markdown would fold into one line. Turns single newlines between prose
 * lines into hard breaks; blank lines, lists, headings and code are untouched.
 */
export function letterMarkdown(body: string): string {
  const lines = body.split("\n");
  let inFence = false;
  return lines
    .map((line, index) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      const next = lines[index + 1];
      if (inFence || next === undefined || !line.trim() || !next.trim()) return line;
      if (/^\s*#{1,6}\s/.test(line) || BLOCK_START.test(next) || line.endsWith("\\")) return line;
      return `${line.trimEnd()}\\`;
    })
    .join("\n");
}

/** HTML for the clipboard, so a paste into Google Docs keeps paragraphs, bold, italics and lists. */
export function coverLetterHtml(body: string): string {
  return `<div style="${DOCUMENT_STYLE}">${renderHtml(letterMarkdown(body))}</div>`;
}

export function inlineText(nodes: ReadonlyArray<InlineNode>): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "inlineCode":
          return node.value;
        case "strong":
        case "emphasis":
        case "strike":
        case "link":
          return inlineText(node.children);
        case "image":
          return node.alt;
        case "break":
          return "\n";
        default:
          return "";
      }
    })
    .join("");
}

function blockText(node: BlockNode): string {
  switch (node.type) {
    case "heading":
    case "paragraph":
      return inlineText(node.children);
    case "code":
      return node.value;
    case "list":
      return node.items
        .map((item, index) => {
          const marker = node.ordered ? `${(node.start ?? 1) + index}.` : "-";
          return `${marker} ${item.children.map(blockText).join("\n")}`;
        })
        .join("\n");
    case "blockquote":
    case "callout":
    case "component":
      return node.children.map(blockText).join("\n\n");
    case "table":
      return [node.header, ...node.rows]
        .map((row) => row.map((cell) => inlineText(cell.children)).join("\t"))
        .join("\n");
    default:
      return "";
  }
}

/** The letter without markdown syntax, for plain-text paste targets. */
export function coverLetterPlainText(body: string): string {
  return parseMarkdown(body)
    .children.map(blockText)
    .filter((text) => text.trim())
    .join("\n\n");
}

/** Copies the letter as rich text with a plain-text fallback for editors that ignore HTML. */
export async function copyCoverLetter(body: string) {
  const text = coverLetterPlainText(body);
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([coverLetterHtml(body)], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    }),
  ]);
}
