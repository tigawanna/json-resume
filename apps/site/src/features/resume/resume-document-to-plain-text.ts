import type { ResumeDocumentV1 } from "./resume-schema";

export function resumeDocumentToPlainText(doc: ResumeDocumentV1): string {
  const lines: string[] = [];
  const h = doc.header;
  lines.push(`${h.fullName} — ${h.headline}`);
  if (h.email.trim()) lines.push(h.email);
  if (h.location.trim()) lines.push(h.location);
  for (const link of h.links) {
    if (link.label.trim() || link.url.trim()) {
      lines.push(`${link.label}: ${link.url}`);
    }
  }
  lines.push("");
  if (doc.summary.enabled && doc.summary.text.trim()) {
    lines.push("Summary");
    lines.push(doc.summary.text.trim());
    lines.push("");
  }
  if (doc.experience.enabled && doc.experience.items.length > 0) {
    lines.push("Experience");
    for (const ex of doc.experience.items) {
      lines.push(`${ex.role}, ${ex.company} (${ex.start} – ${ex.end})`);
      for (const b of ex.bullets) {
        if (b.trim()) lines.push(`• ${b.trim()}`);
      }
      lines.push("");
    }
  }
  if (doc.education.enabled && doc.education.items.length > 0) {
    lines.push("Education");
    for (const ed of doc.education.items) {
      lines.push(`${ed.degree}, ${ed.school} (${ed.year})`);
    }
    lines.push("");
  }
  if (doc.projects.enabled && doc.projects.items.length > 0) {
    lines.push("Projects");
    for (const p of doc.projects.items) {
      lines.push(`${p.name}${p.url ? ` — ${p.url}` : ""}`);
      if (p.description.trim()) lines.push(p.description.trim());
      if (p.tech.length > 0) lines.push(`Tech: ${p.tech.join(", ")}`);
      lines.push("");
    }
  }
  if (doc.skills.enabled && doc.skills.groups.length > 0) {
    lines.push("Skills");
    for (const g of doc.skills.groups) {
      if (g.items.length > 0) {
        lines.push(`${g.name}: ${g.items.join(", ")}`);
      }
    }
  }
  return lines.join("\n").trim();
}
