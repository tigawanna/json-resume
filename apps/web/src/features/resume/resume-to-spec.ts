import type { Spec } from "@json-render/core";
import type { ResumeDocumentV1, SectionKey, TemplateId } from "./resume-schema";

type Elements = NonNullable<Spec["elements"]>;

function el(
  id: string,
  type: string,
  props: Record<string, unknown>,
  children: string[] = [],
): Elements[string] {
  return { type, props, children } as Elements[string];
}

interface SpecCtx {
  elements: Elements;
  counter: number;
}

function nid(ctx: SpecCtx): string {
  ctx.counter++;
  return `n${ctx.counter}`;
}

function pushText(ctx: SpecCtx, parent: string[], text: string, variant = "body") {
  const id = nid(ctx);
  ctx.elements[id] = el(id, "Text", { text, variant });
  parent.push(id);
}

function pushHeading(ctx: SpecCtx, parent: string[], text: string, level: "h1" | "h2" | "h3") {
  const id = nid(ctx);
  ctx.elements[id] = el(id, "Heading", { text, level });
  parent.push(id);
}

function pushSeparator(ctx: SpecCtx, parent: string[]) {
  const id = nid(ctx);
  ctx.elements[id] = el(id, "Separator", {});
  parent.push(id);
}

function headerContactParts(doc: ResumeDocumentV1): string[] {
  const extra = (doc.header.contacts ?? []).map((contact) =>
    contact.label.trim() ? `${contact.label}: ${contact.value}` : contact.value,
  );
  return [doc.header.email, doc.header.location, ...extra].filter((part) => part.trim());
}

function buildHeaderChildren(ctx: SpecCtx, doc: ResumeDocumentV1, centered: boolean): string[] {
  const c: string[] = [];
  if (!doc.header.enabled) return c;
  pushHeading(ctx, c, doc.header.fullName, "h1");
  pushText(ctx, c, doc.header.headline);
  const contactParts = headerContactParts(doc);
  if (contactParts.length > 0) {
    pushText(ctx, c, contactParts.join(centered ? "  •  " : " · "));
  }
  if (doc.header.links.length > 0) {
    const linkIds: string[] = [];
    for (const l of doc.header.links) {
      const lid = nid(ctx);
      ctx.elements[lid] = el(lid, "Link", { href: l.url, label: l.label });
      linkIds.push(lid);
    }
    const rowId = nid(ctx);
    ctx.elements[rowId] = el(rowId, "Stack", { direction: "horizontal", gap: "sm" }, linkIds);
    c.push(rowId);
  }
  return c;
}

function buildSummaryChildren(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.summary.enabled) return c;
  pushText(ctx, c, doc.summary.text);
  return c;
}

function buildExperienceChildren(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.experience.enabled) return c;
  for (const ex of doc.experience.items) {
    pushHeading(ctx, c, `${ex.role} · ${ex.company}`, "h3");
    pushText(ctx, c, `${ex.start} – ${ex.end}`);
    for (const b of ex.bullets) {
      pushText(ctx, c, `• ${b}`);
    }
  }
  return c;
}

function buildEducationChildren(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.education.enabled) return c;
  for (const ed of doc.education.items) {
    pushText(ctx, c, `${ed.degree} — ${ed.school} (${ed.year})`);
    if (ed.description?.trim()) pushText(ctx, c, ed.description.trim());
  }
  return c;
}

function buildProjectsChildren(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.projects.enabled) return c;
  for (const p of doc.projects.items) {
    const pid = nid(ctx);
    ctx.elements[pid] = el(pid, "Link", { href: p.url, label: p.name });
    c.push(pid);
    pushText(ctx, c, p.description);
    if (p.tech.length > 0) {
      pushText(ctx, c, p.tech.join(" · "));
    }
  }
  return c;
}

function buildTalksChildren(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.talks.enabled) return c;
  for (const t of doc.talks.items) {
    pushHeading(ctx, c, t.title, "h3");
    const meta = [t.event, t.date].filter((x) => x.trim()).join(" · ");
    if (meta) pushText(ctx, c, meta);
    if (t.links.length > 0) {
      const linkIds: string[] = [];
      for (const l of t.links) {
        if (l.url.trim()) {
          const lid = nid(ctx);
          ctx.elements[lid] = el(lid, "Link", { href: l.url, label: l.label });
          linkIds.push(lid);
        } else if (l.label.trim()) {
          const tid = nid(ctx);
          ctx.elements[tid] = el(tid, "Text", { text: l.label, variant: "body" });
          linkIds.push(tid);
        }
      }
      if (linkIds.length > 0) {
        const rowId = nid(ctx);
        ctx.elements[rowId] = el(rowId, "Stack", { direction: "horizontal", gap: "sm" }, linkIds);
        c.push(rowId);
      }
    }
  }
  return c;
}

