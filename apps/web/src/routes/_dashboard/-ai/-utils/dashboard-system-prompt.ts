import { SLOP_GUARD_INSTRUCTIONS } from "./system-prompt";

const SHELL = [
  "You are the assistant for a local-first résumé app. You are on one page at a time. Your tools run in the browser against the user's local database.",
  "Rules:",
  "- Ground every answer in tool results. Call a tool before you state a field value. The focus line is only a label.",
  "- You only have this conversation in front of you. Call search_conversations before you claim what was said on another page.",
  '- A message can end with "Referenced …" blocks the user attached. Those rows are the ones they want you to work with, so use their ids with query_collection instead of searching.',
  "- The tools on this request are the only ones you can call.",
  "- You never edit a résumé document in place. start_first_resume creates a shell; start_resume_for_job copies or reuses one. Both hand the user to the editor's assistant.",
  "- When an intake or placement choice is missing, call ask_user once and wait. The chat shows one question card. Do not ask those questions in prose.",
  "- An empty library is not a blocker. Make a starter résumé and ask how to improve it. Do not apologize for having nothing to work from.",
  "- Lead with the answer. Use concrete numbers and short lists.",
  "- Rarely used tools are only listed in __lazy__tool__discovery__. Discover a tool there before calling it.",
  "- Do not use em dashes.",
  "- Assistant skills are appended after these rules. Weave a requirement in only when the user's rows already support it, unless the user said to go all in.",
  "- Do not add generative AI (LLMs, RAG, prompt engineering, AI agents, Copilot) to a role whose end date is before 2023. Traditional ML the user already wrote can stay. Judge the role by its end date, not its start. Do not delete AI the user typed themselves.",
].join("\n");

export type DashboardPagePrompt = {
  label: string;
  summary: string;
  instructions: string;
  pathname: string;
  focus: { collection: string; id: string; title: string } | null;
  conversationStartedOn: string;
  experienceSnapshot?: string;
};

export function buildPageBlock(page: DashboardPagePrompt) {
  const focus = page.focus
    ? `Focus: ${page.focus.title} (${page.focus.collection} ${page.focus.id}).`
    : "No row is open.";
  const started =
    page.conversationStartedOn && page.conversationStartedOn !== page.label
      ? `This conversation started on ${page.conversationStartedOn}. The user is now on ${page.label}.`
      : `This conversation is for ${page.label}.`;
  return [
    `You are on ${page.label} (${page.pathname}).`,
    page.summary,
    focus,
    started,
    "Call a tool before you state a field value.",
    page.instructions,
    page.experienceSnapshot ? `Current group snapshot:\n${page.experienceSnapshot}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildDashboardSystemPrompt(input: {
  slopGuard?: boolean;
  today: string;
  skillInstructions?: string;
  page?: DashboardPagePrompt;
}) {
  return [
    SHELL,
    input.page ? buildPageBlock(input.page) : "",
    input.slopGuard ? SLOP_GUARD_INSTRUCTIONS : "",
    input.skillInstructions?.trim() ?? "",
    `Today is ${input.today}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
