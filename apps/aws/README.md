# AWS architecture

This package is the plan for moving the product onto AWS when usage justifies the bill. Nothing is deployed. About 10 to 20 users a week does not pay for a standing API Gateway, an API Lambda, DynamoDB, CloudFront, and a database. Turso and the current host stay the running system. This CDK app is what `cdk deploy` would build on the day that changes.

The split is deliberate. The API stays a portable Node process. Sync is the part that is allowed to grow into AWS.

### The API mounts on any fetch handler

`apps/api` is a Hono app. Its public surface is `app.fetch`, the standard Fetch handler. Node serves it today. A Lambda (through `hono/aws-lambda`), a Worker, or another host can take the same object later. Routes, authentication, credits, the waitlist, and the projected tables stay inside that process.

```ts
import { serve } from "@hono/node-server";
import { app } from "@repo/api/app";

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) });
```

On AWS, API Gateway is only the public door. It applies the rate limit and forwards every `/api/*` path to the API Lambda. Only `/api/sync/*` carries a JWT check at the gateway. The rest, including Better Auth at `/api/auth/*`, uses session cookies checked inside Hono. A device still asks `GET /api/credits`. Code already inside the Hono process calls the credit function directly and skips HTTP.

### Sync is coupled to AWS primitives

Sync is its own Lambda in front of a DynamoDB event log. It never opens the API database. Before a push or a pull it asks the API whether the user is allowed by invoking the API Lambda directly over IAM. That call skips the public gateway.

```ts
api.grantInvoke(sync);
```

That coupling is the scalable half, and it is the reason sync is not folded into the Hono app:

| Primitive | What it unlocks |
|---|---|
| DynamoDB | The event log: append and sequence, sized for the free allowance well past today's traffic. |
| DynamoDB Streams | Materialization. A second function writes the projected tables. Sync Lambda stays off that database. |
| SQS, SNS, SES | Fan-out, mail, and queues once a single Lambda invoke is the wrong shape. |
| Bedrock | A remote MCP and agent that can sit behind those queues and grow with them. |
| EventBridge | Schedules and the small quality-of-life wiring that should live outside the request path. |

None of SQS, SNS, SES, Bedrock, or EventBridge are in the template yet. The boundary is what makes adding them a new subscriber, not a rewrite of the API.

### Why an event log

The client keeps its own rows and keeps editing them with no server in the picture. A device can stay offline for as long as someone uses it, including the whole life of the data. The event log is for the moment that device comes online. It pushes the events it made and pulls every event past its cursor. That cursor is the diff, so catch-up is the missed events, and a quiet device has very little to transfer.

The editor works in both shapes. One device and its local rows is a complete app. The event log, when it is there, publishes those same edits so another device can pull them.

The materializer turns the log into ordinary tables for anything that wants rows. A remote API reads those tables. A remote agent edits there, on the server, apart from whichever device is open. Each agent write is appended to the event log like any other change. Clients pull those events with the same cursor they use for a second laptop and apply them onto the rows they already hold. An agent change arrives as a diff on the merge path the device already uses, including for a device that was offline the whole time.

The event log is how a change is written down as a diff.

### The site

CloudFront serves the built files in `apps/web/dist/client`. There is no other frontend work in this package.

`cdk synth` only prints a template. A real deploy needs AWS credentials, the API and web builds, and a decision to start paying.

## How the database scales

The API database moves to RDS for PostgreSQL on the smallest instance, in the same Region as the API. Postgres on RDS has higher availability and durability than the current hosted database, and the instance sits on the AWS network next to the Lambda that reads it. That same instance loads `pgvector` and full-text search, which the premium remote agent tools use for embeddings and document search. The sync log stays on DynamoDB. The API Lambda keeps the same routes. Only the database URL changes.

`docs/architecture.drawio` is the plan, drawn by hand.

## Why each piece

