import { userZod } from "@repo/db/postgres/zod";
import { createZodDto } from "nestjs-zod";

const meSchema = userZod.select.pick({
  id: true,
  name: true,
  email: true,
  role: true,
  banned: true,
});

export class MeResponseDto extends createZodDto(meSchema) {}


