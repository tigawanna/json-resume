import { resumeWriteToolNames } from "@/features/agentic-tools/resume-write-tools";
import type { UIMessage } from "@tanstack/ai-react";
import { describe, expect, it } from "vitest";
import {
  answersSavedByReply,
  coverLetterSavedByReply,
  isReplyWritingResume,
} from "./use-resume-ai-preview-panel";

const userMessage: UIMessage = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", content: "Tighten my summary" }],
};

function replyCalling(name: string): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [{ type: "tool-call", id: "call-1", name, arguments: "{}", state: "input-complete" }],
  };
}

describe("resumeWriteToolNames", () => {
  it("covers résumé writes but not job tracker writes", () => {
    expect(resumeWriteToolNames.has("set_summary")).toBe(true);
    expect(resumeWriteToolNames.has("replace_resume_document")).toBe(true);
    expect(resumeWriteToolNames.has("save_job")).toBe(false);
    expect(resumeWriteToolNames.has("get_resume")).toBe(false);
  });
});

describe("isReplyWritingResume", () => {
  it("is true while an in-flight reply writes to a résumé", () => {
    expect(isReplyWritingResume([userMessage], true)).toBe(false);
    expect(isReplyWritingResume([userMessage, replyCalling("set_summary")], true)).toBe(true);
  });

  it("ignores reads and writes from loaded history", () => {
    expect(isReplyWritingResume([userMessage, replyCalling("set_summary")], false)).toBe(false);
    expect(isReplyWritingResume([userMessage, replyCalling("get_resume")], true)).toBe(false);
  });
});

describe("coverLetterSavedByReply", () => {
  const savedLetter: UIMessage = {
    id: "a2",
    role: "assistant",
    parts: [
      {
        type: "tool-call",
        id: "call-2",
        name: "save_cover_letter",
        arguments: "{}",
        state: "input-complete",
        output: {
          created: true,
          coverLetter: {
            id: "letter-1",
            title: "Acme",
            resumeId: "page",
            jobId: null,
            wordCount: 120,
            preview: "Dear team",
            updatedAt: "2026-10-12T10:00:00.000Z",
          },
        },
      },
    ],
  };

  it("returns the letter an in-flight reply saved", () => {
    expect(coverLetterSavedByReply([userMessage, savedLetter], true)).toBe("letter-1");
  });

  it("ignores history and calls that have not finished", () => {
    expect(coverLetterSavedByReply([userMessage, savedLetter], false)).toBeNull();
    expect(
      coverLetterSavedByReply([userMessage, replyCalling("save_cover_letter")], true),
    ).toBeNull();
  });
});

describe("answersSavedByReply", () => {
  const savedAnswers: UIMessage = {
    id: "a3",
    role: "assistant",
    parts: [
      {
        type: "tool-call",
        id: "call-3",
        name: "save_application_answers",
        arguments: "{}",
        state: "input-complete",
        output: {
          created: 1,
          updated: 0,
          answers: [
            {
              id: "answer-1",
              question: "Why Acme?",
              answer: "Because [[reason]].",
              resumeId: "page",
              jobId: "acme",
              jobLabel: "Acme — Engineer",
              wordCount: 2,
              placeholders: 1,
              updatedAt: "2026-10-12T10:00:00.000Z",
            },
          ],
        },
      },
    ],
  };

  it("returns the job whose answers an in-flight reply saved", () => {
    expect(answersSavedByReply([userMessage, savedAnswers], true)).toEqual({ jobId: "acme" });
  });

  it("ignores history and calls that have not finished", () => {
    expect(answersSavedByReply([userMessage, savedAnswers], false)).toBeNull();
    expect(
      answersSavedByReply([userMessage, replyCalling("save_application_answers")], true),
    ).toBeNull();
  });
});
