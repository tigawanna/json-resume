import { AppConfig } from "@/utils/system";

export const privacyPolicy = {
  title: "Privacy Policy",
  lastUpdated: "November 12, 2026",
  intro:
    "Crafted is local-first. Your résumé library lives in your browser until you choose to sync or to send a prompt to a model. This policy explains what that means for the website, the editor, and the PDFs you export.",
  sections: [
    {
      heading: "Who we are",
      body: `Crafted (“we”, “us”) is a structured résumé workspace. You keep roles, bullets, skills and related records as data, tailor them with a language model you connect, and export a PDF. Contact: ${AppConfig.email}.`,
    },
    {
      heading: "Data that stays on your device",
      body: "Résumés, jobs, cover letters, application answers and the rest of the library are stored in a local database in your browser. Editing, search and PDF rendering run on your device. We do not receive that library merely because you opened the app.",
    },
    {
      heading: "What you send to a model",
      body: "If you paste an API key and send a prompt, the text you attach — including a job description or résumé excerpts — goes to the model provider you chose (for example OpenRouter). That provider’s privacy policy applies to that request. We do not use your prompts to train our own models.",
    },
    {
      heading: "Accounts and sync",
      body: "If you create an account or turn on sync, we store the account details needed to sign you in (such as your email and session) and the events required to copy your library between your devices. Sync is optional.",
    },
    {
      heading: "PDFs you export",
      body: "A downloaded PDF is a file on your computer. The export is built as selectable text with ordinary section headings so applicant tracking systems can read it. We do not keep a copy of that file on a server as part of export.",
    },
    {
      heading: "What we do not do",
      body: "We do not sell your library and we do not run advertising trackers on the editor. Crash and error reports, when enabled, contain diagnostic details such as the page and the error, not the full text of your résumé.",
    },
    {
      heading: "Contact",
      body: `To ask about this policy or request deletion of an account, email ${AppConfig.email}.`,
    },
  ],
} as const;
