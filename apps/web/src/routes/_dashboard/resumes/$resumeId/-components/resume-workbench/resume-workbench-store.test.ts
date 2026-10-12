import { createDefaultResume } from "@/features/resume/resume-schema";
import { describe, expect, it } from "vitest";
import { createResumeWorkbenchStore } from "./resume-workbench-store";

function createWorkbench() {
  return createResumeWorkbenchStore({ resumeId: "page", openedDocument: createDefaultResume() });
}

describe("createResumeWorkbenchStore", () => {
  it("keeps its own copy of the opened document", () => {
    const openedDocument = createDefaultResume();
    const { store } = createResumeWorkbenchStore({ resumeId: "page", openedDocument });
    openedDocument.meta.templateId = "modern";
    expect(store.state.openedDocument.meta.templateId).not.toBe("modern");
  });

  it("opens one dialog at a time and only closes the one that is open", () => {
    const { store, actions } = createWorkbench();
    actions.openDialog("actions");
    actions.openDialog("import-json");
    expect(store.state.dialog).toBe("import-json");

    actions.setDialogOpen("actions", false);
    expect(store.state.dialog).toBe("import-json");

    actions.setDialogOpen("import-json", false);
    expect(store.state.dialog).toBeNull();
  });

  it("starts each turn from the active résumé and keeps the first baseline of a switched-to résumé", () => {
    const { store, actions } = createWorkbench();
    actions.startTurn("page-before");
    expect(store.state.ai.turnBaselines).toEqual({ page: "page-before" });

    actions.setActiveResume("clone", "clone-at-copy");
    actions.setActiveResume("clone", "clone-later");
    expect(store.state.ai.activeResumeId).toBe("clone");
    expect(store.state.ai.turnBaselines).toEqual({ page: "page-before", clone: "clone-at-copy" });

    actions.startTurn("clone-next-turn");
    expect(store.state.ai.turnBaselines).toEqual({ clone: "clone-next-turn" });

    actions.resetActiveResume();
    expect(store.state.ai.activeResumeId).toBe("page");
  });

  it("detaches the active résumé so a turn starts without a diff baseline", () => {
    const { store, actions } = createWorkbench();
    actions.detachActiveResume();
    expect(store.state.ai.activeResumeId).toBeNull();

    actions.startTurn("page-before");
    expect(store.state.ai.turnBaselines).toEqual({});

    actions.resetActiveResume();
    expect(store.state.ai.activeResumeId).toBe("page");
  });

  it("auto-opens the preview until the user closes it, and again once allowed", () => {
    const { store, actions } = createWorkbench();
    actions.autoOpenPreview();
    expect(store.state.ai.previewOpen).toBe(true);

    actions.closePreview();
    actions.autoOpenPreview();
    expect(store.state.ai.previewOpen).toBe(false);

    actions.allowPreviewAutoOpen();
    actions.autoOpenPreview();
    expect(store.state.ai.previewOpen).toBe(true);
  });

  it("switches the preview to a written cover letter, opening it only if the user hasn't closed it", () => {
    const { store, actions } = createWorkbench();
    actions.closePreview();
    actions.focusCoverLetter("letter-1", "unless-dismissed");
    expect(store.state.ai).toMatchObject({
      previewOpen: false,
      previewView: "cover-letter",
      coverLetterId: "letter-1",
    });

    actions.focusCoverLetter("letter-2", "always");
    expect(store.state.ai).toMatchObject({ previewOpen: true, coverLetterId: "letter-2" });
  });

  it("switches the preview to a job's application answers", () => {
    const { store, actions } = createWorkbench();
    actions.focusAnswers("job-1", "unless-dismissed");
    expect(store.state.ai).toMatchObject({
      previewOpen: true,
      previewView: "answers",
      answersJobId: "job-1",
    });
  });
});
