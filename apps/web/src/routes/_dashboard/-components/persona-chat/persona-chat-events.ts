export const PERSONA_WRITER_OPEN_EVENT = "persona-writer:open";

export function openPersonaWriter() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PERSONA_WRITER_OPEN_EVENT));
}
