interface LoosePart {
  type?: string;
  id?: string;
  name?: string;
  state?: string;
  arguments?: unknown;
  output?: unknown;
  content?: unknown;
  toolCallId?: string;
}

interface LooseMessage {
  id: string;
  role: string;
  parts: ReadonlyArray<LoosePart>;
}

/**
 * True when a new chat snapshot would render the same bubbles.
 * Tool approvals read live interrupt state, so those calls stay unequal.
 */
export function chatMessagesEqual(prev: LooseMessage, next: LooseMessage): boolean {
  if (prev === next) return true;
  if (prev.id !== next.id || prev.role !== next.role) return false;
  if (prev.parts.length !== next.parts.length) return false;
  if (prev.parts.some(awaitsApproval) || next.parts.some(awaitsApproval)) return false;
  return prev.parts.every((part, index) => partEqual(part, next.parts[index]));
}

function awaitsApproval(part: LoosePart): boolean {
  return part.type === "tool-call" && part.name === "replace_resume_document";
}

function partEqual(prev: LoosePart | undefined, next: LoosePart | undefined): boolean {
  if (prev === next) return true;
  if (!prev || !next || prev.type !== next.type) return false;
  if (prev.type === "text" || prev.type === "thinking") return prev.content === next.content;
  if (prev.type === "tool-call") {
    return (
      prev.id === next.id &&
      prev.name === next.name &&
      prev.state === next.state &&
      prev.arguments === next.arguments &&
      prev.output === next.output
    );
  }
  if (prev.type === "tool-result") {
    return (
      prev.toolCallId === next.toolCallId &&
      prev.state === next.state &&
      prev.content === next.content
    );
  }
  return false;
}