| Piece | Choice | Why |
|---|---|---|
| API process | One Lambda running the Hono app through `hono/aws-lambda` | The same `app` the Node server mounts. Routes, auth, credits and the waitlist stay in one function with one database client. |
| Secrets | Secrets Manager, one JSON secret | Database URL and token, the Better Auth secret, GitHub OAuth and the cron secret stay out of the template and the Lambda config. The function reads them on cold start. |
| Public front door | API Gateway HTTP API in front of `/api/*` | The gateway throttles everything. On `/api/sync/*` it also checks the JWT before the Lambda runs, so a missing or expired token never spends a concurrency slot. Other routes keep Better Auth cookies, because a gateway authorizer would block `/api/auth/*` logins. |
| Client signals | Three different answers | On sync, `401` means log in again and get a new JWT. Retrying the same token does nothing. `429` carries `Retry-After`, so the client waits out the rate limit. A credit stop from `GET /api/credits` is the payment signal. Upgrading the plan is what changes that, not the throttle header. |
| Sync check | IAM invoke of the API Lambda | Sync Lambda asks the same Hono app if the user is allowed, with no public gateway in between. Code inside the Hono process calls the credit function directly. |
| Event log | DynamoDB | The log is an append and a sequence query, not a join. One résumé is about 70 small items. On-demand DynamoDB stays inside the free allowance far past the current 10–20 users a week. |
| Projected tables | A stream materializer, separate from Sync Lambda | DynamoDB Streams invokes a second function that writes the projected tables into RDS for PostgreSQL. Sync Lambda never opens that database. A device that only syncs never needs those tables. |
| Site | CloudFront in front of the built web app | The web build is static files. CloudFront serves `apps/web/dist/client`. It is not part of the request path for sync or credits. |

## Run it on Floci

Floci is the local AWS emulator. It does not bill an account. Start the one you already have, point the AWS tools at it, then deploy this package there.

Docker must be running. From `apps/aws`:

```bash
floci start
eval "$(floci env)"
export CDK_DEFAULT_ACCOUNT=000000000000
set -a; source ../web/.env; set +a   # the API env vars (DATABASE_URL, BETTER_AUTH_SECRET, GITHUB_*)
pnpm exec cdk bootstrap aws://000000000000/us-east-1
pnpm exec cdk deploy --all -c web=true --require-approval never
curl http://<ApiUrl id>.execute-api.localhost.floci.io:4566/api/health
```

`floci env` sets `AWS_ENDPOINT_URL` to the emulator (port 4566) and dummy credentials. `cdk deploy` then talks to that endpoint. `floci stop` tears the emulator down. The data goes with it unless you started Floci with `--persist`.

Secrets (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_*`, `CRON_SECRET`) go into the `resume-api/secrets` Secrets Manager secret. The Lambda only gets its ARN and loads the values before importing the app. Plain config (`BETTER_AUTH_URL`, `FRONTEND_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `CREDITS_*`) stays as Lambda env vars.

- **On Floci**, the secret is seeded from your shell so one `cdk deploy` runs end to end. Those values do pass through the template, which is fine for an emulator.
- **On a real account**, CDK only generates `BETTER_AUTH_SECRET` and keeps the secret when the stack is deleted. Fill in the rest once, outside the template:

```bash
aws secretsmanager put-secret-value --secret-id resume-api/secrets \
  --secret-string '{"BETTER_AUTH_SECRET":"…","DATABASE_URL":"libsql://…","DATABASE_AUTH_TOKEN":"…","GITHUB_CLIENT_ID":"…","GITHUB_CLIENT_SECRET":"…"}'
```

`DATABASE_URL` must be a remote `libsql://` or `https://` URL. The API uses the libsql HTTP client everywhere, so a `file:` database is only for tests.

The API issues ES256 JWTs (`GET /api/auth/token`) and publishes JWKS at `/api/auth/jwks`. OpenID discovery is `GET {BETTER_AUTH_URL}/.well-known/openid-configuration`. The web sync client sends `Authorization: Bearer` on `/api/sync/*` and still sends the session cookie so Hono can identify the user.

On a real account the gateway JWT authorizer turns on automatically, using `BETTER_AUTH_URL` as issuer and audience. Override with `SYNC_JWT_ISSUER` / `SYNC_JWT_AUDIENCE` if those differ. Floci leaves it off unless you set `SYNC_JWT_ISSUER` to a URL the authorizer can fetch. Only `GET` and `POST` on `/api/sync/*` get the authorizer; `OPTIONS` and `/api/auth/*` do not.

Known Floci gaps: CDK custom-resource Lambdas cannot reach S3 inside the emulator. When `AWS_ENDPOINT_URL` is set, the Web stack skips auto-delete and the site upload. The bucket and distribution are created empty.

## Sync log sizing

Rough sizing for the managed sync log. Prices below are us-east-1 list prices: DynamoDB on-demand at $1.25 per million write request units and $0.25 per million read request units, storage at $0.25 per GB-month past the allowance, Lambda at $0.20 per million requests and $0.0000166667 per GB-second.

