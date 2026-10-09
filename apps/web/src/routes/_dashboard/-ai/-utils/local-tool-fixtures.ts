import { afterEach, beforeEach } from "vitest";
import { openTestAppDb } from "@/data-access-layer/event-sourced/app-test-db";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { JobStatus } from "@/data-access-layer/event-sourced/schemas";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";

const embeddable = { searchableText: "", embedding: null, embeddingModel: null };
const lib = { userId: "u1", ...embeddable, createdAt: 1, updatedAt: 1 };

/** A fresh in-memory `AppDb` per test plus row helpers for the local tool tests. Call at the top level of a test file. */
export function useLocalToolDb() {
  let handle: ReturnType<typeof openTestAppDb>;
  let db: AppDb;

  beforeEach(async () => {
    handle = openTestAppDb();
    db = await handle.ensureDb();
  });

  afterEach(() => handle.close());

  return {
    db: () => db,

    context: (activeResumeId = ""): LocalToolContext & { opened: string[] } => {
      let active = activeResumeId;
      const opened: string[] = [];
      return {
        db,
        userId: "u1",
        opened,
        getActiveResumeId: () => active,
        setActiveResumeId: (resumeId) => {
          active = resumeId;
        },
        openResume: (resumeId, tab) => {
          opened.push(`${resumeId}:${tab}`);
        },
      };
    },

    insertJob: (
      id: string,
      fields: {
        company: string;
        title: string;
        description: string;
        status?: JobStatus;
        updatedAt?: number;
      },
    ) => {
      db.collections.job.insert({
        id,
        userId: "u1",
        company: fields.company,
        title: fields.title,
        description: fields.description,
        url: "",
        location: "",
        status: fields.status ?? "saved",
        notes: "",
        appliedAt: null,
        ...embeddable,
        createdAt: 1,
        updatedAt: fields.updatedAt ?? 1,
      });
    },

    insertResume: (
      id: string,
      updatedAt: number,
      fields: { name?: string; headline?: string; jobId?: string; layout?: Partial<ResumeLayout> },
    ) => {
      db.collections.resume.insert({
        ...(fields.layout ? { layout: { ...emptyResumeLayout(), ...fields.layout } } : {}),
        id,
        userId: "u1",
        name: fields.name ?? id,
        fullName: "Ada",
        headline: fields.headline ?? "",
        description: "",
        jobId: fields.jobId ?? null,
        templateId: "classic",
        ...embeddable,
        createdAt: 1,
        updatedAt,
      });
    },

    insertSummary: (id: string, text: string) => {
      db.collections.resumeSummary.insert({ id, text, sortOrder: 0, ...lib });
    },

    insertExperience: (
      id: string,
      company: string,
      bullets: Array<{ id: string; text: string }>,
    ) => {
      db.collections.resumeExperience.insert({
        id,
        company,
        role: "Engineer",
        startDate: "2020",
        endDate: "",
        location: "",
        sortOrder: 0,
        ...lib,
      });
      bullets.forEach((bullet, sortOrder) => {
        db.collections.resumeExperienceBullet.insert({
          id: bullet.id,
          experienceId: id,
          text: bullet.text,
          sortOrder,
          ...lib,
        });
      });
    },
  };
}
