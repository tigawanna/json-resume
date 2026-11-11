# Landing page messaging vs `/exp-landing`

Source notes (voice memo, 2026-11-11) checked against the live experiment at
`/exp-landing`. Copy lives in `apps/web/src/routes/exp-landing/-utils/content.ts`
and the section components next to it.

Legend:

- `[x]` already on the page, close enough to keep
- `[~]` on the page, but the copy or framing still needs a change
- `[ ]` not on the page yet

Trim duplicates while rewriting. The page currently restates “one JSON library /
source of truth / tailored variations” in the hero, problem pairs, platform,
compose, catalog, proof, and FAQ.

---

## 1. Career brain, not just a résumé builder

The product is a knowledge base for a career: history, applications, interview
practice, and how you talk about the work. Résumés are one output of that brain.

- `[~]` **One place for career data.** Hero, platform, catalog, and FAQ say
  structured résumé parts (experiences, bullets, skills, projects, talks,
  summaries). They do not yet say this is the career knowledge base, or “a
  career brain for your agents.”
- `[x]` **Roles, titles, dates, impact.** Catalog groups: experiences (“roles,
  dates, outcomes”), bullets, skills, projects, talks, summaries. Problem pair:
  “Hard to prove impact → Every change tracked.”
- `[x]` **Write the work once, then aim it at a posting.** Platform (“write a
  bullet once”), compose (“one library, many résumés”), proof (“four variations
  from one library”), workbench script retargets a bullet at a job post.
- `[~]` **Help people articulate what they actually did.** Implied by LLM
  tailoring and the workbench rewrite. Not said in its own words.
- `[ ]` **Applications you are tracking.** Jobs applied to, where you are in
  each process. Not a section or catalog group.
- `[~]` **Interview questions and answers.** Workbench has a Q&A tab and the
  script drafts answers for one posting. Missing: recurring questions as a
  practice bank (forms, phone screens) you reuse next time.
- `[ ]` **Gaps in job descriptions.** What a posting asks for that your library
  does not cover, so you can work on projects, talks, blogs, and public
  positioning before the next similar role. Intelligence only shows résumé
  metrics (events, variations, pasted paragraphs, one source of truth).

## 2. Hats: show the role that fits this job

- `[~]` **Not every hat belongs on every application.** Hire section
  (`exp-hire`, hairline `Rail`) lists three roles and the picks for each
  (AI engineer, CRM developer, platform engineer). Compose says “pick the
  summary and the bullets that fit the role.” The hat metaphor itself is not
  in the copy, and the figure is a garment rail without a dedicated hats beat.
- `[ ]` **A hats motion** beside the existing hairline figures: different hats
  per role, then choosing which ones to display for the posting.

## 3. The editor and bring-your-own-key

- `[x]` **Any LLM, on top of data you already have.** Stats (“Any LLM”),
  platform (“LLM tailoring”), FAQ. Workbench shows a scripted pass: thinking,
  markdown, `set_summary`, résumé panel, cover letter, Q&A.
- `[~]` **Bring your own key.** Workbench chrome mentions OpenRouter. Missing
  as a product claim: you paste your own key, and you can set a usage cap if
  the key leaks.
- `[~]` **The model stitches the next artifact from the library.** Workbench
  and FAQ describe tailoring JSON and showing a diff. Cover letter and Q&A
  appear in the demo only. Missing as stated outcomes: the best résumé stitch,
  the cover letter, and a slight bullet shift that highlights the hat this
  role needs.
- `[x]` **See the change and undo it.** Compose “See what the agent changed,”
  govern “every edit is an event you can replay, diff or undo,” stats
  “Reversible · Event-sourced history.”

## 4. Your data, on your device

- `[x]` **Data stays with you.** Govern: local-first, export anytime, JSON is
  the product. FAQ: no account required; only attached parts go to the model.
- `[~]` **Fully usable with no subscription.** Pricing “Local / Free” includes
  the editor, any LLM, JSON + PDF, event history. FAQ says MIT and free to
  self-host. Copy still sells a “Hosted / Free while beta” tier with sync as
  the featured plan, which fights “you do not need us.”
- `[x]` **JSON export and import as a backup.** Govern and FAQ cover export of
  the standard schema. Import is part of the product story in the notes and is
  only implied here.
- `[~]` **Local change list you can revert.** Event history is named (govern,
  pricing, stats). The “list of changes still on this device” is not spelled
  out as a thing you browse.
- `[ ]` **Blazingly fast because the data is already on the device.** No lag,
  no save round-trip. Not said.
- `[ ]` **Desktop app** for doing more on the device without the service.

## 5. Pro is a waitlist, not a price

Pricing is not set. Do not invent tiers.

- `[~]` **Free local package is the real offer today.** Present, but buried
  under Hosted (featured) and Team (“Talk to us”).
- `[ ]` **Get Pro opens a waitlist**, not checkout. Pro means “I want the
  premium idea.” The page says they are on the list, and they get a small
  amount of usage credit until a payment plan exists.
- `[ ]` **Interest is the signal to build sync.** Backend later checks the
  opt-in and starts storing a bounded set of items (enough to be useful, not
  unlimited). Landing copy should not promise a finished sync product.
- `[~]` **Sync, usage limits, and team features are later.** Hosted already
  lists “Sync across devices” and “Managed database” as if they ship in beta.
  Team lists shared libraries, reviewer links, bulk export. Rewrite those as
  future / waitlist, or remove them until they exist.

## 6. Copy to trim or retarget

- `[~]` Hero line “The résumé is the sum of its parts. Sorted.” and the
  problem/platform/catalog repetition of the library idea. Keep one strong
  statement, then spend the next sections on career brain, hats, applications,
  and interview practice.
- `[~]` Stats strip (open source, JSON Resume, any LLM, PDF, reversible) is
  accurate and can stay. It does not carry the career-brain message.
- `[x]` Workbench preview after the hero (scripted stream, résumé beside it).
  Keep it. Point its labels at BYOK, cover letter, and Q&A when that copy lands.
- `[x]` Hairline figures and the wardrobe rail. Keep them. Add a hats reading
  on the rail instead of a new swirly effect.
