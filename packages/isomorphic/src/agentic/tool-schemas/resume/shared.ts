import { z } from "zod";

export const targetResumeShape = {
  resumeId: z.string().trim().optional().describe("Résumé to edit. Defaults to the active résumé."),
};
