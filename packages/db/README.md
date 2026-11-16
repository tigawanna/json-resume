Drizzle schema, imported as TypeScript source.

`vp build` writes `dist/`. `vp dev` is `vp build --watch`.

## Database commands

Run these from this package. Copy `.env.example` to `.env` and set `DATABASE_URL` first. Drizzle Kit reads that file from this directory.

```bash
pnpm --dir packages/db db:generate   # write a migration from the schema
pnpm --dir packages/db db:migrate    # apply migrations
pnpm --dir packages/db db:push       # push the schema without a migration
pnpm --dir packages/db db:studio     # open Drizzle Studio
```

Migrations are written to `drizzle/migrations`. The web and API apps do not have their own copies of these scripts.
