import { Link } from "@tanstack/react-router";

const DEV_PAGES = [
  {
    to: "/dev/chat-lab",
    title: "Chat lab",
    detail: "Résumé workbench driven by scripted replies and tool calls.",
  },
  {
    to: "/dev/chat-stress",
    title: "Chat stress",
    detail: "Stream a scripted reply through the résumé chat UI and log FPS.",
  },
] as const;

export function DevIndexPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6" data-test="dev-index">
      <div>
        <h1 className="text-lg font-semibold">Dev</h1>
        <p className="text-sm text-muted-foreground">Local-only pages for trying the chat UI.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {DEV_PAGES.map((page) => (
          <li key={page.to}>
            <Link
              to={page.to}
              className="flex flex-col gap-0.5 rounded-md border px-3 py-2 hover:bg-muted"
              data-test={`dev-link-${page.to.split("/").at(-1)}`}
            >
              <span className="text-sm font-medium">{page.title}</span>
              <span className="text-xs text-muted-foreground">{page.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
