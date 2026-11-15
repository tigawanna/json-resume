Hono API.

`pnpm dev` runs the TypeScript entry with `tsx`. `vp pack` writes the Node bundle to `dist/` (`pnpm build`, then `pnpm start`). A Cloudflare Workers deploy would use Wrangler instead of `vp pack`.
