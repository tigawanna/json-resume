# Agentic JSON Resume — Game Plan

## What This Is

A developer-first resume tool. You keep your resume as a structured JSON document, use an LLM to tailor it to any job description, and export it instantly as a PDF. No wrestling with Google Docs or PDF editors. The target audience is squarely developers, so we can lean into GitHub integration, repo metadata, and eventually MCP server support.

---

## Current State (as of Phase 0)

| Area | Status |
|---|---|
| TanStack Start app with file-based routing | Done |
| Better Auth — email/password + GitHub OAuth | Done |
| Resume CRUD (create, edit, delete, list) | Done |
| Resume schema (`ResumeDocumentV1`) — header, summary, experience, education, projects, skills | Done |
| Public resume builder (unauthenticated) | Done |
| PDF export via `@react-pdf/renderer` | Done |
| GitHub OAuth token retrieval (`/repos` experiment) | Partial — no UI, just a console.log |
| Dashboard navigation — settings/profile/admin routes | Broken / placeholder |
| AI tailoring | Not started |
| GitHub repo browser | Not started |
| Project shortlist | Not started |
| MCP server | Not started |

---

## Feature Overview

### 1. GitHub Repositories Browser
Use the GitHub OAuth access token (already populated by Better Auth after login) to fetch the authenticated user's repositories via the GitHub API. Display them in the dashboard. The user can shortlist repos they want the AI to know about when building their resume.

### 2. Project Shortlist
A saved list of GitHub repos the user has pinned for resume use. Stores: repo name, description, topics/tags, repo URL, homepage URL (if any). This shortlist feeds the AI context when generating or tailoring a resume and can also be used to auto-populate the projects section.

### 3. Resume AI Tailoring
Given a job description (already stored on the resume record) and the user's shortlisted projects + experience, call an LLM to tailor the resume JSON. Diff-based so the user can see exactly what changed before accepting.

### 4. Remote MCP Server
Expose a `/api/mcp` endpoint using the MCP Streamable HTTP transport spec. Tools available via MCP: list resumes, get resume, create resume from a prompt, tailor resume to a job description. Authenticated with a user-scoped API key. This lets developers plug the tool into Claude Desktop, Cursor, or any MCP-compatible client and do resume work without opening the browser.

---

## Suggested Additions (low-complexity, high-value)

These are not in scope for the immediate phases but fit naturally:

- **`homepageUrl` on project items** — the schema already has `url` (repo link) but not `homepage`. GitHub returns `homepage` on every repo object. One field addition to the Zod schema and the DB project shortlist table.
- **Skills inference from repo topics** — GitHub topics on repos are essentially skill tags. When a user shortlists a repo we can offer to merge its topics into their skills section. No extra API calls needed since we already fetch topics.
- **Public resume share link** — each resume already has an ID. A `/r/:resumeId` public route with a simple read-only view would let you share a link instead of attaching a PDF.

---

## Phase Breakdown

---

### Phase 1 — GitHub Repositories & Project Shortlist

**Goal:** Authenticated users can browse their GitHub repos and shortlist projects for use in their resume.

#### 1a — Infrastructure
- Install `@octokit/rest` for typed GitHub API calls. Drop the raw `fetch` approach.
- Add a `pinned_project` table to Drizzle schema:
  ```
  id, user_id, github_repo_id, name, full_name, description, repo_url, homepage_url, topics (JSON array), language, starred_at (when pinned), created_at
  ```
- Write and run the migration.
- Extend `projectItem` in `resume-schema.ts` to include `homepageUrl?: string`.

#### 1b — Move `/repos` into the Dashboard
- Delete `src/routes/_public/repos.tsx`.
- Create `src/routes/_dashboard/repos/index.tsx`.
- Add `beforeLoad` guard: check if the viewer has a GitHub access token via `authClient.getAccessToken({ providerId: "github" })`. If no token → show a full-page "Connect GitHub" prompt (just the login-with-GitHub button, no other nav options). If token exists → render the repo browser.
- Add "Repositories" link to `dashboard_routes.tsx` sidebar.

#### 1c — Repo Browser UI
- Server function `listGithubRepos` (in `data-access-layer/github/repos.server.ts`): fetch repos from Octokit using the stored access token (sorted by `pushed_at` desc, paginated).
- Client: infinite scroll or standard pagination. Each repo card shows: name, description, language, topics as badges, star count, repo URL, homepage URL (if any).
- "Pin" button on each card calls `pinProject` server function → inserts into `pinned_project` table. Pinned repos show a filled bookmark icon. Second click unpins.

#### 1d — Pinned Projects Page
- Route: `/_dashboard/repos/pinned` (or a tab on the repos page).
- List of shortlisted projects. Each one is editable (override description, edit topics) before it gets used in the resume.
- "Use in resume" action: pre-populates the projects section of a new or existing resume with selected pinned items.

---

### Phase 2 — AI Resume Tailoring