## What one résumé weighs

A résumé is stored as one event per row, not one event for the whole document.

The projection fixture (`resume-projection-events.json`) is 3 résumés, 208 events, and 73,628 bytes of JSON payloads. That is 354 bytes of payload per event. The standalone résumé document (`real-resume.json`) is 8,534 bytes and expands to about 70 rows: the résumé, a summary, 5 jobs, 20 bullets, education, 3 projects, 2 talks, 5 skill groups, 30 skills, and a couple of links.

| | Count |
|---|---|
| Events to create one résumé | 70 |
| DynamoDB writes to create one résumé | 140 (one `Put` for the event, one `Update` for the per-user sequence counter) |
| Lambda invocations to create one résumé | 1 (the push batch holds 100 events) |
| Reads on that push | 0 (conditional put, no lookup first) |

A cover letter or job description cannot approach the 400 KB DynamoDB item limit. An update stores the new text and the previous text, so the prose would have to be about 200 KB (roughly 30,000 words) before the write failed. A long posting is about 10 KB. 100 KB of English is about 1,000 lines.

Items in the estimates below are counted as 1 KB, which is above the measured payload and still one write request unit.

## Free tier that does not expire

The 12-month account trial is separate. DynamoDB Standard and Lambda keep these monthly allowances for the life of the account, per Region:

| Allowance | Amount | What it does not cover |
|---|---|---|
| DynamoDB storage | 25 GB | Standard-IA, backups, point-in-time recovery |
| DynamoDB provisioned capacity | 25 write units and 25 read units | On-demand requests. Storage is still free up to 25 GB |
| Lambda requests | 1,000,000 | |
| Lambda compute | 400,000 GB-seconds | |

25 provisioned write units is 25 items per second of up to 1 KB, all month, at no charge. The storage cap is what accumulates across the year. The request cap resets every month.

## Usage assumed for one user

"Running it like this" means both of the following, every month:

- They create 20 résumés (1,400 events).
- They type for 8 hours on each of 20 weekdays, and a flush runs every 10 minutes with one changed row. That is 960 flushes. Each flush is one push and one pull.

Per user per month:

| | Count |
|---|---|
| New events kept if nothing is squashed | 2,360 |
| Storage added | 2.30 MB |
| Lambda invocations | 1,934 (960 pushes, 960 pulls, 14 create batches) |
| DynamoDB writes | 4,720 |
| DynamoDB reads | 960 |

If squash keeps only the current row for each key, a user who holds 20 résumés occupies about 1.37 MB and stays there. The 2.30 MB figure is the append-only case, where every keystroke flush is kept for the year.

## How many of those users fit for a year

| Ceiling | Users | Why |
|---|---|---|
| Lambda requests | **517** | 1,000,000 / 1,934 |
| Lambda compute | 4,136 | 256 MB for 200 ms is 0.05 GB-seconds per call |
| DynamoDB storage, append-only for 12 months | 925 | 25 GB / (2.30 MB × 12) |
| DynamoDB storage, squashed to live rows | about 18,700 | 25 GB / 1.37 MB |

**517 users** is the number that stays inside every monthly allowance for the whole year, if every one of them types on that schedule. At 517 users the log grows to about 14 GB by month 12, still under 25 GB. Compute used is about 50,000 GB-seconds of the 400,000. Average write rate at that population is under 1 write per second, against a free 25.

The capacity limit is a burst limit, not an average. If all 517 clients flush in the same second, that is about 1,000 writes at once, and 25 provisioned write units will throttle. Spreading that burst over a minute keeps it free. On-demand mode absorbs the burst and bills it; those requests are not in the free allowance.

Someone who only creates 20 résumés and does not type all day is a different ceiling: storage runs out first, at about **1,560** append-only users after a year. Lambda would allow tens of thousands of them.

## Cost per user once the allowance is used up

Unsubsidized price of one such user for a month, on-demand DynamoDB plus Lambda, with no free units applied:

| | Per user per month |
|---|---|
| DynamoDB writes (4,720 × $1.25 / 1,000,000) | $0.0059 |
| DynamoDB reads (960 × $0.25 / 1,000,000) | $0.0002 |
| Lambda requests | $0.0004 |
| Lambda compute (256 MB, 200 ms) | $0.0016 |
| **Total** | **$0.008** |

