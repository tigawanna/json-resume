---
name: nest-app
description: How apps/nest is wired - DTOs built from drizzle-zod schemas with nestjs-zod, the global AppAuthGuard (authentication, @Public, @Roles, bans, mock and dev-admin users), feature guards, and the global ThrottlerGuard rate limits. Use when adding or changing endpoints, DTOs, guards, or rate limits in apps/nest.
---

# apps/nest conventions

Generic Nest guidance lives in `nestjs`, `nestjs-feature`, `nestjs-data`. This skill covers what this repo does on top. Long-form reference: `apps/nest/docs/auth-waitlist-credits.md`.

## DTOs: drizzle-zod + nestjs-zod

The table is the source of truth. `packages/db/src/zod/` builds `select` / `insert` / `update` Zod schemas per table with `drizzleZod({ table })` (exported as e.g. `waitlistEntryZod` from `@repo/db/zod`). DTOs refine those, never retype columns by hand.

```ts
import { waitlistEntryZod } from "@repo/db/zod";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const addWaitlistEntry = waitlistEntryZod.insert.pick({ name: true, notes: true }).extend({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
});
export class AddWaitlistEntryDto extends createZodDto(addWaitlistEntry) {}

const idParam = z.object({ id: z.uuid() });
export class WaitlistIdParamDto extends createZodDto(idParam) {}

export class WaitlistEntryDto extends createZodDto(waitlistEntryZod.select) {}
```

- `.pick` only what the client may send. Server-owned columns (`id`, `userId`, `source`, `consentAt`, timestamps) are set in the service.
- Normalize in the schema (`trim`, `toLowerCase`) so the service gets clean input.
- Zod v4 helpers: `z.email()`, `z.uuid()`, `z.url()`.
- One `<feature>.dto.ts` next to the feature (`join.dto.ts`, `admin-waitlist.dto.ts`).
- Global wiring in `src/bootstrap/configure-app.ts`: `ZodValidationPipe` validates every `@Body()` / `@Param()` / `@Query()` typed with a zod DTO (400 on failure); `ZodSerializerInterceptor` strips responses when a handler uses `@ZodSerializerDto(Dto)`; `cleanupOpenApiDoc` feeds the DTOs into Swagger/Scalar. Add `@ApiOkResponse({ type: Dto })` for documented responses.
- Use the DTO class as the param type: `@Body() body: AddWaitlistEntryDto`, `@Param() { id }: WaitlistIdParamDto`. Services take `import type` of the DTO inside a named object: `add({ body }: { body: AddWaitlistEntryDto })`.

## Authentication and authorization

Better Auth via `@thallesp/nestjs-better-auth` (`src/auth/authentication.module.ts`). The library guard is disabled; `AppAuthGuard` (`src/auth/helpers/app-auth.guard.ts`) is the global `APP_GUARD`. Every route is **authenticated by default**.

Guard order: resolve user → `@Public()` passes (user still attached if present) → no user 401 → `banned` 403 → `@Roles` mismatch 403.

Decorators from `src/auth/helpers/auth.decorators.ts`:

```ts
@Public()                          // no session required
@Roles({ roles: ['admin'] })       // class or handler; role read from DB/session, comma lists allowed
handler(@CurrentUser() current: UserWithRole) {}  // optional (`current?`) on @Public routes
```

- Admin controllers put `@Roles({ roles: ['admin'] })` on the class.
- Scope data by `current.id` in the query, not after loading.
- Feature checks are separate guards applied with `@UseGuards`: `WaitlistGuard` (403 unless joined, when policy requires it), `CreditsGuard` (402 when the wallet is short). They read `request.user`, so they run after `AppAuthGuard`.
- Tests: `MOCK_AUTH` is overridden to `true`; `x-mock-user: <user id>` loads that DB row (role comes from the row, never a header).
- Dev only: `ADMIN_BYPASS_SECRET` + header `x-admin: <secret>` attaches a synthetic admin. Refused when `NODE_ENV=production`.

## Rate limiting

`RateLimitModule` registers `ThrottlerGuard` as a global `APP_GUARD`, imported after `AuthenticationModule` so the tracker sees the user. Tracker: `user:<id>` when signed in, else `ip:<req.ip>`. Default `HTTP_RATE_LIMIT` (100/min) in `src/rate-limit/rate-limit.constants.ts`. Over limit is 429 with `Retry-After`.

Tune per feature with a constant in `<feature>.constants.ts`; never add another `ThrottlerModule.forRoot`:

```ts
@Throttle({ default: { limit: WAITLIST_RATE_LIMIT.limit, ttl: WAITLIST_RATE_LIMIT.ttlMs } })
@Controller("waitlist")
```

Class `@Throttle` covers all handlers, method `@Throttle` overrides one, `@SkipThrottle()` opts out. `/api/auth/*` and `/api/docs` are not Nest handlers and are not counted. E2e uses `createTestApp({ throttle: true })` only when asserting 429.
