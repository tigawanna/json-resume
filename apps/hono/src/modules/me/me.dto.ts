import { userZod } from "@repo/db/zod";
import { z } from "zod";

export const updateMeInput = userZod.update.pick({ name: true }).extend({
  name: z.string().trim().min(1).max(120),
});
