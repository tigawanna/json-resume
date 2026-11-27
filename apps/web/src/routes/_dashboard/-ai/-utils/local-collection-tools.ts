import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import type {
  MutateCollection,
  QueryCollection,
} from "@repo/isomorphic/agentic/tool-schemas/assistant-data";
import {
  mutateCollectionToolDefinition,
  queryCollectionToolDefinition,
  searchConversationsToolDefinition,
} from "@/features/agentic-tools/definitions/assistant-data-definitions";
import type { DashboardToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { nextOffset, searchTerms } from "@repo/isomorphic/agentic/search-page";
import { ownedChildren, rowsToDeleteWith } from "@/modules/library/library-references";
import { joinSearchable, newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import {
  applicationAnswerSchema,
  assistantSkillSchema,
  coverLetterSchema,
  jobSchema,
  resumeCertificationSchema,
  resumeContactSchema,
  resumeEducationBulletSchema,
  resumeEducationSchema,
  resumeExperienceSchema,
  resumeLanguageSchema,
  resumeLinkSchema,
  resumeNoteSchema,
  resumeProjectSchema,
  resumeSkillGroupSchema,
  resumeSkillSchema,
  resumeSummarySchema,
  resumeTalkSchema,
  resumeVolunteerSchema,
  savedProjectSchema,
  type ApplicationAnswer,
  type AssistantSkill,
  type CoverLetter,
  type Job,
  type ResumeCertification,
  type ResumeContact,
  type ResumeEducation,
  type ResumeEducationBullet,
  type ResumeExperience,
  type ResumeLanguage,
  type ResumeLink,
  type ResumeProject,
  type ResumeSkill,
  type ResumeSkillGroup,
  type ResumeTalk,
  type ResumeVolunteer,
  type SavedProject,
} from "@/data-access-layer/event-sourced/schemas";
import { z } from "zod";
import { searchAssistantConversations, type AssistantStore } from "./assistant-conversations";

type ToolCtx = { context: DashboardToolContext };

const HIDDEN = new Set([
  "userId",
  "embedding",
  "embeddingModel",
  "embeddingDimensions",
  "searchableText",
]);

const SEARCH_FIELDS: Record<QueryCollection, readonly string[]> = {
  resumeExperience: ["company", "role", "location"],
  resumeExperienceBullet: ["text"],
  resumeEducation: ["school", "degree", "field", "description"],
  resumeEducationBullet: ["text"],
  resumeSkillGroup: ["name"],
  resumeSkill: ["name", "level"],
  resumeContact: ["type", "value", "label"],
  resumeProject: ["name", "description", "tech"],
  resumeSummary: ["text"],
  resumeNote: ["label", "text"],
  resumeLink: ["label", "url"],
  resumeLanguage: ["name", "proficiency"],
  resumeCertification: ["name", "issuer"],
  resumeVolunteer: ["organization", "role", "description"],
  resumeTalk: ["title", "event", "description"],
  savedProject: ["name", "description", "tech"],
  job: ["company", "title", "description", "notes", "location"],
  coverLetter: ["title", "body"],
  applicationAnswer: ["question", "answer"],
  assistantSkill: ["name", "body"],
};

function collectionRows(db: AppDb, name: string): ReadonlyArray<object> {
  switch (name) {
    case "resumeExperience":
      return db.collections.resumeExperience.toArray;
    case "resumeExperienceBullet":
      return db.collections.resumeExperienceBullet.toArray;
    case "resumeEducation":
      return db.collections.resumeEducation.toArray;
    case "resumeEducationBullet":
      return db.collections.resumeEducationBullet.toArray;
    case "resumeSkillGroup":
      return db.collections.resumeSkillGroup.toArray;
    case "resumeSkill":
      return db.collections.resumeSkill.toArray;
    case "resumeContact":
      return db.collections.resumeContact.toArray;
    case "resumeProject":
      return db.collections.resumeProject.toArray;
    case "resumeSummary":
      return db.collections.resumeSummary.toArray;
    case "resumeNote":
      return db.collections.resumeNote.toArray;
    case "resumeLink":
      return db.collections.resumeLink.toArray;
    case "resumeLanguage":
      return db.collections.resumeLanguage.toArray;
    case "resumeCertification":
      return db.collections.resumeCertification.toArray;
    case "resumeVolunteer":
      return db.collections.resumeVolunteer.toArray;
    case "resumeTalk":
      return db.collections.resumeTalk.toArray;
    case "savedProject":
      return db.collections.savedProject.toArray;
    case "job":
      return db.collections.job.toArray;
    case "coverLetter":
      return db.collections.coverLetter.toArray;
    case "applicationAnswer":
      return db.collections.applicationAnswer.toArray;
    case "assistantSkill":
      return db.collections.assistantSkill.toArray;
    default:
      return [];
  }
}

function userIdOf(row: object) {
  if (!("userId" in row)) return null;
  return typeof row.userId === "string" ? row.userId : null;
}

function updatedAtOf(row: object) {
  if (!("updatedAt" in row) || typeof row.updatedAt !== "number") return 0;
  return row.updatedAt;
}

function idOf(row: object) {
  if (!("id" in row) || typeof row.id !== "string") return "";
  return row.id;
}

function publicFields(row: object) {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (HIDDEN.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      out[key] = value.join(", ");
    }
  }
  return out;
}

function fieldText(row: object, field: string) {
  if (!(field in row)) return "";
  const value = row[field as keyof typeof row];
  return typeof value === "string" ? value : "";
}

export function queryCollection(
  context: DashboardToolContext,
  input: {
    collection: QueryCollection;
    id?: string;
    keyword?: string;
    limit?: number;
    offset?: number;
  },
) {
  const rows = collectionRows(context.db, input.collection).filter((row) => {
    const owner = userIdOf(row);
    return !owner || owner === context.userId;
  });
  if (input.id) {
    const row = rows.find((item) => idOf(item) === input.id);
    if (!row) throw new Error(`No ${input.collection} row with id ${input.id}.`);
    return { collection: input.collection, items: [publicFields(row)], total: 1, nextOffset: null };
  }
  const terms = searchTerms(input.keyword);
  const fields = SEARCH_FIELDS[input.collection];
  const matched = rows.filter((row) => {
    if (terms.length === 0) return true;
    const haystack = fields
      .map((field) => fieldText(row, field))
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  matched.sort((a, b) => updatedAtOf(b) - updatedAtOf(a));
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;
  const page = matched.slice(offset, offset + limit).map(publicFields);
  return {
    collection: input.collection,
    items: page,
    total: matched.length,
    nextOffset: nextOffset(matched.length, offset, page.length),
  };
}

function parsePatch<Shape extends z.ZodRawShape>(shape: Shape, values: Record<string, unknown>) {
  const allowed = new Set(Object.keys(shape));
  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) throw new Error(`Unknown field "${key}".`);
  }
  return z.object(shape).parse(values);
}

function requireFields(patch: object, fields: readonly string[]) {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) record[key] = value;
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string") {
      if (value.trim() === "") throw new Error(`insert requires ${field}.`);
      continue;
    }
    if (value === undefined || value === null) throw new Error(`insert requires ${field}.`);
  }
}

