import { resumeWriteToolNames } from "@/features/agentic-tools/resume-write-tools";
import type { UIMessage } from "@tanstack/ai-react";
import { describe, expect, it } from "vitest";
import { isReplyWritingResume } from "./use-resume-ai-preview-panel";

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