**Goal:** One-click tailoring of a resume to a job description using the user's pinned projects and stored experience as context.

#### 2a — AI Provider Setup
- Use a single server function `tailorResume` that accepts `resumeId` and `jobDescription`.
- Call an LLM (OpenAI `gpt-4o` or Anthropic `claude-3-5-sonnet` — user's API key stored in an encrypted `user_settings` record, or env var for personal use). No SaaS billing complexity; bring-your-own-key.
- The prompt includes: the current resume JSON, the job description, and the user's pinned projects list. Output is a new valid `ResumeDocumentV1` JSON.

#### 2b — Diff Review UI
- Before the AI-tailored version replaces anything, show a structured diff (already have `diff` and `@pierre/diffs` in dependencies).
- Per-section diff: the user accepts or rejects each changed section individually.
- "Accept all" shortcut.
- Saving creates a new resume record (keep the original; don't mutate it) so there's always a history.

#### 2c — Improve the Prompt
- Surface the existing `resume-prompt.ts` in the create flow so users can copy the full LLM context easily.
- Add a "Generate with AI" mode to the create flow that calls `tailorResume` directly if a job description is pasted.

---

### Phase 3 — Remote MCP Server

**Goal:** Expose resume operations as MCP tools so developers can call them from Claude Desktop, Cursor Agent, or any MCP client.

#### 3a — Transport
- TanStack Start on Vercel supports standard HTTP routes. Use the **MCP Streamable HTTP transport** (the current spec, replaces SSE). One endpoint: `POST /api/mcp`.
- Add `src/routes/api/mcp.ts` — a TanStack Start API route that handles the MCP protocol.
- Use the official `@modelcontextprotocol/sdk` server package to wire up tools.

#### 3b — Authentication
- Add an `api_key` table: `id`, `user_id`, `key_hash` (bcrypt), `name`, `created_at`, `last_used_at`.
- Dashboard UI to generate/revoke API keys (`/_dashboard/settings/api-keys`).
- MCP endpoint reads `Authorization: Bearer <key>` header, validates against `api_key` table, resolves the `user_id`.

#### 3c — MCP Tools (v1 scope)
| Tool | Description |
|---|---|
| `list_resumes` | Returns all resume records for the authenticated user (id, name, updatedAt) |
| `get_resume` | Returns the full `ResumeDocumentV1` JSON for a given resume ID |
| `create_resume` | Creates a resume from a raw JSON payload or a plain-text prompt |
| `tailor_resume` | Given a resume ID and job description, returns a tailored resume JSON (same AI call as Phase 2a) |
| `list_pinned_projects` | Returns the user's shortlisted GitHub projects |
| `get_prompt` | Returns the system prompt template so the caller can run the LLM themselves |

#### 3d — MCP Client Config Snippet
- Add a docs page or README section with the config snippet users paste into Claude Desktop / Cursor `mcp.json`:
  ```json
  {
    "mcpServers": {
      "json-resume": {
        "url": "https://your-domain.com/api/mcp",
        "headers": { "Authorization": "Bearer <your-api-key>" }
      }
    }
  }
  ```

---

### Phase 4 — Polish & Infrastructure

**Goal:** Close the gaps in the current app before it feels production-ready.

- Fix `setiings` route typo → `/settings` with proper settings page.
- Fix sidebar nav links (`/settings`, `/admin`) to point to real routes or remove them.
- Fix `profile` route (currently placeholder "Hello …").
- Public resume share: `/r/:resumeId` read-only route. Toggle `isPublic` on the resume record.
- Onboarding flow: first-time dashboard visit → prompt to connect GitHub and create first resume.
- Error boundaries and empty states on all dashboard routes (most are missing these).
- Settings page: display name, email, connected accounts (GitHub), API keys (from Phase 3b), danger zone (delete account).

---

## What We Are Deliberately Not Doing

- No separate Elysia API app. The TanStack Start server functions pattern is already working and sufficient. The alias in `tsconfig`/`vite.config` pointing to a missing `apps/elysia` can be removed.
- No paid AI subscriptions managed by this app. Bring-your-own-key only.
- No real-time collaboration.
- No org/team features (the org/role/kitchen schema from the starter template can be stripped out; it's dead weight).

---

## Implementation Order (summary)

```
Phase 1a  →  DB schema (pinned_project table) + Octokit install
Phase 1b  →  Move repos route into dashboard, add GitHub token guard
Phase 1c  →  Repo browser (list + pin/unpin)
Phase 1d  →  Pinned projects management + "use in resume" action
Phase 2a  →  AI tailoring server function (bring-your-own-key)
Phase 2b  →  Diff review UI
Phase 2c  →  Prompt improvements + AI mode in create flow
Phase 3a  →  MCP HTTP endpoint skeleton
Phase 3b  →  API key management (DB + dashboard UI)
Phase 3c  →  Wire up MCP tools
Phase 3d  →  Docs / config snippet
Phase 4   →  Navigation fixes, settings page, public share, onboarding
```
