import type { ResumeWorkspaceAdapter } from "@/components/resume/resume-workspace/resume-workspace-types";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import {
  summarizeImport,
  type ImportChoices,
  type ResumeImportPlan,
} from "@/modules/resume-import/plan-resume-import";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ResumeImportReview } from "./ResumeImportReview";

const NO_CHOICES: ImportChoices = new Map();

/**
 * Imports a document into the résumé: applies straight away when every item
 * has a single sensible outcome, otherwise opens the review dialog first.
 * Render `reviewDialog` somewhere in the caller's tree.
 */
export function useResumeImport(
  workspace: Pick<ResumeWorkspaceAdapter, "planDocumentImport" | "applyDocumentImport">,
  { onApplied }: { onApplied?: () => void } = {},
) {
  const [plan, setPlan] = useState<ResumeImportPlan | null>(null);
  const [reviewRound, setReviewRound] = useState(0);

  const mutation = useMutation({
    mutationFn: async (input: { plan: ResumeImportPlan; choices: ImportChoices }) => {
      await workspace.applyDocumentImport(input.plan, input.choices);
      return summarizeImport(input.plan, input.choices);
    },
    onSuccess(summary) {
      toast.success("Résumé imported", {
        description: `${summary.created} new, ${summary.updated} updated, ${summary.reused} reused`,
      });
      setPlan(null);
      onApplied?.();
    },
    onError(err: unknown) {
      toast.error("Failed to import résumé", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["resumes"]] },
  });

  function importDocument(doc: ResumeDocumentV1) {
    const next = workspace.planDocumentImport(doc);
    if (summarizeImport(next, NO_CHOICES).needsReview === 0) {
      mutation.mutate({ plan: next, choices: NO_CHOICES });
      return;
    }
    setReviewRound((round) => round + 1);
    setPlan(next);
  }

  return {
    importDocument,
    isImporting: mutation.isPending,
    reviewDialog: (
      <ResumeImportReview
        key={reviewRound}
        plan={plan}
        isApplying={mutation.isPending}
        onCancel={() => setPlan(null)}
        onApply={(choices) => {
          if (plan) mutation.mutate({ plan, choices });
        }}
      />
    ),
  };
}
