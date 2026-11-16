Hono API.

`pnpm dev` runs the TypeScript entry with `tsx`. `vp pack` writes the Node bundle to `dist/` (`pnpm build`, then `pnpm start`). A Cloudflare Workers deploy would use Wrangler instead of `vp pack`.

## Tests

`pnpm test` gives each test file a throwaway migrated SQLite database through `tests/setup/db.ts`; nothing touches `DATABASE_URL`.

The local libsql driver is single-connection, so tests that need real concurrent transactions are skipped. Run them against a disposable server database:

```bash
TEST_DATABASE_URL=<libsql-url> pnpm test
```
