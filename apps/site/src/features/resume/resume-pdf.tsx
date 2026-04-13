import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResumeDocumentV1, SectionKey, TemplateId } from "./resume-schema";

const ACCENT_COLOR = "#c0392b";
const MODERN_COLOR = "#2980b9";

const base = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  name: { fontSize: 18, marginBottom: 4 },
  headline: { fontSize: 11, marginBottom: 6, color: "#333" },
  contact: { fontSize: 9, marginBottom: 8, color: "#555" },
  h2: {
    fontSize: 12,
    marginTop: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  h3: { fontSize: 10, marginTop: 6, marginBottom: 2 },
  body: { fontSize: 9, lineHeight: 1.4, marginBottom: 4 },
  bullet: { fontSize: 9, marginLeft: 8, marginBottom: 2 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  link: { fontSize: 9, color: "#2563eb", marginRight: 8 },
  skillLine: { fontSize: 9, lineHeight: 1.4, color: "#333" },
  separator: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", marginVertical: 6 },
});

function ContactLine({ doc }: { doc: ResumeDocumentV1 }) {
  const parts = [doc.header.email, doc.header.location].filter(Boolean);
  return <Text style={base.contact}>{parts.join("  •  ")}</Text>;
}

function Links({ doc }: { doc: ResumeDocumentV1 }) {
  if (doc.header.links.length === 0) return null;
  return (
    <View style={base.linkRow}>
      {doc.header.links.map((l) => (
        <Link key={l.url + l.label} src={l.url} style={base.link}>
          {l.label}
        </Link>
      ))}
    </View>
  );
}

function Summary({ doc }: { doc: ResumeDocumentV1 }) {
  if (!doc.summary.enabled) return null;
  return (
    <View>
      <Text style={base.h2}>Summary</Text>
      <Text style={base.body}>{doc.summary.text}</Text>
    </View>
  );
}

