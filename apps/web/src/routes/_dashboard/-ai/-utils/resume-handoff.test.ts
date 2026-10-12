// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ResumeHandoff } from "@/features/agentic-tools/definitions/tool-context";
import type { UIMessage } from "@tanstack/ai-react";
import {
  buildHandoffMessage,
  handoffContext,
  handoffPrompt,
  isHandoffMessage,
  queueHandoffPrompt,
  takeHandoffPrompt,
  withoutStackedHandoffs,
} from "./resume-handoff";

const handoff: ResumeHandoff = {
  resumeId: "copy",
  name: "CV for Acme",
  mode: "copy",
  baseResumeName: "CV",
  jobLabel: "Acme — Go Engineer",
  jobAttached: true,
  reason: "It covers Go already.",
  suggestedPrompt: "Tailor the summary.",
};

describe("buildHandoffMessage", () => {
  it("leaves one marker message carrying a short context line", () => {
    const message = buildHandoffMessage(handoff);
    const part = message.parts[0];

    expect(isHandoffMessage(message)).toBe(true);
    expect(message.role).toBe("user");
    expect(part?.type === "text" ? part.content : "").toBe(
      'Context handoff. The dashboard assistant copied "CV" into this résumé for Acme — Go Engineer. The job posting is attached.',
    );
  });

  it("does not mark ordinary messages", () => {
    const message: UIMessage = { id: "1", role: "user", parts: [] };
    expect(isHandoffMessage(message)).toBe(false);
  });

  it("says when the job could not be attached", () => {
    expect(handoffContext({ ...handoff, mode: "reuse", jobAttached: false })).toContain(
      "still targets its previous job",
    );
  });
});

describe("withoutStackedHandoffs", () => {
  it("keeps only the latest of back-to-back handoffs", () => {
    const first = buildHandoffMessage(handoff);
    const second = buildHandoffMessage(handoff);
    const prompt: UIMessage = { id: "p", role: "user", parts: [] };
    const third = buildHandoffMessage(handoff);

    expect(withoutStackedHandoffs([first, second, prompt, third])).toEqual([second, prompt, third]);
  });
});

describe("handoffPrompt", () => {
  it("puts the reason above the suggested prompt", () => {
    expect(handoffPrompt(handoff)).toBe(
      "Why this résumé: It covers Go already.\n\nTailor the summary.",
    );
  });

  it("uses the suggested prompt alone when there is no reason", () => {
    expect(handoffPrompt({ ...handoff, reason: " " })).toBe("Tailor the summary.");
  });
});

describe("handoff prompts", () => {
  it("hands each queued prompt out once", () => {
    queueHandoffPrompt("cv", "Tailor it");

    expect(takeHandoffPrompt("cv")).toBe("Tailor it");
    expect(takeHandoffPrompt("cv")).toBeNull();
  });
});
