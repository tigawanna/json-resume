/**
 * Pulls the JSON object out of a chat reply: drops ```json fences and any
 * prose before the first `{` or after the last `}`. Returns the input
 * unchanged when there is no object to find.
 */
export function extractJsonObject(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start !== -1 && end > start ? body.slice(start, end + 1) : text.trim();
}
