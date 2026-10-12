import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import type { ResumeImportPlan } from "@/modules/resume-import/plan-resume-import";
import { Store } from "@tanstack/react-store";

/** Modals the workbench opens from more than one place; only one is open at a time. */
export type WorkbenchDialog = "actions" | "import-json" | "ai-settings";

export type AiPreviewView = "preview" | "changes" | "cover-letter" | "answers";

export interface WorkbenchImportReview {
  plan: ResumeImportPlan;
  /** Remounts the review dialog so its choices start fresh for each import. */
  round: number;
  onApplied?: () => void;
}

export interface ResumeWorkbenchState {
  resumeId: string;
  /** The résumé as it was when the workbench opened. Edits save straight away, so this is "before this session", not "last saved". */
  openedDocument: ResumeDocumentV1;
  /** A template picked in the header but not saved yet. */
  draftTemplateId: TemplateId | null;
  dialog: WorkbenchDialog | null;
  importReview: WorkbenchImportReview | null;
  ai: {
    /**
     * The résumé the AI tools edit; a clone or tailor call can move it off the page's résumé.
     * Null when the user detached it to talk about something else.
     */
    activeResumeId: string | null;
    /** Résumé JSON from before the current reply, keyed by résumé id. */
    turnBaselines: Record<string, string>;
    previewOpen: boolean;
    /** Set when the user closes the preview so a later write doesn't reopen it. */
    previewDismissed: boolean;
    previewView: AiPreviewView;
    /** Letter the cover-letter view shows; null falls back to the active résumé's newest one. */
    coverLetterId: string | null;
    /** Job whose application answers the answers view shows; null falls back to the active résumé's. */
    answersJobId: string | null;
  };
}

export function createResumeWorkbenchStore(init: {
  resumeId: string;
  openedDocument: ResumeDocumentV1;
}) {
  const store = new Store<ResumeWorkbenchState>({
    resumeId: init.resumeId,
    openedDocument: structuredClone(init.openedDocument),
    draftTemplateId: null,
    dialog: null,
    importReview: null,
    ai: {
      activeResumeId: init.resumeId,
      turnBaselines: {},
      previewOpen: false,
      previewDismissed: false,
      previewView: "preview",
      coverLetterId: null,
      answersJobId: null,
    },
  });

  function updateAi(
    patch: (ai: ResumeWorkbenchState["ai"]) => Partial<ResumeWorkbenchState["ai"]>,
  ) {
    store.setState((state) => ({ ...state, ai: { ...state.ai, ...patch(state.ai) } }));
  }

  const actions = {
    openDialog: (dialog: WorkbenchDialog) => {
      store.setState((state) => ({ ...state, dialog }));
    },
    closeDialog: () => {
      store.setState((state) => ({ ...state, dialog: null }));
    },
    /** For `onOpenChange`: closing only clears the dialog if it is still the open one. */
    setDialogOpen: (dialog: WorkbenchDialog, open: boolean) => {
      store.setState((state) => {
        if (open) return { ...state, dialog };
        return state.dialog === dialog ? { ...state, dialog: null } : state;
      });
    },

    pickTemplate: (templateId: TemplateId) => {
      store.setState((state) => ({ ...state, draftTemplateId: templateId }));
    },

    beginImportReview: (plan: ResumeImportPlan, onApplied?: () => void) => {
      store.setState((state) => ({
        ...state,
        importReview: { plan, onApplied, round: (state.importReview?.round ?? 0) + 1 },
      }));
    },
    endImportReview: () => {
      store.setState((state) => ({ ...state, importReview: null }));
    },

    getActiveResumeId: () => {
      return store.state.ai.activeResumeId;
    },
    /** `baselineJson` is the résumé's JSON right now, kept as its diff start unless it already has one. */
    setActiveResume: (resumeId: string, baselineJson: string | null) => {
      updateAi((ai) => ({
        activeResumeId: resumeId,
        turnBaselines:
          baselineJson === null || resumeId in ai.turnBaselines
            ? ai.turnBaselines
            : { ...ai.turnBaselines, [resumeId]: baselineJson },
      }));
    },
    resetActiveResume: () => {
      updateAi(() => ({ activeResumeId: store.state.resumeId }));
    },
    detachActiveResume: () => {
      updateAi(() => ({ activeResumeId: null }));
    },
    /** Called on send: the active résumé's JSON becomes the only diff start. */
    startTurn: (baselineJson: string | null) => {
      updateAi((ai) => ({
        turnBaselines:
          baselineJson === null || ai.activeResumeId === null
            ? {}
            : { [ai.activeResumeId]: baselineJson },
      }));
    },
    clearTurns: () => {
      updateAi(() => ({ turnBaselines: {} }));
    },

    showPreview: () => {
      updateAi(() => ({ previewOpen: true }));
    },
    closePreview: () => {
      updateAi(() => ({ previewOpen: false, previewDismissed: true }));
    },
    /** A reply started writing to a résumé: open the preview unless the user closed it. */
    autoOpenPreview: () => {
      updateAi((ai) => (ai.previewDismissed ? {} : { previewOpen: true }));
    },
    allowPreviewAutoOpen: () => {
      updateAi(() => ({ previewDismissed: false }));
    },
    setPreviewView: (previewView: AiPreviewView) => {
      updateAi(() => ({ previewView }));
    },
    /** Points the cover-letter view at a letter; `open` also shows the panel. */
    focusCoverLetter: (coverLetterId: string, open: "always" | "unless-dismissed") => {
      updateAi((ai) => ({
        coverLetterId,
        previewView: "cover-letter",
        ...(open === "always" || !ai.previewDismissed ? { previewOpen: true } : {}),
      }));
    },
    /** Points the answers view at a job's application; `open` also shows the panel. */
    focusAnswers: (jobId: string | null, open: "always" | "unless-dismissed") => {
      updateAi((ai) => ({
        answersJobId: jobId,
        previewView: "answers",
        ...(open === "always" || !ai.previewDismissed ? { previewOpen: true } : {}),
      }));
    },
  };

  return { store, actions };
}

export type ResumeWorkbench = ReturnType<typeof createResumeWorkbenchStore>;
export type ResumeWorkbenchActions = ResumeWorkbench["actions"];