function buildSkillsFlat(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.skills.enabled) return c;
  const all = doc.skills.groups.flatMap((g) => g.items);
  if (all.length > 0) {
    pushText(ctx, c, all.join(" · "));
  }
  return c;
}

function buildSkillsGrouped(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.skills.enabled) return c;
  for (const g of doc.skills.groups) {
    pushHeading(ctx, c, g.name, "h3");
    if (g.items.length > 0) {
      pushText(ctx, c, g.items.join(" · "));
    }
  }
  return c;
}

function buildSkillsBadges(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.skills.enabled) return c;
  const badges: string[] = [];
  for (const g of doc.skills.groups) {
    for (const s of g.items) {
      const bid = nid(ctx);
      ctx.elements[bid] = el(bid, "Badge", { text: s, variant: "outline" });
      badges.push(bid);
    }
  }
  if (badges.length > 0) {
    const rowId = nid(ctx);
    ctx.elements[rowId] = el(rowId, "Stack", { direction: "horizontal", gap: "sm" }, badges);
    c.push(rowId);
  }
  return c;
}

function buildNotesChildren(ctx: SpecCtx, doc: ResumeDocumentV1): string[] {
  const c: string[] = [];
  if (!doc.notes.enabled || !doc.notes.text.trim()) return c;
  pushText(ctx, c, doc.notes.text);
  return c;
}

function wrapInCard(ctx: SpecCtx, title: string, children: string[]): string {
  const cardId = nid(ctx);
  ctx.elements[cardId] = el(
    cardId,
    "Card",
    { title, description: null, maxWidth: "full", centered: false },
    children,
  );
  return cardId;
}

function wrapInStack(
  ctx: SpecCtx,
  dir: "vertical" | "horizontal",
  gap: string,
  children: string[],
): string {
  const id = nid(ctx);
  ctx.elements[id] = el(id, "Stack", { direction: dir, gap }, children);
  return id;
}

function buildSection(
  ctx: SpecCtx,
  doc: ResumeDocumentV1,
  key: SectionKey,
  skillsStyle: "flat" | "grouped" | "badges",
  centered: boolean,
): string[] {
  switch (key) {
    case "header":
      return buildHeaderChildren(ctx, doc, centered);
    case "summary":
      return buildSummaryChildren(ctx, doc);
    case "experience":
      return buildExperienceChildren(ctx, doc);
    case "education":
      return buildEducationChildren(ctx, doc);
    case "projects":
      return buildProjectsChildren(ctx, doc);
    case "talks":
      return buildTalksChildren(ctx, doc);
    case "skills":
      if (skillsStyle === "flat") return buildSkillsFlat(ctx, doc);
      if (skillsStyle === "badges") return buildSkillsBadges(ctx, doc);
      return buildSkillsGrouped(ctx, doc);
    case "notes":
      return buildNotesChildren(ctx, doc);
    default:
      return [];
  }
}

