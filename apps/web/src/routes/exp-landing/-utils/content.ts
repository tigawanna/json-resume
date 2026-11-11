export const NAV_LINKS = [
  { label: "Workbench", href: "#workbench" },
  { label: "Product", href: "#product" },
  { label: "Library", href: "#library" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#faq" },
] as const;

export const STATS = [
  { value: "Open source", label: "MIT licensed" },
  { value: "JSON Resume", label: "Standard schema" },
  { value: "Any LLM", label: "Tailor with a job post" },
  { value: "PDF", label: "Clean export" },
  { value: "Reversible", label: "Event-sourced history" },
] as const;

export const PROBLEM_PAIRS = [
  { before: "Separate documents", after: "One JSON library" },
  { before: "Disconnected versions", after: "Tailored variations" },
  { before: "Fragmented wording", after: "Reusable bullets" },
  { before: "Scattered context", after: "One source of truth" },
  { before: "Manual formatting", after: "Clean PDF export" },
  { before: "Hard to prove impact", after: "Every change tracked" },
] as const;

export const PLATFORM_POINTS = [
  {
    title: "A structured core",
    body: "Every experience, bullet, skill, project and talk is a typed record, not a paragraph in a document.",
  },
  {
    title: "A library of parts",
    body: "Write a bullet once and reuse it across roles. A résumé is a set of picks, not a copy.",
  },
  {
    title: "LLM tailoring",
    body: "Send the library and a job description to any assistant, then bring the improved JSON back.",
  },
  {
    title: "Clean export",
    body: "Render a print-ready PDF from the same data, so the preview and the file never drift.",
  },
] as const;

export const GOVERN_POINTS = [
  "Local-first: your data lives in your browser and your database, not ours.",
  "Event-sourced: every edit is an event you can replay, diff or undo.",
  "Export anytime: the JSON is the product, and it is never locked in.",
  "No hidden formatting: the preview is the same component tree the PDF uses.",
] as const;

export const COMPOSE_FEATURES = [
  {
    tag: "Variations",
    title: "One library, many résumés",
    body: "Pick the summary and the bullets that fit the role. Shared work stays shared.",
  },
  {
    tag: "Ordering",
    title: "Sections that follow the job",
    body: "Reorder experiences, bullets and skill groups per résumé without forking the records.",
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
] as const;

export const METRICS = [
  { value: "540", label: "Events in a full résumé" },
  { value: "14", label: "Variations from one library" },
  { value: "0", label: "Pasted paragraphs" },
  { value: "1", label: "Source of truth" },
] as const;

export const CASE_STUDIES = [
  {
    tag: "AI engineer",
    title: "Four variations from one library",
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
    note: "Run it yourself",
    features: ["Full editor", "Any LLM", "JSON + PDF export", "Event history"],
    cta: "Open the editor",
    featured: false,
  },
  {
    name: "Hosted",
    price: "Free while beta",
    note: "No setup",
    features: [
      "Everything in Local",
      "Managed database",
      "Sync across devices",
      "MCP + API access",
    ],
    cta: "Start free",
    featured: true,
  },
  {
    name: "Team",
    price: "Talk to us",
    note: "For cohorts and bootcamps",
    features: ["Shared libraries", "Reviewer links", "Bulk export", "Priority support"],
    cta: "Talk to us",
    featured: false,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "What is Agentic JSON Resume?",
    answer:
      "An open-source résumé editor that stores every part as structured JSON, tailors a variation with any LLM, and exports a clean PDF.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. The editor runs locally in your browser first. A hosted workspace is optional when you want sync across devices.",
  },
  {
    question: "How does the LLM tailoring work?",
    answer:
      "You attach the résumé parts and a job description, then the assistant returns improved JSON. The app validates it and shows a diff before anything is saved.",
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
    question: "What does it cost?",
    answer:
      "The app is MIT licensed and free to self-host. The hosted beta is free while it lasts, and paid team features are coming later.",
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