function Experience({ doc, accentColor }: { doc: ResumeDocumentV1; accentColor?: string }) {
  if (!doc.experience.enabled) return null;
  return (
    <View>
      <Text style={base.h2}>Experience</Text>
      {doc.experience.items.map((ex) => (
        <View key={ex.company + ex.role} wrap={false}>
          <Text style={base.h3}>
            {ex.role} · {accentColor ? "" : ""}
            <Text style={accentColor ? { color: accentColor } : {}}>{ex.company}</Text>
          </Text>
          <Text style={base.body}>
            {ex.start} – {ex.end}
          </Text>
          {ex.bullets.map((b) => (
            <Text key={b} style={base.bullet}>
              • {b}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Education({ doc }: { doc: ResumeDocumentV1 }) {
  if (!doc.education.enabled) return null;
  return (
    <View>
      <Text style={base.h2}>Education</Text>
      {doc.education.items.map((ed) => (
        <Text key={ed.school} style={base.body}>
          {ed.degree} — {ed.school} ({ed.year})
        </Text>
      ))}
    </View>
  );
}

function Projects({ doc }: { doc: ResumeDocumentV1 }) {
  if (!doc.projects.enabled) return null;
  return (
    <View>
      <Text style={base.h2}>Projects</Text>
      {doc.projects.items.map((p) => (
        <View key={p.name} wrap={false}>
          <Link src={p.url} style={base.h3}>
            {p.name}
          </Link>
          <Text style={base.body}>{p.description}</Text>
          {p.tech.length > 0 ? <Text style={base.skillLine}>{p.tech.join(" · ")}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function SkillsFlat({ doc }: { doc: ResumeDocumentV1 }) {
  if (!doc.skills.enabled) return null;
  const all = doc.skills.groups.flatMap((g) => g.items);
  return (
    <View>
      <Text style={base.h2}>Skills</Text>
      {all.length > 0 ? <Text style={base.skillLine}>{all.join(" · ")}</Text> : null}
    </View>
  );
}

function SkillsGrouped({ doc }: { doc: ResumeDocumentV1 }) {
  if (!doc.skills.enabled) return null;
  return (
    <View>
      <Text style={base.h2}>Skills</Text>
      {doc.skills.groups.map((g) => (
        <View key={g.name} style={{ marginBottom: 4 }}>
          <Text style={base.h3}>{g.name}</Text>
          {g.items.length > 0 ? <Text style={base.skillLine}>{g.items.join(", ")}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function SkillsComma({ doc }: { doc: ResumeDocumentV1 }) {
  if (!doc.skills.enabled) return null;
  const all = doc.skills.groups.flatMap((g) => g.items);
  return (
    <View>
      <Text style={base.h2}>Skills</Text>
      {all.length > 0 ? <Text style={base.skillLine}>{all.join(", ")}</Text> : null}
    </View>
  );
}

function ClassicPdf({ doc }: { doc: ResumeDocumentV1 }) {
  const centeredName = StyleSheet.create({
    name: { fontSize: 20, textAlign: "center", marginBottom: 2 },
    headline: { fontSize: 11, textAlign: "center", marginBottom: 4, color: "#333" },
    contact: { fontSize: 9, textAlign: "center", marginBottom: 6, color: "#555" },
    linkRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginBottom: 8 },
  });

  const sectionMap: Record<SectionKey, React.ReactNode> = {
    header: doc.header.enabled ? (
      <View>
        <Text style={centeredName.name}>{doc.header.fullName}</Text>
        <Text style={centeredName.headline}>{doc.header.headline}</Text>
        <Text style={centeredName.contact}>
          {doc.header.email} • {doc.header.location}
        </Text>
        <View style={centeredName.linkRow}>
          {doc.header.links.map((l) => (
            <Link key={l.url + l.label} src={l.url} style={base.link}>
              {l.label}
            </Link>
          ))}
        </View>
      </View>
    ) : null,
    summary: <Summary doc={doc} />,
    experience: <Experience doc={doc} />,
    education: <Education doc={doc} />,
    projects: <Projects doc={doc} />,
    skills: <SkillsFlat doc={doc} />,
  };

  return (
    <Page size="A4" style={base.page}>
      {doc.sectionOrder.map((key) => {
        const node = sectionMap[key];
        return node ? <View key={key}>{node}</View> : null;
      })}
    </Page>
  );
}

function SidebarPdf({ doc }: { doc: ResumeDocumentV1 }) {
  const sidebarStyles = StyleSheet.create({
    twoCol: { flexDirection: "row", gap: 20 },
    main: { flex: 2 },
    side: { flex: 1 },
  });

  const mainKeys: SectionKey[] = ["summary", "experience"];
  const sideKeys: SectionKey[] = ["skills", "education", "projects"];

  const sectionMap: Record<SectionKey, React.ReactNode> = {
    header: null,
    summary: <Summary doc={doc} />,
    experience: <Experience doc={doc} />,
    education: <Education doc={doc} />,
    projects: <Projects doc={doc} />,
    skills: <SkillsGrouped doc={doc} />,
  };

  return (
    <Page size="A4" style={base.page}>
      {doc.header.enabled ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={base.name}>{doc.header.fullName}</Text>
          <Text style={{ ...base.headline }}>{doc.header.headline}</Text>
          <ContactLine doc={doc} />
          <Links doc={doc} />
        </View>
      ) : null}
      <View style={sidebarStyles.twoCol}>
        <View style={sidebarStyles.main}>
          {doc.sectionOrder
            .filter((k) => mainKeys.includes(k))
            .map((key) => {
              const node = sectionMap[key];
              return node ? <View key={key}>{node}</View> : null;
            })}
        </View>
        <View style={sidebarStyles.side}>
          {doc.sectionOrder
            .filter((k) => sideKeys.includes(k))
            .map((key) => {
              const node = sectionMap[key];
              return node ? <View key={key}>{node}</View> : null;
            })}
        </View>
      </View>
    </Page>
  );
}

function AccentPdf({ doc }: { doc: ResumeDocumentV1 }) {
  const accentStyles = StyleSheet.create({
    name: { fontSize: 20, marginBottom: 2 },
    headline: { fontSize: 11, marginBottom: 4, color: "#333" },
    contact: { fontSize: 9, marginBottom: 6, color: ACCENT_COLOR },
    h2: {
      fontSize: 12,
      marginTop: 10,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: ACCENT_COLOR,
    },
  });

  const sectionMap: Record<SectionKey, React.ReactNode> = {
    header: doc.header.enabled ? (
      <View>
        <Text style={accentStyles.name}>{doc.header.fullName}</Text>
        <Text style={accentStyles.headline}>{doc.header.headline}</Text>
        <Text style={accentStyles.contact}>
          {doc.header.email} • {doc.header.location}
        </Text>
        <Links doc={doc} />
      </View>
    ) : null,
    summary: doc.summary.enabled ? (
      <View>
        <Text style={accentStyles.h2}>Summary</Text>
        <Text style={base.body}>{doc.summary.text}</Text>
      </View>
    ) : null,
    experience: doc.experience.enabled ? (
      <View>
        <Text style={accentStyles.h2}>Experience</Text>
        {doc.experience.items.map((ex) => (
          <View key={ex.company + ex.role} wrap={false}>
            <Text style={base.h3}>
              {ex.role} · <Text style={{ color: ACCENT_COLOR }}>{ex.company}</Text>
            </Text>
            <Text style={base.body}>
              {ex.start} – {ex.end}
            </Text>
            {ex.bullets.map((b) => (
              <Text key={b} style={base.bullet}>
                • {b}
              </Text>
            ))}
          </View>
        ))}
      </View>
    ) : null,
    education: doc.education.enabled ? (
      <View>
        <Text style={accentStyles.h2}>Education</Text>
        {doc.education.items.map((ed) => (
          <Text key={ed.school} style={base.body}>
            {ed.degree} — {ed.school} ({ed.year})
          </Text>
        ))}
      </View>
    ) : null,
    projects: doc.projects.enabled ? (
      <View>
        <Text style={accentStyles.h2}>Projects</Text>
        {doc.projects.items.map((p) => (
          <View key={p.name} wrap={false}>
            <Link src={p.url} style={{ ...base.h3, color: ACCENT_COLOR }}>
              {p.name}
            </Link>
            <Text style={base.body}>{p.description}</Text>
            {p.tech.length > 0 ? <Text style={base.skillLine}>{p.tech.join(", ")}</Text> : null}
          </View>
        ))}
      </View>
    ) : null,
    skills: <SkillsComma doc={doc} />,
  };

  return (
    <Page size="A4" style={base.page}>
      {doc.sectionOrder.map((key) => {
        const node = sectionMap[key];
        return node ? <View key={key}>{node}</View> : null;
      })}
    </Page>
  );
}

function ModernPdf({ doc }: { doc: ResumeDocumentV1 }) {
  const modernStyles = StyleSheet.create({
    twoCol: { flexDirection: "row", gap: 20 },
    main: { flex: 3 },
    side: { flex: 2 },
    name: { fontSize: 20, marginBottom: 2, color: MODERN_COLOR },
    headline: { fontSize: 11, marginBottom: 4, color: "#333" },
    contact: { fontSize: 9, marginBottom: 6, color: MODERN_COLOR },
    h2: {
      fontSize: 12,
      marginTop: 10,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: MODERN_COLOR,
    },
  });

  const leftKeys: SectionKey[] = ["experience", "education"];
  const rightKeys: SectionKey[] = ["summary", "skills", "projects"];

  const buildSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        if (!doc.summary.enabled) return null;
        return (
          <View>
            <Text style={modernStyles.h2}>Summary</Text>
            <Text style={base.body}>{doc.summary.text}</Text>
          </View>
        );
      case "experience":
        if (!doc.experience.enabled) return null;
        return (
          <View>
            <Text style={modernStyles.h2}>Experience</Text>
            {doc.experience.items.map((ex) => (
              <View key={ex.company + ex.role} wrap={false}>
                <Text style={base.h3}>
                  {ex.role} · <Text style={{ color: MODERN_COLOR }}>{ex.company}</Text>
                </Text>
                <Text style={base.body}>
                  {ex.start} – {ex.end}
                </Text>
                {ex.bullets.map((b) => (
                  <Text key={b} style={base.bullet}>
                    • {b}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      case "education":
        if (!doc.education.enabled) return null;
        return (
          <View>
            <Text style={modernStyles.h2}>Education</Text>
            {doc.education.items.map((ed) => (
              <Text key={ed.school} style={base.body}>
                {ed.degree} — {ed.school} ({ed.year})
              </Text>
            ))}
          </View>
        );
      case "projects":
        if (!doc.projects.enabled) return null;
        return (
          <View>
            <Text style={modernStyles.h2}>Projects</Text>
            {doc.projects.items.map((p) => (
              <View key={p.name} wrap={false}>
                <Link src={p.url} style={{ ...base.h3, color: MODERN_COLOR }}>
                  {p.name}
                </Link>
                <Text style={base.body}>{p.description}</Text>
                {p.tech.length > 0 ? (
                  <Text style={base.skillLine}>{p.tech.join(" · ")}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      case "skills":
        if (!doc.skills.enabled) return null;
        return (
          <View>
            <Text style={modernStyles.h2}>Skills</Text>
            {doc.skills.groups.map((g) => (
              <View key={g.name} style={{ marginBottom: 4 }}>
                <Text style={base.h3}>{g.name}</Text>
                {g.items.length > 0 ? (
                  <Text style={base.skillLine}>{g.items.join(", ")}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Page size="A4" style={base.page}>
      {doc.header.enabled ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={modernStyles.name}>{doc.header.fullName}</Text>
          <Text style={modernStyles.headline}>{doc.header.headline}</Text>
          <Text style={modernStyles.contact}>
            {doc.header.email} • {doc.header.location}
          </Text>
          <Links doc={doc} />
        </View>
      ) : null}
      <View style={modernStyles.twoCol}>
        <View style={modernStyles.main}>
          {doc.sectionOrder
            .filter((k) => leftKeys.includes(k))
            .map((key) => {
              const node = buildSection(key);
              return node ? <View key={key}>{node}</View> : null;
            })}
        </View>
        <View style={modernStyles.side}>
          {doc.sectionOrder
            .filter((k) => rightKeys.includes(k))
            .map((key) => {
              const node = buildSection(key);
              return node ? <View key={key}>{node}</View> : null;
            })}
        </View>
      </View>
    </Page>
  );
}

const pdfTemplates: Record<TemplateId, (props: { doc: ResumeDocumentV1 }) => React.ReactElement> = {
  classic: ClassicPdf,
  sidebar: SidebarPdf,
  accent: AccentPdf,
  modern: ModernPdf,
};

export function ResumePdfDocument({
  doc,
  templateId,
}: {
  doc: ResumeDocumentV1;
  templateId?: TemplateId;
}) {
  const tid = templateId ?? doc.meta.templateId;
  const Template = pdfTemplates[tid];
  return (
    <Document>
      <Template doc={doc} />
    </Document>
  );
}
