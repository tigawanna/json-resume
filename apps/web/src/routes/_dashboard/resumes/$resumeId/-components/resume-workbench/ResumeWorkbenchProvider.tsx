import { ResumeImportReview } from "@/components/resume/resume-import/ResumeImportReview";
import {
  ResumeWorkspaceProvider,
  useResumeWorkspace,
} from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import type { EventSourcedResumeSnapshots } from "@/data-access-layer/event-sourced/resume/assemble-resume-detail";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/resume/event-sourced-resume-workspace";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { WorkbenchTab } from "@/features/agentic-tools/resume-tool-schemas";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import {
  summarizeImport,
  type ImportChoices,
  type ResumeImportPlan,
} from "@/modules/resume-import/plan-resume-import";
import { unwrapUnknownError } from "@/utils/errors";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { createContext, useContext, useState } from "react";
import { toast } from "sonner";
import {
  createResumeWorkbenchStore,
  type ResumeWorkbench,
  type ResumeWorkbenchState,
} from "./resume-workbench-store";

const NO_CHOICES: ImportChoices = new Map();

function importMutationKey(resumeId: string) {
  return ["resume-import", resumeId];
}

interface ResumeWorkbenchContextValue {
  store: ResumeWorkbench["store"];
  savedTemplateId: TemplateId;
  actions: ResumeWorkbench["actions"] & {
    goToTab: (tab: WorkbenchTab) => Promise<void>;
    focusTargetJob: () => Promise<void>;
    /** Applies straight away when every item has one sensible outcome, otherwise opens the review dialog. */
    importDocument: (doc: ResumeDocumentV1, options?: { onApplied?: () => void }) => void;
  };
}

const ResumeWorkbenchContext = createContext<ResumeWorkbenchContextValue | null>(null);

interface ResumeWorkbenchProviderProps {
  db: AppDb;
  detail: ResumeDetailDTO;
  snapshots: EventSourcedResumeSnapshots;
  children: React.ReactNode;
}

/**
 * Page state for one résumé's workbench. Mount it with `key={resumeId}` so another
 * résumé gets a fresh store and a fresh opened copy.
 */
export function ResumeWorkbenchProvider({
  db,
  detail,
  snapshots,
  children,
}: ResumeWorkbenchProviderProps) {
  const [{ store, actions: storeActions }] = useState(() =>
    createResumeWorkbenchStore({
      resumeId: detail.id,
      openedDocument: resumeDetailToDocument(detail),
    }),
  );
  const draftTemplateId = useSelector(store, (state) => state.draftTemplateId);
  const importReview = useSelector(store, (state) => state.importReview);
  const navigate = useNavigate();

  const workspace = createEventSourcedResumeWorkspace(
    db,
    { ...detail, templateId: draftTemplateId ?? detail.templateId },
    snapshots,
  );

  const importMutation = useMutation({
    mutationKey: importMutationKey(detail.id),
    mutationFn: async (input: { plan: ResumeImportPlan; choices: ImportChoices }) => {
      await workspace.applyDocumentImport(input.plan, input.choices);
      return summarizeImport(input.plan, input.choices);
    },
    onSuccess(summary) {
      toast.success("Résumé imported", {
        description: `${summary.created} new, ${summary.updated} updated, ${summary.reused} reused`,
      });
      storeActions.endImportReview();
    },
    onError(err: unknown) {
      toast.error("Failed to import résumé", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["resumes"]] },
  });

  async function goToTab(tab: WorkbenchTab) {
    await navigate({
      to: "/resumes/$resumeId",
      params: { resumeId: detail.id },
      search: { tab },
      replace: true,
    });
  }

  async function focusTargetJob() {
    await goToTab("edit");
    requestAnimationFrame(() => {
      document
        .getElementById("resume-section-target-job")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function importDocument(doc: ResumeDocumentV1, options: { onApplied?: () => void } = {}) {
    const plan = workspace.planDocumentImport(doc);
    if (summarizeImport(plan, NO_CHOICES).needsReview === 0) {
      importMutation.mutate({ plan, choices: NO_CHOICES }, { onSuccess: options.onApplied });
      return;
    }
    storeActions.beginImportReview(plan, options.onApplied);
  }

  const value: ResumeWorkbenchContextValue = {
    store,
    savedTemplateId: detail.templateId,
    actions: { ...storeActions, goToTab, focusTargetJob, importDocument },
  };

  return (
    <ResumeWorkbenchContext value={value}>
      <ResumeWorkspaceProvider value={workspace}>
        {children}
        <ResumeImportReview
          key={importReview?.round ?? 0}
          plan={importReview?.plan ?? null}
          isApplying={importMutation.isPending}
          onCancel={storeActions.endImportReview}
          onApply={(choices) => {
            if (!importReview) return;
            importMutation.mutate(
              { plan: importReview.plan, choices },
              { onSuccess: importReview.onApplied },
            );
          }}
        />
      </ResumeWorkspaceProvider>
    </ResumeWorkbenchContext>
  );
}

function useResumeWorkbenchContext() {
  const value = useContext(ResumeWorkbenchContext);
  if (!value) {
    throw new Error("Resume workbench context is missing");
  }
  return value;
}

export function useResumeWorkbench<T>(selector: (state: ResumeWorkbenchState) => T) {
  return useSelector(useResumeWorkbenchContext().store, selector);
}

export function useResumeWorkbenchActions() {
  return useResumeWorkbenchContext().actions;
}

/** The template the page shows, and whether it differs from the saved one. */
export function useWorkbenchTemplate() {
  const { savedTemplateId } = useResumeWorkbenchContext();
  const draftTemplateId = useResumeWorkbench((state) => state.draftTemplateId);
  const templateId = draftTemplateId ?? savedTemplateId;
  return { templateId, hasUnsavedChange: templateId !== savedTemplateId };
}

export function useResumeImportPending() {
  const resumeId = useResumeWorkbench((state) => state.resumeId);
  return useIsMutating({ mutationKey: importMutationKey(resumeId) }) > 0;
}

/** The résumé document as the page shows it, including an unsaved template pick. */
export function useWorkbenchDocument() {
  return resumeDetailToDocument(useResumeWorkspace().resume);
}
