export const BRAND = "Whiskas";

export const NAV_LINKS = [
  { label: "Workbench", href: "#workbench" },
  { label: "Career brain", href: "#career-brain" },
  { label: "Library", href: "#library" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const STATS = [
  { value: "A collection", label: "of parts" },
  { value: "Any LLM", label: "Bring your own key" },
  { value: "JSON to PDF", label: "Export" },
] as const;

export const PROBLEM_PAIRS = [
  { before: "Six documents", after: "A collection of parts" },
  { before: "Copy-pasted bullets", after: "Reusable, tagged bullets" },
  { before: "Disconnected résumés", after: "Tailored variations" },
  { before: "Manual formatting", after: "Structured JSON to PDF" },
  { before: "Hard to prove impact", after: "Every change tracked" },
] as const;

export const PLATFORM_POINTS = [
  {
    title: "A collection of parts",
    body: "Roles, bullets, skills, projects, talks and summaries are typed records. Write one once and reuse it. A résumé is a set of picks, not a copy.",
  },
  {
    title: "Applications you are tracking",
    body: "Every posting you apply to, where you are in the process, and which résumé variation you sent.",
  },
  {
    title: "Interview practice bank",
    body: "Recurring questions from phone screens and forms, with the answers you already wrote. Reuse them next time.",
  },
  {
    title: "Gaps in a posting",
    body: "What a role asks for that the collection does not cover yet, so you can build the project, talk or post before the next similar role.",
  },
  {
    title: "LLM tailoring, any model",
    body: "Paste your own key. Send the collection and a posting, get improved JSON back with a diff.",
  },
  {
    title: "Structured JSON to PDF outputs",
    body: "Render a PDF from the same data, so the preview and the file never drift.",
  },
] as const;

export const GOVERN_POINTS = [
  "Local-first: your data lives in your browser and your database, not ours.",
  "Bring your own key: paste it once, set a usage cap in case it leaks.",
  "Export anytime: the JSON is never locked in.",
  "No hidden formatting: the preview is the same component tree the PDF uses.",
] as const;

export const COMPOSE_FEATURES = [
  {
    tag: "Variations",
    title: "One collection, many résumés",
    body: "Pick the summary and the bullets that fit the role. Shared work stays shared.",
  },
  {
    tag: "Hats",
    title: "Show the role that fits this job",
    body: "Not every hat belongs on every application. Choose which summary, bullets and skills come forward for this posting.",
  },
  {
    tag: "Diff",
    title: "See what the agent changed",
    body: "A line diff of the résumé JSON since the last message, so you can accept or undo.",
  },
] as const;

export const WARDROBE_ROLES = [
  { name: "AI engineer", picks: "Summary · account service · Playwright · forms" },
  { name: "CRM developer", picks: "Summary · account service · Jest · forms" },
  { name: "Platform engineer", picks: "Summary · shared forms · release checks · talks" },
] as const;

export const CATALOG_GROUPS = [
  { label: "Experiences", count: "12", note: "Roles, dates, outcomes" },
  { label: "Bullets", count: "48", note: "Reusable, tagged by skill" },
  { label: "Skills", count: "31", note: "Grouped and ranked" },
  { label: "Projects", count: "9", note: "Links and stack" },
  { label: "Talks", count: "6", note: "Events and slides" },
  { label: "Summaries", count: "4", note: "Per-role voice" },
  { label: "Applications", count: "7", note: "Postings, status, answers" },
  { label: "Answers", count: "18", note: "Reusable Q&A bank" },
] as const;

export const METRICS = [
  { value: "540", label: "Events in a full résumé" },
  { value: "14", label: "Variations from one collection" },
  { value: "0", label: "Pasted paragraphs" },
  { value: "1", label: "Source of truth" },
] as const;

export const CASE_STUDIES = [
  {
    tag: "AI engineer",
    title: "Four variations from one collection",
    body: "One account service bullet, four role-specific summaries, no copy-paste.",
  },
  {
    tag: "Career switch",
    title: "A résumé that follows the posting",
    body: "The agent read the job description and re-ranked the bullets it kept.",
  },
  {
    tag: "Open source",
    title: "The JSON outlives the tool",
    body: "Export the standard schema and take it to any renderer you like.",
  },
] as const;

export const PRICING_TIERS = [
  {
    name: "Local",
    price: "Free",
    note: "The real offer today",
    features: [
      "Full editor, runs in your browser",
      "Any LLM, your key",
      "JSON + PDF export",
      "Event history you can browse and undo",
      "No account required",
    ],
    cta: "Open the editor",
    featured: true,
  },
  {
    name: "Pro",
    price: "Waitlist",
    note: "I want the premium idea",
    features: [
      "Everything in Local",
      "Sync across your devices",
      "A small usage credit while we build",
      "Early access to new agents",
    ],
    cta: "Join the waitlist",
    featured: false,
  },
  {
    name: "Team",
    price: "Later",
    note: "For cohorts and bootcamps",
    features: [
      "Shared libraries (future)",
      "Reviewer links (future)",
      "Bulk export (future)",
      "Priority support (future)",
    ],
    cta: "Tell us you are interested",
    featured: false,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: `What is ${BRAND}?`,
    answer:
      "A career brain that stores your history as structured JSON: roles, bullets, skills, projects, talks and summaries. Résumés, cover letters and application answers are outputs of that brain, tailored to a posting with any LLM you bring, and exported as a clean PDF.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. The editor runs locally in your browser first. A hosted workspace is optional when you want sync across devices.",
  },
  {
    question: "How does the LLM tailoring work?",
    answer:
      "You attach the résumé parts and a job description, then the assistant returns improved JSON. The app validates it and shows a diff before anything is saved. You bring your own key, and you can set a usage cap in case it leaks.",
  },
  {
    question: "Is my data sent anywhere?",
    answer:
      "Only the parts you explicitly attach to a prompt reach the model provider. The library stays in your local database until you choose to sync.",
  },
  {
    question: "Can I export without this app?",
    answer:
      "Yes. The data is the standard JSON Resume schema, so any compatible renderer can read it.",
  },
  {
    question: "What about interview practice and gaps in a posting?",
    answer:
      "The library keeps the questions you keep getting asked, with the answers you already wrote, so you reuse them next time. For each posting it can also show what the role asks for that your library does not cover yet, so you know what to build before the next similar role.",
  },
  {
    question: "What does it cost?",
    answer:
      "The app is MIT licensed and free to self-host. Pro is a waitlist, not a price: join it and you get a small usage credit while we build sync. Team features come later.",
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Editor", "Library", "PDF export", "MCP + API"],
  },
  {
    title: "Resources",
    links: ["Docs", "JSON Resume schema", "Examples", "Changelog"],
  },
  {
    title: "More",
    links: ["GitHub", "llms.txt", "Sitemap", "Status"],
  },
] as const;
