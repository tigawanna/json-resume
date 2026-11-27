import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const createTestUser = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(["user", "admin"]).optional(),
});
export class CreateTestUserDto extends createZodDto(createTestUser) {}

const testUserCredentials = z.object({
  email: z.email(),
  password: z.string().min(8),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    role: z.string().nullable(),
  }),
});
export class TestUserCredentialsDto extends createZodDto(testUserCredentials) {}
export type TestUserCredentials = z.infer<typeof testUserCredentials>;
