import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  askUserToolInputSchema,
  type AskUserToolInput,
  type AskUserToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { answerAskUser } from "@/routes/_dashboard/-ai/-utils/client-tools";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState } from "react";

type AskUserPart = {
  id: string;
  arguments: string;
  input?: AskUserToolInput;
  output?: AskUserToolOutput;
};

function readQuestion(part: AskUserPart): AskUserToolInput | null {
  if (part.input?.question && (part.input.options?.length ?? 0) > 0) return part.input;
  try {
    const parsed = askUserToolInputSchema.safeParse(JSON.parse(part.arguments));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function answerText(output: AskUserToolOutput) {
  const labels = output.selected.map((choice) => choice.label);
  if (output.other?.trim()) labels.push(output.other.trim());
  return labels.join(", ");
}

/** One question card. The next call stacks another card under the answered ones. */
export function AskUserQuestionCard({
  part,
  dataTest = "ask-user",
}: {
  part: AskUserPart;
  dataTest?: string;
}) {
  const question = readQuestion(part);
  const answered = part.output ?? null;
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");

  if (!question) {
    return (
      <p className="text-xs text-muted-foreground" data-test={`${dataTest}-pending`}>
        Preparing a question…
      </p>
    );
  }

  if (answered) {
    return (
      <div
        className="flex flex-col gap-1 rounded-xl bg-base-200/50 px-3 py-2.5 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]"
        data-test={`${dataTest}-answered`}
      >
        <p className="text-xs text-muted-foreground">{question.question}</p>
        <p className="text-sm text-base-content">{answerText(answered)}</p>
      </div>
    );
  }

  const multiple = question.allowMultiple === true;
  const allowOther = question.allowOther === true;
  const selected = new Set(picked);
  const otherOpen = allowOther && selected.has("other");

  function choose(id: string) {
    if (multiple) {
      setPicked((current) =>
        current.includes(id) ? current.filter((choice) => choice !== id) : [...current, id],
      );
      return;
    }
    setPicked((current) => (current.length === 1 && current[0] === id ? [] : [id]));
  }

  function submit() {
    if (!question) return;
    const selectedOptions = question.options.filter((option) => selected.has(option.id));
    const typed = other.trim();
    if (selectedOptions.length === 0 && !typed) return;
    answerAskUser(part.id, {
      selected: selectedOptions.map((option) => ({ id: option.id, label: option.label })),
      ...(otherOpen && typed ? { other: typed } : {}),
    });
  }

  const choices = [
    ...question.options.map((option) => ({ id: option.id, label: option.label })),
    ...(allowOther ? [{ id: "other", label: "Other" }] : []),
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-xl bg-base-200/40 px-3 py-4 ring-1 ring-primary/25"
      data-test={dataTest}
    >
      <p className="text-sm font-medium text-base-content">{question.question}</p>
      <div className="flex flex-col gap-2" role={multiple ? "group" : "radiogroup"}>
        {choices.map((choice) => {
          const on = selected.has(choice.id);
          return (
            <div key={choice.id} className="flex flex-col gap-2">
              <button
                type="button"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => choose(choice.id)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                  on
                    ? "border-primary/40 bg-primary/15 text-base-content"
                    : "border-primary/15 bg-primary/10 text-base-content/90 hover:bg-primary/15",
                )}
                data-test={
                  choice.id === "other"
                    ? `${dataTest}-other`
                    : `${dataTest}-option-${choice.id}`
                }
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-[4px] border",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/50 bg-base-100",
                  )}
                  aria-hidden
                >
                  {on ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{choice.label}</span>
              </button>
              {choice.id === "other" && otherOpen ? (
                <Input
                  value={other}
                  onChange={(event) => setOther(event.target.value)}
                  placeholder="Your own answer"
                  aria-label="Other answer"
                  className="h-10 text-sm"
                  data-test={`${dataTest}-other-input`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={
            !question.options.some((option) => selected.has(option.id)) &&
            !(otherOpen && other.trim())
          }
          onClick={submit}
          data-test={`${dataTest}-submit`}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
