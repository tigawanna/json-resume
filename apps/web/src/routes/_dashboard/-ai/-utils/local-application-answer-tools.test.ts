// @vitest-environment node
import {
  applicationAnswersText,
  parseQuestions,
} from "@/data-access-layer/event-sourced/rows/application-answer-rows";
import { describe, expect, it } from "vitest";
import {
  saveLocalApplicationAnswers,
  searchLocalApplicationAnswers,
} from "./local-application-answer-tools";
import { useLocalToolDb } from "./local-tool-fixtures";

const fixture = useLocalToolDb();
const { context, insertJob, insertResume } = fixture;

function seed() {
  insertJob("acme", { company: "Acme", title: "Backend Engineer", description: "Go." });
  insertJob("globex", { company: "Globex", title: "Frontend Engineer", description: "React." });
  insertResume("cv", 1, { name: "CV", jobId: "acme" });
}

describe("save_application_answers", () => {
  it("saves every question in form order under the active résumé's job", () => {
    seed();

    const saved = saveLocalApplicationAnswers(context("cv"), {
      answers: [
        { question: "Why Acme?", answer: "I like Go." },
        {
          question: "Tell us about a time you made something faster.",
          answer: "I cut p99 latency from [[before]] to [[after]].",
        },
      ],
    });

    expect(saved).toMatchObject({ created: 2, updated: 0 });
    expect(saved.answers.map((row) => [row.jobId, row.resumeId, row.jobLabel])).toEqual([
      ["acme", "cv", "Acme — Backend Engineer"],
      ["acme", "cv", "Acme — Backend Engineer"],
    ]);
    expect(saved.answers[1]?.placeholders).toBe(2);
    const rows = fixture.db().collections.applicationAnswer.toArray;
    expect(rows.map((row) => row.sortOrder).sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it("revises a saved answer by id and requires a question for new ones", () => {
    seed();
    const [first] = saveLocalApplicationAnswers(context("cv"), {
      answers: [{ question: "Why Acme?", answer: "Draft." }],
    }).answers;

    const revised = saveLocalApplicationAnswers(context("cv"), {
      answers: [{ answerId: first?.id, answer: "Because of the Go platform team." }],
    });
    expect(revised).toMatchObject({ created: 0, updated: 1 });
    expect(revised.answers[0]).toMatchObject({
      question: "Why Acme?",
      answer: "Because of the Go platform team.",
    });

    expect(() =>
      saveLocalApplicationAnswers(context("cv"), { answers: [{ answer: "No question" }] }),
    ).toThrow(/needs its question/);
  });
});

describe("search_application_answers", () => {
  it("finds past stories by keyword across jobs, or exact answers by id", async () => {
    seed();
    const saved = saveLocalApplicationAnswers(context("cv"), {
      jobId: "globex",
      answers: [
        { question: "A time you improved performance?", answer: "Cut bundle size by 40%." },
        { question: "Why Globex?", answer: "Design systems." },
      ],
    });

    const found = await searchLocalApplicationAnswers(context("cv"), { keyword: "performance" });
    expect(found.answers.map((row) => row.question)).toEqual(["A time you improved performance?"]);

    const byId = await searchLocalApplicationAnswers(context("cv"), {
      answerIds: [saved.answers[1]?.id ?? ""],
      keyword: "performance",
    });
    expect(byId.answers.map((row) => row.question)).toEqual(["Why Globex?"]);
  });
});

describe("answer text helpers", () => {
  it("splits pasted questions and joins answers for a whole-application copy", () => {
    expect(parseQuestions("1. Why us?\n\n- Tell us about a time.\n")).toEqual([
      "Why us?",
      "Tell us about a time.",
    ]);
    expect(
      applicationAnswersText([
        { question: "Why us?", answer: "Because." },
        { question: "A time?", answer: "Once." },
      ]),
    ).toBe("Why us?\n\nBecause.\n\n\nA time?\n\nOnce.");
  });
});