function embeddable(text: string) {
  return { searchableText: text, embedding: null, embeddingModel: null };
}

function deleteRow(db: AppDb, collection: string, id: string) {
  const children = rowsToDeleteWith(collection, id, (child) =>
    collectionRows(db, child).map((row) => ({ ...row })),
  );
  if (children.length > 0 && !(collection in ownedChildren)) {
    throw new Error(
      `Delete the child rows first (${children.map((child) => `${child.collectionId} ${child.id}`).join(", ")}).`,
    );
  }
  deleteWithReferences(db, collection, id);
}

const noteShape = {
  label: z.string().optional(),
  text: z.string().optional(),
  sortOrder: z.number().optional(),
};

function touchSearch(row: { searchableText: string }, parts: Array<string | null | undefined>) {
  row.searchableText = joinSearchable(...parts);
}

export function mutateCollection(
  context: DashboardToolContext,
  input: {
    collection: MutateCollection;
    op: "insert" | "update" | "delete";
    id?: string;
    values?: Record<string, unknown>;
  },
) {
  if (context.getToolPack() === "none") {
    throw new Error("This page does not allow row changes.");
  }
  if (input.op !== "insert" && !input.id) throw new Error(`${input.op} requires id.`);
  const values = input.values ?? {};
  const title = applyMutation(context, input.collection, input.op, input.id, values);
  return { collection: input.collection, op: input.op, id: title.id, title: title.title };
}

