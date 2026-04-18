import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { Store, useStore } from "@tanstack/react-store";
import { createContext, useContext, useRef, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  State shape                                                        */
/* ------------------------------------------------------------------ */

export interface WorkbenchState {
  /** The server-loaded resume (read-only reference) */
  resume: ResumeDetailDTO;
  /** Template at load time — used to detect dirty */
  initialTemplateId: TemplateId;
  /** Currently selected template */
  selectedTemplate: TemplateId;
  /** Pending document edits (null = no unsaved doc changes) */
  pendingDoc: ResumeDocumentV1 | null;
}

/* ------------------------------------------------------------------ */
/*  Derived helpers                                                    */
/* ------------------------------------------------------------------ */

export function selectDoc(state: WorkbenchState): ResumeDocumentV1 {
  return state.pendingDoc ?? resumeDetailToDocument(state.resume);
}

export function selectHasUnsavedChanges(state: WorkbenchState): boolean {
  return state.pendingDoc !== null || state.selectedTemplate !== state.initialTemplateId;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const WorkbenchStoreContext = createContext<Store<WorkbenchState> | null>(null);

export function useWorkbenchStore() {
  const store = useContext(WorkbenchStoreContext);
  if (!store) throw new Error("useWorkbenchStore must be used within <WorkbenchStoreProvider>");
  return store;
}

/** Type-safe selector hook: `const template = useWorkbench(s => s.selectedTemplate)` */
export function useWorkbench<T>(selector: (state: WorkbenchState) => T): T {
  const store = useWorkbenchStore();
  return useStore(store, selector);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function WorkbenchStoreProvider({
  resume,
  children,
}: {
  resume: ResumeDetailDTO;
  children: ReactNode;
}) {
  const storeRef = useRef<Store<WorkbenchState> | null>(null);

  if (!storeRef.current) {
    storeRef.current = new Store<WorkbenchState>({
      resume,
      initialTemplateId: resume.templateId as TemplateId,
      selectedTemplate: resume.templateId as TemplateId,
      pendingDoc: null,
    });
  }

  // Sync when server data changes (e.g. after save + invalidation)
  const prevResumeId = useRef(resume.id);
  const prevTemplateId = useRef(resume.templateId);
  if (resume.id !== prevResumeId.current || resume.templateId !== prevTemplateId.current) {
    prevResumeId.current = resume.id;
    prevTemplateId.current = resume.templateId;
    storeRef.current.setState(() => ({
      resume,
      initialTemplateId: resume.templateId as TemplateId,
      selectedTemplate: resume.templateId as TemplateId,
      pendingDoc: null,
    }));
  } else if (storeRef.current.state.resume !== resume) {
    // Same id/template but fresh query data — update the reference
    storeRef.current.setState((prev) => ({ ...prev, resume }));
  }

  return (
    <WorkbenchStoreContext.Provider value={storeRef.current}>
      {children}
    </WorkbenchStoreContext.Provider>
  );
}