function sectionTitle(key: SectionKey, doc: ResumeDocumentV1): string {
  if (key === "header") return "Profile";
  if (key === "notes") return doc.notes.label.trim() || "Notes";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function buildClassicSpec(doc: ResumeDocumentV1): Spec {
  const ctx: SpecCtx = { elements: {}, counter: 0 };
  const rootChildren: string[] = [];

  for (const key of doc.sectionOrder) {
    const children = buildSection(ctx, doc, key, "flat", true);
    if (children.length === 0) continue;
    if (key !== "header") pushSeparator(ctx, rootChildren);
    const cardId = wrapInCard(ctx, sectionTitle(key, doc), children);
    rootChildren.push(cardId);
  }

  const rootId = wrapInStack(ctx, "vertical", "md", rootChildren);
  return { root: rootId, elements: ctx.elements };
}

function buildSidebarSpec(doc: ResumeDocumentV1): Spec {
  const ctx: SpecCtx = { elements: {}, counter: 0 };

  const mainSections: SectionKey[] = ["header", "summary", "experience", "talks"];
  const sidebarSections: SectionKey[] = ["skills", "education", "projects"];

  const mainChildren: string[] = [];
  for (const key of doc.sectionOrder.filter((k) => mainSections.includes(k))) {
    const children = buildSection(ctx, doc, key, "grouped", false);
    if (children.length === 0) continue;
    mainChildren.push(wrapInCard(ctx, sectionTitle(key, doc), children));
  }

  const sideChildren: string[] = [];
  for (const key of doc.sectionOrder.filter((k) => sidebarSections.includes(k))) {
    const children = buildSection(ctx, doc, key, "grouped", false);
    if (children.length === 0) continue;
    sideChildren.push(wrapInCard(ctx, sectionTitle(key, doc), children));
  }

  const mainCol = wrapInStack(ctx, "vertical", "md", mainChildren);
  const sideCol = wrapInStack(ctx, "vertical", "md", sideChildren);

  const gridId = nid(ctx);
  ctx.elements[gridId] = el(gridId, "Grid", { columns: 2, gap: "lg" }, [mainCol, sideCol]);

  const notesChildren = buildNotesChildren(ctx, doc);
  if (notesChildren.length === 0) {
    return { root: gridId, elements: ctx.elements };
  }
  const notesCard = wrapInCard(ctx, sectionTitle("notes", doc), notesChildren);
  const rootId = wrapInStack(ctx, "vertical", "md", [gridId, notesCard]);
  return { root: rootId, elements: ctx.elements };
}

function buildAccentSpec(doc: ResumeDocumentV1): Spec {
  const ctx: SpecCtx = { elements: {}, counter: 0 };
  const rootChildren: string[] = [];

  for (const key of doc.sectionOrder) {
    const children = buildSection(ctx, doc, key, "flat", false);
    if (children.length === 0) continue;
    pushSeparator(ctx, rootChildren);
    const cardId = wrapInCard(ctx, sectionTitle(key, doc), children);
    rootChildren.push(cardId);
  }

  const rootId = wrapInStack(ctx, "vertical", "md", rootChildren);
  return { root: rootId, elements: ctx.elements };
}

function buildModernSpec(doc: ResumeDocumentV1): Spec {
  const ctx: SpecCtx = { elements: {}, counter: 0 };

  const leftSections: SectionKey[] = ["header", "experience", "education", "talks"];
  const rightSections: SectionKey[] = ["summary", "skills", "projects"];

  const leftChildren: string[] = [];
  for (const key of doc.sectionOrder.filter((k) => leftSections.includes(k))) {
    const children = buildSection(ctx, doc, key, "badges", false);
    if (children.length === 0) continue;
    leftChildren.push(wrapInCard(ctx, sectionTitle(key, doc), children));
  }

  const rightChildren: string[] = [];
  for (const key of doc.sectionOrder.filter((k) => rightSections.includes(k))) {
    const children = buildSection(ctx, doc, key, "badges", false);
    if (children.length === 0) continue;
    rightChildren.push(wrapInCard(ctx, sectionTitle(key, doc), children));
  }

  const leftCol = wrapInStack(ctx, "vertical", "md", leftChildren);
  const rightCol = wrapInStack(ctx, "vertical", "md", rightChildren);

  const gridId = nid(ctx);
  ctx.elements[gridId] = el(gridId, "Grid", { columns: 2, gap: "lg" }, [leftCol, rightCol]);

  const notesChildren = buildNotesChildren(ctx, doc);
  if (notesChildren.length === 0) {
    return { root: gridId, elements: ctx.elements };
  }
  const notesCard = wrapInCard(ctx, sectionTitle("notes", doc), notesChildren);
  const rootId = wrapInStack(ctx, "vertical", "md", [gridId, notesCard]);
  return { root: rootId, elements: ctx.elements };
}

const specBuilders: Record<TemplateId, (doc: ResumeDocumentV1) => Spec> = {
  classic: buildClassicSpec,
  sidebar: buildSidebarSpec,
  accent: buildAccentSpec,
  modern: buildModernSpec,
};

export function resumeDocumentToSpec(doc: ResumeDocumentV1, templateId?: TemplateId): Spec {
  const tid = templateId ?? doc.meta.templateId;
  return specBuilders[tid](doc);
}