function applyMutation(
  context: DashboardToolContext,
  collection: MutateCollection,
  op: "insert" | "update" | "delete",
  id: string | undefined,
  values: Record<string, unknown>,
): { id: string; title: string } {
  const db = context.db;
  const userId = context.userId;
  if (op === "delete") {
    if (!id) throw new Error("delete requires id.");
    const rows = collectionRows(db, collection);
    const row = rows.find((item) => idOf(item) === id);
    if (!row) throw new Error(`No ${collection} row with id ${id}.`);
    const title =
      fieldText(row, "title") ||
      fieldText(row, "name") ||
      fieldText(row, "label") ||
      fieldText(row, "role") ||
      id;
    deleteRow(db, collection, id);
    return { id, title };
  }

  switch (collection) {
    case "resumeNote":
      return writeNote(db, userId, op, id, parsePatch(noteShape, values));
    case "resumeSummary":
      return writeSummary(
        db,
        userId,
        op,
        id,
        parsePatch({ text: z.string().optional(), sortOrder: z.number().optional() }, values),
      );
    case "resumeExperience":
      return writeExperience(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            company: z.string().optional(),
            role: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            location: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeEducation":
      return writeEducation(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            school: z.string().optional(),
            degree: z.string().optional(),
            field: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            description: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeEducationBullet":
      return writeEducationBullet(
        db,
        op,
        id,
        parsePatch(
          {
            educationId: z.string().optional(),
            text: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeSkillGroup":
      return writeSkillGroup(
        db,
        userId,
        op,
        id,
        parsePatch({ name: z.string().optional(), sortOrder: z.number().optional() }, values),
      );
    case "resumeSkill":
      return writeSkill(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            name: z.string().optional(),
            level: z.string().nullable().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeContact":
      return writeContact(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            type: z.string().optional(),
            value: z.string().optional(),
            label: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeProject":
      return writeProject(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            name: z.string().optional(),
            url: z.string().optional(),
            homepageUrl: z.string().optional(),
            description: z.string().optional(),
            tech: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeLink":
      return writeLink(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            label: z.string().optional(),
            url: z.string().optional(),
            icon: z.string().nullable().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeLanguage":
      return writeLanguage(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            name: z.string().optional(),
            proficiency: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeCertification":
      return writeCertification(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            name: z.string().optional(),
            issuer: z.string().optional(),
            date: z.string().optional(),
            url: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeVolunteer":
      return writeVolunteer(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            organization: z.string().optional(),
            role: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            description: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "resumeTalk":
      return writeTalk(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            title: z.string().optional(),
            event: z.string().optional(),
            date: z.string().optional(),
            description: z.string().optional(),
            links: z.string().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "savedProject":
      return writeSavedProject(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            name: z.string().optional(),
            url: z.string().optional(),
            homepageUrl: z.string().optional(),
            description: z.string().optional(),
            tech: z.string().optional(),
          },
          values,
        ),
      );
    case "job":
      return writeJob(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            company: z.string().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            url: z.string().optional(),
            location: z.string().optional(),
            payRate: z.string().optional(),
            status: jobSchema.shape.status.optional(),
            notes: z.string().optional(),
          },
          values,
        ),
      );
    case "coverLetter":
      return writeCoverLetter(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            title: z.string().optional(),
            body: z.string().optional(),
            resumeId: z.string().nullable().optional(),
            jobId: z.string().nullable().optional(),
          },
          values,
        ),
      );
    case "applicationAnswer":
      return writeAnswer(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            question: z.string().optional(),
            answer: z.string().optional(),
            resumeId: z.string().nullable().optional(),
            jobId: z.string().nullable().optional(),
            sortOrder: z.number().optional(),
          },
          values,
        ),
      );
    case "assistantSkill":
      return writeSkillDoc(
        db,
        userId,
        op,
        id,
        parsePatch(
          {
            name: z.string().optional(),
            body: z.string().optional(),
            scopes: z.array(assistantSkillSchema.shape.scopes.element).optional(),
            isDefault: z.boolean().optional(),
          },
          values,
        ),
      );
    default: {
      const unreachable: never = collection;
      void unreachable;
      throw new Error("mutate_collection cannot change this collection.");
    }
  }
}

function writeNote(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: { label?: string; text?: string; sortOrder?: number },
) {
  if (op === "insert") {
    requireFields(patch, ["label", "text"]);
    const ts = nowMs();
    const row = resumeNoteSchema.parse({
      id: newId(),
      userId: userId || null,
      label: patch.label,
      text: patch.text,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.label, patch.text)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeNote.insert(row);
    return { id: row.id, title: row.label };
  }
  const rowId = id ?? "";
  db.collections.resumeNote.update(rowId, (row) => {
    if (patch.label !== undefined) row.label = patch.label;
    if (patch.text !== undefined) row.text = patch.text;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.label, row.text]);
  });
  return { id: rowId, title: db.collections.resumeNote.get(rowId)?.label ?? rowId };
}

function writeSummary(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: { text?: string; sortOrder?: number },
) {
  if (op === "insert") {
    requireFields(patch, ["text"]);
    const ts = nowMs();
    const row = resumeSummarySchema.parse({
      id: newId(),
      userId: userId || null,
      text: patch.text,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.text)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeSummary.insert(row);
    return { id: row.id, title: row.text.slice(0, 80) };
  }
  const rowId = id ?? "";
  db.collections.resumeSummary.update(rowId, (row) => {
    if (patch.text !== undefined) row.text = patch.text;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.text]);
  });
  const text = db.collections.resumeSummary.get(rowId)?.text ?? rowId;
  return { id: rowId, title: text.slice(0, 80) };
}

function writeExperience(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<ResumeExperience, "company" | "role" | "startDate" | "endDate" | "location" | "sortOrder">
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["company", "role"]);
    const ts = nowMs();
    const row = resumeExperienceSchema.parse({
      id: newId(),
      userId: userId || null,
      company: patch.company,
      role: patch.role,
      startDate: patch.startDate ?? "",
      endDate: patch.endDate ?? "",
      location: patch.location ?? "",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.company, patch.role)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeExperience.insert(row);
    return { id: row.id, title: row.role };
  }
  const rowId = id ?? "";
  db.collections.resumeExperience.update(rowId, (row) => {
    if (patch.company !== undefined) row.company = patch.company;
    if (patch.role !== undefined) row.role = patch.role;
    if (patch.startDate !== undefined) row.startDate = patch.startDate;
    if (patch.endDate !== undefined) row.endDate = patch.endDate;
    if (patch.location !== undefined) row.location = patch.location;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.company, row.role, row.location]);
  });
  return { id: rowId, title: db.collections.resumeExperience.get(rowId)?.role ?? rowId };
}

