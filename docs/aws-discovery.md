# AWS discovery: sync log on DynamoDB and Lambda

Rough sizing for the managed sync log. The architecture section below is the plan for splitting sync from the projected API. Prices are us-east-1 list prices: DynamoDB on-demand at $1.25 per million write request units and $0.25 per million read request units, storage at $0.25 per GB-month past the allowance, Lambda at $0.20 per million requests and $0.0000166667 per GB-second.

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

## Architecture

Two stacks. Sync is DynamoDB and Lambda. Everything that queries rows, including projection, wallets, and remote MCP, stays on the existing API.

```
device
  │
  ├─ GET  /sync/credit-status     existing API (Turso)
  │     session + available credits → proceed | stop
  │
  └─ if proceed
        POST /sync/events         Lambda → DynamoDB log
        GET  /sync/events         Lambda → DynamoDB log

existing API (Turso, later Postgres)
  projector, wallets, REST, remote MCP
```

**Sync Lambda.** One function in front of the event log. Push appends events for the session user and returns the new per-user sequence. Pull queries `seq` greater than the cursor. The function does not read or write the wallet, and it does not project. A device that only syncs never needs the projected tables. "My résumés" is not a query this function can answer; the server only has the log.

**Credit gate.** Before a push or a pull, the client calls the existing API. That call confirms the session and the available credits, spends what the operation costs, and returns whether sync may proceed. On stop, the client exits before it touches Lambda, so an empty wallet does not write the log. This replaces the current rule, where a résumé insert is always projected and an empty wallet records an overdraft instead of refusing the sync. Charging moves to this status check. The projector no longer decides billing.

**Existing API.** Projection, wallet monitoring, the REST surface, and remote MCP keep running as the normal API. Turso is enough at this size. The same process can sit on a Lambda web function later without changing the route shape. Moving the projected tables to Postgres is a database swap once the row volume or the vector queries outgrow Turso, not a change to the sync log.
