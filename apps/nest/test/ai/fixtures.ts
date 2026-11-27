export const aiRunPayload = {
  threadId: "ai-thread-1",
  runId: "ai-run-1",
  messages: [{ id: "message-1", role: "user", content: "Help me tailor this résumé." }],
  tools: [],
  context: [],
};

export const dashboardForwardedProps = {
  today: "2026-11-27",
  apiKey: "test-openrouter-key",
  model: "deepseek/deepseek-v4.1-flash-1017",
  page: {
    routeId: "/dashboard",
    pathname: "/dashboard",
    label: "Dashboard",
    summary: "Overview",
    instructions: "Help the user.",
    toolPack: "none",
    params: {},
    focus: null,
    conversationStartedOn: "2026-11-27",
  },
};

export const resumeForwardedProps = {
  resumeId: "resume-1",
  activeResumeId: "resume-1",
  apiKey: "test-openrouter-key",
  model: "deepseek/deepseek-v4.1-flash-1017",
};

export function dashboardBody() {
  return { ...aiRunPayload, forwardedProps: dashboardForwardedProps };
}

export function resumeBody() {
  return { ...aiRunPayload, forwardedProps: resumeForwardedProps };
}
