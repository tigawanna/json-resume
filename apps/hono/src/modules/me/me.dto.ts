import { z } from "zod";

export const updateMeInput = z.object({
  name: z.string().trim().min(1).max(120),
});
