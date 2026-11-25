import { z } from "zod";

/** Position of a row in a `createdAt DESC, id DESC` listing. */
export type CursorKey = { createdAt: Date; id: string };

export function encodeCursor({ createdAt, id }: CursorKey) {
  return Buffer.from(`${createdAt.getTime()}:${id}`).toString("base64url");
}

const cursorKey = z
  .string()
  .transform((value) => Buffer.from(value, "base64url").toString())
  .pipe(z.string().regex(/^\d+:.+$/))
  .transform((value) => {
    const [ms, ...rest] = value.split(":");
    return { createdAt: new Date(Number(ms)), id: rest.join(":") };
  });

export const cursorQuery = z.object({
  cursor: cursorKey.optional(),
  direction: z.enum(["next", "prev"]).default("next"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorQuery = z.infer<typeof cursorQuery>;
