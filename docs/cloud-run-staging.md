# Cloud Run staging

## Build

Run from the repository root. `VITE_*` values are baked into the browser bundle,
so the web image must be rebuilt when the API or site origin changes.

```bash
docker build -f apps/nest/Dockerfile \
  -t "$REGION-docker.pkg.dev/$PROJECT/$REPO/nest:$TAG" .
docker push "$REGION-docker.pkg.dev/$PROJECT/$REPO/nest:$TAG"

docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_ORIGIN="$NEST_ORIGIN" \
  --build-arg VITE_API_URL="$WEB_ORIGIN" \
  -t "$REGION-docker.pkg.dev/$PROJECT/$REPO/web:$TAG" .
docker push "$REGION-docker.pkg.dev/$PROJECT/$REPO/web:$TAG"
```

Both Dockerfiles expect the repository root as their build context. If using
`docker build` directly, pass `-f apps/nest/Dockerfile .` or
`-f apps/web/Dockerfile .` from the root. The Nest build uses
`apps/nest/Dockerfile.dockerignore`, so `apps/web`, `apps/api`, `apps/aws`, and
`packages/ui` are excluded from its context and only `nest...` dependencies are
installed.

## Postgres

Use a reachable Postgres-compatible database (Neon for staging). Apply the
committed Drizzle migrations before deploying Nest:

```bash
POSTGRES_URL="$POSTGRES_URL" pnpm --dir apps/nest db:migrate:postgres
```

Store `POSTGRES_URL` and `BETTER_AUTH_SECRET` in Secret Manager. Do not bake
secrets into either image.

## Nest

Deploy with at least:

- `POSTGRES_URL` from Secret Manager
- `BETTER_AUTH_SECRET` from Secret Manager
- `BETTER_AUTH_URL=$NEST_ORIGIN`
- `FRONTEND_URL=$WEB_ORIGIN`
- `SERVER_URL=$NEST_ORIGIN`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` if GitHub OAuth is enabled
- `PORT=8080` (the image already defaults to this)

Point liveness at `/health` and readiness at `/ready`. Keep the existing graceful
shutdown window below Cloud Run's termination grace period.

### Hosted AI

The browser calls `${VITE_API_ORIGIN}/api/ai/dashboard-assistant` and
`${VITE_API_ORIGIN}/api/ai/event-sourced-resume-tailor` directly with
`credentials: "include"`. `POST` requires an `Origin` header exactly equal to
`FRONTEND_URL`; preflight permits `Content-Type` and `X-Run-Id`. The user's
OpenRouter key and model travel in `forwardedProps` for each request. Nest does
not store them, execute tools, or read the database for these routes.

Do not set `HOSTED_AI_ALLOW_ANONYMOUS` in staging or production. It exists only
for desktop/local builds that intentionally allow key-based use without an
account. `/api/ai/chat-lab` remains a dev-only web route.

## Web

Deploy the web image with `PORT=8080`. It reads no database secrets. Browser auth
and product calls use the `VITE_API_ORIGIN` compiled into the image.

## Origin checklist

- `BETTER_AUTH_URL` is the Nest origin.
- `FRONTEND_URL` is the web origin.
- Nest trusted origins include the web origin.
- Better Auth production cookies remain `Secure; SameSite=None`.
- Kubb uses `${VITE_API_ORIGIN}/api`; Better Auth uses `${VITE_API_ORIGIN}/api/auth`.
- Browser AI requests send `Origin: $WEB_ORIGIN` and `X-Run-Id`; the web bundle's
  `VITE_API_ORIGIN` must match `$NEST_ORIGIN` exactly.