function writeEducation(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<
      ResumeEducation,
      "school" | "degree" | "field" | "startDate" | "endDate" | "description" | "sortOrder"
    >
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["school"]);
    const ts = nowMs();
    const row = resumeEducationSchema.parse({
      id: newId(),
      userId: userId || null,
      school: patch.school,
      degree: patch.degree ?? "",
      field: patch.field ?? "",
      startDate: patch.startDate ?? "",
      endDate: patch.endDate ?? "",
      description: patch.description ?? "",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.school, patch.degree, patch.field)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeEducation.insert(row);
    return { id: row.id, title: row.school };
  }
  const rowId = id ?? "";
  db.collections.resumeEducation.update(rowId, (row) => {
    if (patch.school !== undefined) row.school = patch.school;
    if (patch.degree !== undefined) row.degree = patch.degree;
    if (patch.field !== undefined) row.field = patch.field;
    if (patch.startDate !== undefined) row.startDate = patch.startDate;
    if (patch.endDate !== undefined) row.endDate = patch.endDate;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.school, row.degree, row.field, row.description]);
  });
  return { id: rowId, title: db.collections.resumeEducation.get(rowId)?.school ?? rowId };
}

function writeEducationBullet(
  db: AppDb,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeEducationBullet, "educationId" | "text" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["educationId", "text"]);
    const ts = nowMs();
    const row = resumeEducationBulletSchema.parse({
      id: newId(),
      educationId: patch.educationId,
      text: patch.text,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.text)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeEducationBullet.insert(row);
    return { id: row.id, title: row.text.slice(0, 80) };
  }
  const rowId = id ?? "";
  db.collections.resumeEducationBullet.update(rowId, (row) => {
    if (patch.educationId !== undefined) row.educationId = patch.educationId;
    if (patch.text !== undefined) row.text = patch.text;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.text]);
  });
  const text = db.collections.resumeEducationBullet.get(rowId)?.text ?? rowId;
  return { id: rowId, title: text.slice(0, 80) };
}

