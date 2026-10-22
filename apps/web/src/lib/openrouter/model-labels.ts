import type { AiRouting } from "@/lib/openrouter/routing";

/** Short model and provider-routing labels for a composer's model switcher. */
export function aiModelLabels(
  settings: { model?: string; routing?: AiRouting } | null | undefined,
) {
  const model = settings?.model;
  const routing = settings?.routing;
  let routingLabel: string | null = null;
  if (routing) {
    if (routing.mode === "auto") {
      if (routing.sort) {
        routingLabel = `Auto · ${routing.sort}`;
      } else {
        routingLabel = "Auto routing";
      }
    } else if (routing.mode === "official") {
      routingLabel = `Official: ${routing.providers.join(", ")}`;
    } else {
      routingLabel = `Pinned: ${routing.providers.join(", ")}`;
    }
  }

  return {
    modelLabel: model ? (model.split("/").pop() ?? model) : null,
    routingLabel,
  };
}
