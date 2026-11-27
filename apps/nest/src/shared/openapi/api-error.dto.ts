import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class ApiErrorDto extends createZodDto(
  z.object({
    statusCode: z.number().int(),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string().optional(),
  }),
) {}