function writeSkillGroup(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeSkillGroup, "name" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["name"]);
    const ts = nowMs();
    const row = resumeSkillGroupSchema.parse({
      id: newId(),
      userId: userId || null,
      name: patch.name,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.name)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeSkillGroup.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.resumeSkillGroup.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.name]);
  });
  return { id: rowId, title: db.collections.resumeSkillGroup.get(rowId)?.name ?? rowId };
}

function writeSkill(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeSkill, "name" | "level" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["name"]);
    const ts = nowMs();
    const row = resumeSkillSchema.parse({
      id: newId(),
      userId: userId || null,
      name: patch.name,
      level: patch.level ?? null,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.name, patch.level)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeSkill.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.resumeSkill.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.level !== undefined) row.level = patch.level;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.name, row.level]);
  });
  return { id: rowId, title: db.collections.resumeSkill.get(rowId)?.name ?? rowId };
}

function writeContact(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeContact, "type" | "value" | "label" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["value"]);
    const ts = nowMs();
    const row = resumeContactSchema.parse({
      id: newId(),
      userId: userId || null,
      type: patch.type ?? "",
      value: patch.value,
      label: patch.label ?? "",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.type, patch.value, patch.label)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeContact.insert(row);
    return { id: row.id, title: row.value };
  }
  const rowId = id ?? "";
  db.collections.resumeContact.update(rowId, (row) => {
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.value !== undefined) row.value = patch.value;
    if (patch.label !== undefined) row.label = patch.label;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.type, row.value, row.label]);
  });
  return { id: rowId, title: db.collections.resumeContact.get(rowId)?.value ?? rowId };
}

function writeProject(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<ResumeProject, "name" | "url" | "homepageUrl" | "description" | "tech" | "sortOrder">
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["name"]);
    const ts = nowMs();
    const row = resumeProjectSchema.parse({
      id: newId(),
      userId: userId || null,
      name: patch.name,
      url: patch.url ?? "",
      homepageUrl: patch.homepageUrl ?? "",
      description: patch.description ?? "",
      tech: patch.tech ?? "[]",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.name, patch.description)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeProject.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.resumeProject.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.homepageUrl !== undefined) row.homepageUrl = patch.homepageUrl;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.tech !== undefined) row.tech = patch.tech;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.name, row.description, row.tech]);
  });
  return { id: rowId, title: db.collections.resumeProject.get(rowId)?.name ?? rowId };
}

function writeLink(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeLink, "label" | "url" | "icon" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["label", "url"]);
    const ts = nowMs();
    const row = resumeLinkSchema.parse({
      id: newId(),
      userId: userId || null,
      label: patch.label,
      url: patch.url,
      icon: patch.icon ?? null,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.label, patch.url)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeLink.insert(row);
    return { id: row.id, title: row.label };
  }
  const rowId = id ?? "";
  db.collections.resumeLink.update(rowId, (row) => {
    if (patch.label !== undefined) row.label = patch.label;
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.icon !== undefined) row.icon = patch.icon;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.label, row.url]);
  });
  return { id: rowId, title: db.collections.resumeLink.get(rowId)?.label ?? rowId };
}

function writeLanguage(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeLanguage, "name" | "proficiency" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["name"]);
    const ts = nowMs();
    const row = resumeLanguageSchema.parse({
      id: newId(),
      userId: userId || null,
      name: patch.name,
      proficiency: patch.proficiency ?? "",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.name, patch.proficiency)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeLanguage.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.resumeLanguage.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.proficiency !== undefined) row.proficiency = patch.proficiency;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.name, row.proficiency]);
  });
  return { id: rowId, title: db.collections.resumeLanguage.get(rowId)?.name ?? rowId };
}

function writeCertification(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<ResumeCertification, "name" | "issuer" | "date" | "url" | "sortOrder">>,
) {
  if (op === "insert") {
    requireFields(patch, ["name"]);
    const ts = nowMs();
    const row = resumeCertificationSchema.parse({
      id: newId(),
      userId: userId || null,
      name: patch.name,
      issuer: patch.issuer ?? "",
      date: patch.date ?? "",
      url: patch.url ?? "",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.name, patch.issuer)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeCertification.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.resumeCertification.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.issuer !== undefined) row.issuer = patch.issuer;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.name, row.issuer]);
  });
  return { id: rowId, title: db.collections.resumeCertification.get(rowId)?.name ?? rowId };
}

