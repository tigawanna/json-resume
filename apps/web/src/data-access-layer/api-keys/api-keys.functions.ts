import { auth } from "@/lib/auth";
import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const permissionLevelSchema = z.enum(["read", "write"]);

const createApiKeyInputSchema = z.object({
  name: z.string().trim().min(1),
  permission: permissionLevelSchema,
});

type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;

const PERMISSION_MAP: Record<z.infer<typeof permissionLevelSchema>, Record<string, string[]>> = {
  read: { resumes: ["read"] },
  write: { resumes: ["read", "write"] },
};

export const createApiKeyFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: CreateApiKeyInput) => createApiKeyInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { name, permission } = data;
    const userId = context.viewer.user.id;

    const result = await auth.api.createApiKey({
      body: {
        name,
        userId,
        permissions: PERMISSION_MAP[permission],
      },
    });

    return { key: result.key };
  });
