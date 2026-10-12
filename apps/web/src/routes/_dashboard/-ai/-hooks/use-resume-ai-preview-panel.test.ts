import { resumeWriteToolNames } from "@/features/agentic-tools/resume-write-tools";
import type { UIMessage } from "@tanstack/ai-react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useResumeAiPreviewPanel } from "./use-resume-ai-preview-panel";

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

function renderPanel(initial: { messages: UIMessage[]; isLoading: boolean }) {
  return renderHook((props) => useResumeAiPreviewPanel(props), { initialProps: initial });
}

describe("resumeWriteToolNames", () => {
  it("covers résumé writes but not job tracker writes", () => {
    expect(resumeWriteToolNames.has("set_summary")).toBe(true);
    expect(resumeWriteToolNames.has("replace_resume_document")).toBe(true);
    expect(resumeWriteToolNames.has("save_job")).toBe(false);
    expect(resumeWriteToolNames.has("get_resume")).toBe(false);
  });
});

describe("useResumeAiPreviewPanel", () => {
  it("opens when an in-flight reply writes to a résumé", () => {
    const { result, rerender } = renderPanel({ messages: [userMessage], isLoading: true });
    expect(result.current.open).toBe(false);

    rerender({ messages: [userMessage, replyCalling("set_summary")], isLoading: true });
    expect(result.current.open).toBe(true);
  });

  it("ignores reads and writes from loaded history", () => {
    const { result, rerender } = renderPanel({
      messages: [userMessage, replyCalling("set_summary")],
      isLoading: false,
    });
    expect(result.current.open).toBe(false);

    rerender({ messages: [userMessage, replyCalling("get_resume")], isLoading: true });
    expect(result.current.open).toBe(false);
  });

  it("stays closed after the user closes it until the chat is cleared", () => {
    const writing = { messages: [userMessage, replyCalling("set_skills")], isLoading: true };
    const { result, rerender } = renderPanel(writing);
    expect(result.current.open).toBe(true);

    act(() => result.current.close());
    rerender({ ...writing, messages: [...writing.messages] });
    expect(result.current.open).toBe(false);

    rerender({ messages: [], isLoading: false });
    rerender(writing);
    expect(result.current.open).toBe(true);
  });
});