function writeVolunteer(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<
      ResumeVolunteer,
      "organization" | "role" | "startDate" | "endDate" | "description" | "sortOrder"
    >
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["organization"]);
    const ts = nowMs();
    const row = resumeVolunteerSchema.parse({
      id: newId(),
      userId: userId || null,
      organization: patch.organization,
      role: patch.role ?? "",
      startDate: patch.startDate ?? "",
      endDate: patch.endDate ?? "",
      description: patch.description ?? "",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.organization, patch.role)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeVolunteer.insert(row);
    return { id: row.id, title: row.organization };
  }
  const rowId = id ?? "";
  db.collections.resumeVolunteer.update(rowId, (row) => {
    if (patch.organization !== undefined) row.organization = patch.organization;
    if (patch.role !== undefined) row.role = patch.role;
    if (patch.startDate !== undefined) row.startDate = patch.startDate;
    if (patch.endDate !== undefined) row.endDate = patch.endDate;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.organization, row.role, row.description]);
  });
  return { id: rowId, title: db.collections.resumeVolunteer.get(rowId)?.organization ?? rowId };
}

function writeTalk(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<ResumeTalk, "title" | "event" | "date" | "description" | "links" | "sortOrder">
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["title"]);
    const ts = nowMs();
    const row = resumeTalkSchema.parse({
      id: newId(),
      userId: userId || null,
      title: patch.title,
      event: patch.event ?? "",
      date: patch.date ?? "",
      description: patch.description ?? "",
      links: patch.links ?? "[]",
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.title, patch.event)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.resumeTalk.insert(row);
    return { id: row.id, title: row.title };
  }
  const rowId = id ?? "";
  db.collections.resumeTalk.update(rowId, (row) => {
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.event !== undefined) row.event = patch.event;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.links !== undefined) row.links = patch.links;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.title, row.event, row.description]);
  });
  return { id: rowId, title: db.collections.resumeTalk.get(rowId)?.title ?? rowId };
}

function writeSavedProject(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<SavedProject, "name" | "url" | "homepageUrl" | "description" | "tech">>,
) {
  if (op === "insert") {
    requireFields(patch, ["name"]);
    const ts = nowMs();
    const row = savedProjectSchema.parse({
      id: newId(),
      userId,
      name: patch.name,
      url: patch.url ?? "",
      homepageUrl: patch.homepageUrl ?? "",
      description: patch.description ?? "",
      tech: patch.tech ?? "[]",
      searchableText: joinSearchable(patch.name, patch.description),
      embedding: null,
      embeddingDimensions: null,
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.savedProject.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.savedProject.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.homepageUrl !== undefined) row.homepageUrl = patch.homepageUrl;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.tech !== undefined) row.tech = patch.tech;
    row.updatedAt = nowMs();
    row.searchableText = joinSearchable(row.name, row.description, row.tech);
  });
  return { id: rowId, title: db.collections.savedProject.get(rowId)?.name ?? rowId };
}

function writeJob(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<
      Job,
      "company" | "title" | "description" | "url" | "location" | "payRate" | "status" | "notes"
    >
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["description"]);
    const ts = nowMs();
    const row = jobSchema.parse({
      id: newId(),
      userId: userId || null,
      company: patch.company ?? "",
      title: patch.title ?? "",
      description: patch.description,
      url: patch.url ?? "",
      location: patch.location ?? "",
      payRate: patch.payRate ?? "",
      hourlyMinCents: null,
      hourlyMaxCents: null,
      payBasis: null,
      status: patch.status ?? "saved",
      notes: patch.notes ?? "",
      appliedAt: null,
      ...embeddable(joinSearchable(patch.company, patch.title, patch.description)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.job.insert(row);
    return { id: row.id, title: row.title || row.company || row.id };
  }
  const rowId = id ?? "";
  db.collections.job.update(rowId, (row) => {
    if (patch.company !== undefined) row.company = patch.company;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.location !== undefined) row.location = patch.location;
    if (patch.payRate !== undefined) row.payRate = patch.payRate;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.notes !== undefined) row.notes = patch.notes;
    row.updatedAt = nowMs();
    touchSearch(row, [row.company, row.title, row.description, row.notes]);
  });
  const row = db.collections.job.get(rowId);
  return { id: rowId, title: row?.title || row?.company || rowId };
}

