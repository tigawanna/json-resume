import { isLocalMode } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-types";
import type { AiSettings } from "@/types/ai-settings";

/** Short model and provider-routing labels for a composer's model switcher. */
export function aiModelLabels(settings: AiSettings | null | undefined) {
  const model = settings?.model;
  const routing = settings?.routing;
  const routingLabel =
    !routing || isLocalMode
      ? null
      : routing.mode === "auto"
        ? routing.sort
          ? `Auto · ${routing.sort}`
          : "Auto routing"
        : `${routing.mode === "official" ? "Official" : "Pinned"}: ${routing.providers.join(", ")}`;

  return {
    modelLabel: model ? (model.split("/").pop() ?? model) : null,
    routingLabel,
  };
}
