import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useViewer } from "@/data-access-layer/auth/viewer";
import {
  insertApplicationAnswer,
  nextAnswerSortOrder,
  parseQuestions,
} from "@/data-access-layer/event-sourced/application-answer-rows";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { unwrapUnknownError } from "@/utils/errors";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { toast } from "sonner";

const NO_JOB = "none";

interface AddQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultJobId: string | null;
}

export function AddQuestionsDialog({ open, onOpenChange, defaultJobId }: AddQuestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add application questions</DialogTitle>
          <DialogDescription>
            Paste the questions, one per line. For drafted answers that reuse your past stories,
            paste them into the résumé assistant instead.
          </DialogDescription>
        </DialogHeader>
        <AddQuestionsForm defaultJobId={defaultJobId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddQuestionsForm({
  defaultJobId,
  onDone,
}: {
  defaultJobId: string | null;
  onDone: () => void;
}) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const { data: jobs } = useLiveQuery((query) => query.from({ job: db.collections.job }), []);
  const [jobId, setJobId] = useState(defaultJobId ?? NO_JOB);
  const [text, setText] = useState("");
  const questions = parseQuestions(text);

  function handleAdd() {
    const targetJobId = jobId === NO_JOB ? null : jobId;
    try {
      let sortOrder = nextAnswerSortOrder(db, targetJobId);
      for (const question of questions) {
        insertApplicationAnswer(db, viewer.user?.id, {
          question,
          jobId: targetJobId,
          sortOrder: sortOrder++,
        });
      }
      toast.success(
        `${questions.length} ${questions.length === 1 ? "question" : "questions"} added`,
      );
      onDone();
    } catch (err: unknown) {
      toast.error("Failed to add questions", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <Label className="text-xs">Job</Label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="mt-1 w-full" data-test="add-questions-job">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_JOB}>No job</SelectItem>
              {(jobs ?? []).map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {jobListLabel(job)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Questions</Label>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-1 min-h-32"
            placeholder={
              "Why do you want to work here?\nTell us about a time you improved performance."
            }
            data-test="add-questions-text"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={questions.length === 0}
          onClick={handleAdd}
          data-test="add-questions-submit"
        >
          Add {questions.length > 0 ? questions.length : ""}{" "}
          {questions.length === 1 ? "question" : "questions"}
        </Button>
      </DialogFooter>
    </>
  );
}
