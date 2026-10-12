import { pdfFileStem } from "@/features/resume/resume-pdf-filename";
import { Document, Link, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BlockNode, InlineNode } from "@tanstack/markdown";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { inlineText, letterMarkdown } from "./cover-letter-format";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 64,
    paddingHorizontal: 68,
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  paragraph: { marginBottom: 10 },
  h1: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  h2: { fontSize: 13, fontWeight: "bold", marginTop: 4, marginBottom: 6 },
  h3: { fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  list: { marginBottom: 10 },
  listItem: { flexDirection: "row", marginBottom: 2 },
  listMarker: { width: 16 },
  listBody: { flex: 1 },
  quote: { marginLeft: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#d4d4d4" },
  code: { fontFamily: "Courier", fontSize: 10 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#d4d4d4", marginVertical: 8 },
  link: { color: "#1d4ed8" },
});

function Inline({ nodes }: { nodes: ReadonlyArray<InlineNode> }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "inlineCode":
        return (
          <Text key={index} style={styles.code}>
            {node.value}
          </Text>
        );
      case "strong":
        return (
          <Text key={index} style={{ fontWeight: "bold" }}>
            <Inline nodes={node.children} />
          </Text>
        );
      case "emphasis":
        return (
          <Text key={index} style={{ fontStyle: "italic" }}>
            <Inline nodes={node.children} />
          </Text>
        );
      case "strike":
        return (
          <Text key={index} style={{ textDecoration: "line-through" }}>
            <Inline nodes={node.children} />
          </Text>
        );
      case "link":
        return (
          <Link key={index} src={node.href} style={styles.link}>
            {inlineText(node.children)}
          </Link>
        );
      case "break":
        return "\n";
      case "image":
        return node.alt;
      default:
        return null;
    }
  });
}

const headingStyles = { 1: styles.h1, 2: styles.h2 } as const;

function Block({ node }: { node: BlockNode }) {
  switch (node.type) {
    case "paragraph":
      return (
        <Text style={styles.paragraph}>
          <Inline nodes={node.children} />
        </Text>
      );
    case "heading":
      return (
        <Text style={node.depth === 1 || node.depth === 2 ? headingStyles[node.depth] : styles.h3}>
          <Inline nodes={node.children} />
        </Text>
      );
    case "list":
      return (
        <View style={styles.list}>
          {node.items.map((item, index) => (
            <View key={index} style={styles.listItem} wrap={false}>
              <Text style={styles.listMarker}>
                {node.ordered ? `${(node.start ?? 1) + index}.` : "•"}
              </Text>
              <View style={styles.listBody}>
                {item.children.map((child, childIndex) =>
                  child.type === "paragraph" ? (
                    <Text key={childIndex}>
                      <Inline nodes={child.children} />
                    </Text>
                  ) : (
                    <Block key={childIndex} node={child} />
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      );
    case "blockquote":
    case "callout":
    case "component":
      return (
        <View style={styles.quote}>
          {node.children.map((child, index) => (
            <Block key={index} node={child} />
          ))}
        </View>
      );
    case "code":
      return <Text style={[styles.code, styles.paragraph]}>{node.value}</Text>;
    case "thematicBreak":
      return <View style={styles.rule} />;
    default:
      return null;
  }
}

export function CoverLetterPdfDocument({ title, body }: { title: string; body: string }) {
  const parsed = parseMarkdown(letterMarkdown(body));
  return (
    <Document title={title} creator="Agentic JSON Resume">
      <Page size="LETTER" style={styles.page}>
        {parsed.children.map((node, index) => (
          <Block key={index} node={node} />
        ))}
      </Page>
    </Document>
  );
}

export function coverLetterFileStem(title: string) {
  return pdfFileStem(title, "cover_letter");
}

export async function downloadCoverLetterPdf(letter: { title: string; body: string }) {
  const blob = await pdf(
    <CoverLetterPdfDocument title={letter.title} body={letter.body} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${coverLetterFileStem(letter.title)}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
