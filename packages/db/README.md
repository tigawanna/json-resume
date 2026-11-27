Drizzle schemas, imported as TypeScript source from one package with explicit dialect folders.

```text
src/
  sqlite/                 # Turso + local SQLite
    schema/
    zod/
    index.ts
    migrations.ts
  postgres/               # Neon + local Postgres
    schema/
    zod/
    migrations/
    index.ts
    migrations.ts

drizzle/
  sqlite/migrations/
```

`vp build` writes `dist/`. `vp dev` is `vp build --watch`.

## Database commands

Run these from this package. Copy `.env.example` to `.env` first.

SQLite/Turso track:

```bash
pnpm --dir packages/db db:generate
pnpm --dir packages/db db:migrate
pnpm --dir packages/db db:push
pnpm --dir packages/db db:studio
```

Postgres track:

```bash
pnpm --dir packages/db db:generate:postgres
pnpm --dir packages/db db:migrate:postgres
```

## Imports

Prefer explicit dialect exports:

```ts
import { resume } from "@repo/db/sqlite/schema/resume";
import { resume } from "@repo/db/postgres/schema/resume";
```

Legacy `@repo/db/schema/*`, `@repo/db/zod`, and `@repo/db/migrations` aliases still point to SQLite so web/API can migrate incrementally. Do not replay SQLite migrations against Postgres.