function writeCoverLetter(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<CoverLetter, "title" | "body" | "resumeId" | "jobId">>,
) {
  if (op === "insert") {
    requireFields(patch, ["title", "body"]);
    const ts = nowMs();
    const row = coverLetterSchema.parse({
      id: newId(),
      userId: userId || null,
      title: patch.title,
      body: patch.body,
      resumeId: patch.resumeId ?? null,
      jobId: patch.jobId ?? null,
      ...embeddable(joinSearchable(patch.title, patch.body)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.coverLetter.insert(row);
    return { id: row.id, title: row.title };
  }
  const rowId = id ?? "";
  db.collections.coverLetter.update(rowId, (row) => {
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.resumeId !== undefined) row.resumeId = patch.resumeId;
    if (patch.jobId !== undefined) row.jobId = patch.jobId;
    row.updatedAt = nowMs();
    touchSearch(row, [row.title, row.body]);
  });
  return { id: rowId, title: db.collections.coverLetter.get(rowId)?.title ?? rowId };
}

function writeAnswer(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<
    Pick<ApplicationAnswer, "question" | "answer" | "resumeId" | "jobId" | "sortOrder">
  >,
) {
  if (op === "insert") {
    requireFields(patch, ["question", "answer"]);
    const ts = nowMs();
    const row = applicationAnswerSchema.parse({
      id: newId(),
      userId: userId || null,
      question: patch.question,
      answer: patch.answer,
      resumeId: patch.resumeId ?? null,
      jobId: patch.jobId ?? null,
      sortOrder: patch.sortOrder ?? 0,
      ...embeddable(joinSearchable(patch.question, patch.answer)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.applicationAnswer.insert(row);
    return { id: row.id, title: row.question.slice(0, 80) };
  }
  const rowId = id ?? "";
  db.collections.applicationAnswer.update(rowId, (row) => {
    if (patch.question !== undefined) row.question = patch.question;
    if (patch.answer !== undefined) row.answer = patch.answer;
    if (patch.resumeId !== undefined) row.resumeId = patch.resumeId;
    if (patch.jobId !== undefined) row.jobId = patch.jobId;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    row.updatedAt = nowMs();
    touchSearch(row, [row.question, row.answer]);
  });
  const question = db.collections.applicationAnswer.get(rowId)?.question ?? rowId;
  return { id: rowId, title: question.slice(0, 80) };
}

function writeSkillDoc(
  db: AppDb,
  userId: string,
  op: "insert" | "update",
  id: string | undefined,
  patch: Partial<Pick<AssistantSkill, "name" | "body" | "scopes" | "isDefault">>,
) {
  if (op === "insert") {
    requireFields(patch, ["name", "body"]);
    const ts = nowMs();
    const row = assistantSkillSchema.parse({
      id: newId(),
      userId: userId || null,
      name: patch.name,
      body: patch.body,
      scopes: patch.scopes ?? ["dashboard"],
      isDefault: patch.isDefault ?? false,
      builtinKey: null,
      ...embeddable(joinSearchable(patch.name, patch.body)),
      createdAt: ts,
      updatedAt: ts,
    });
    db.collections.assistantSkill.insert(row);
    return { id: row.id, title: row.name };
  }
  const rowId = id ?? "";
  db.collections.assistantSkill.update(rowId, (row) => {
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.scopes !== undefined) row.scopes = patch.scopes;
    if (patch.isDefault !== undefined) row.isDefault = patch.isDefault;
    row.updatedAt = nowMs();
    touchSearch(row, [row.name, row.body]);
  });
  return { id: rowId, title: db.collections.assistantSkill.get(rowId)?.name ?? rowId };
}

export function assertMutateCollection(name: string): asserts name is MutateCollection {
  if (name === "resume" || name === "settings" || name === "resumeExperienceBullet") {
    throw new Error(`mutate_collection cannot change "${name}".`);
  }
}

export const queryCollectionClientTool = queryCollectionToolDefinition.client(
  (input, ctx: ToolCtx) => queryCollection(ctx.context, input),
);

export const mutateCollectionClientTool = mutateCollectionToolDefinition.client(
  (input, ctx: ToolCtx) => mutateCollection(ctx.context, input),
);

export const searchConversationsClientTool = searchConversationsToolDefinition.client(
  (input, ctx: ToolCtx) => {
    const store: AssistantStore = localStorage;
    return searchAssistantConversations(
      store,
      ctx.context.userId,
      input,
      ctx.context.getActiveConversationId(),
    );
  },
);