About **10 cents per user per year**. Storage past 25 GB adds $0.25 per GB-month, which is under a cent per user per year at 2.30 MB a month.

While the account is under the caps, the marginal cost of another user is $0. The 10 cents is what it costs to keep a user after the free request allowance is exhausted, not a bill you pay on top of the free tier.

## What the stacks deploy

`bin/app.ts` has three stacks. None of them are wired to a live account. What is built today:

- **Api** bundles `src/api-server.ts`, which wraps `app` from `@repo/api/app` with `hono/aws-lambda`. `apps/api` is not modified for Lambda. The handler loads `resume-api/secrets` from Secrets Manager into `process.env`, then imports the app. `NODE_ENV=production` turns off the file log drain. An HTTP API forwards every path (`/api/*`, including Better Auth) to it, with a stage throttle of 50 requests per second and a burst of 100. `GET` and `POST` on `/api/sync/*` get a JWT authorizer on a real account (`BETTER_AUTH_URL` as issuer). Floci leaves that off unless `SYNC_JWT_ISSUER` is set.
- **Sync** is the `resume-sync-events` DynamoDB table (`userId` + `seq`, on-demand, stream on) and a placeholder function that can read and write it. The live sync routes still run inside the API.
- **Web** is opt-in with `-c web=true`. It creates an S3 bucket behind CloudFront and uploads `apps/web/dist/client`, or a placeholder page when no build exists.

Local checks, when you want them, are the AWS emulators or a local API Gateway stand-in. They are for proving the handler, not for running the product.

## Architecture

This is the target design, not all of it built yet (see "What the stacks deploy"). Sync is DynamoDB and Lambda. Everything that queries rows, including projection, wallets, and remote MCP, stays on the existing API. The device never calls Lambda directly.

```
device
  │
  └─ API Gateway  (throttle)
        │
        ├─ ANY /api/*                   API Lambda (RDS PostgreSQL), cookie auth
        │     mounts the Hono app: authentication, credits,
        │     waitlist, projected tables
        │     GET /api/credits → proceed | stop
        │
        └─ if proceed  (reject missing or expired JWT)
              POST /api/sync/events     Sync Lambda → DynamoDB log
              GET  /api/sync/events     Sync Lambda → DynamoDB log

Sync Lambda
  └─ IAM invoke of the API Lambda
        allowed?  — no API Gateway
```

**Sync Lambda.** One function in front of the event log. Push appends events for the session user and returns the new per-user sequence. Pull queries `seq` greater than the cursor. Before either of those, it asks the API Lambda whether this user is allowed to sync. That call invokes the API Lambda directly with IAM auth and does not pass through API Gateway. The same Hono app answers it. Sync Lambda still does not open the API database, does not read the wallet itself, and does not project. A device that only syncs never needs the projected tables. "My résumés" is not a query this function can answer; the server only has the log.

**Who calls the API Lambda.** A device uses the public path, `GET /api/credits`, through API Gateway. A Lambda in this account, including Sync Lambda, invokes it directly with IAM. Code that is already inside the Hono process calls the credit function directly and skips HTTP.

**API Gateway.** All of `/api/*` arrives here. The sync event routes (`/api/sync/*`) have a JWT authorizer that rejects a missing or expired token. Every other route is one HTTP proxy into the API Lambda, where Better Auth checks the session cookie. Credits is not its own gateway integration.

**Credit gate.** The device can call `GET /api/credits` before it syncs, so an empty wallet never starts a sync request. Sync Lambda repeats the check itself: it asks the API Lambda if the user is allowed, and it refuses the push or pull when the answer is no. That is the check that protects the log. Charging still happens in the API Lambda, against the wallet in RDS. The projector no longer decides billing.

**API Lambda.** One function mounts the Hono app as its handler. API Gateway forwards all of `/api/*` to it. The function serves authentication, the credit wallet and ledger, the waitlist, and the projected résumé tables. Those tables share one RDS for PostgreSQL database, and a credit read joins the wallet to the waitlist entry. Splitting them into their own functions would add a cold start and a second database client without a boundary the request needs.

The materializer is the other function in this stack. DynamoDB Streams invokes it, and it writes the projected tables into the same RDS database the API Lambda reads. Sync Lambda never shares this database.

Projected tables, wallets, and the waitlist live on that RDS instance. `pgvector` and full-text search on it back the premium remote agent tools. The function split and the sync log stay as they are. Only the database URL changes.
