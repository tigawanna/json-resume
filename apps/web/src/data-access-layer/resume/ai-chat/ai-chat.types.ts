export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ResumeAiChatMessagePart =
  | {
      type: "text";
      content: string;
      metadata?: JsonValue;
    }
  | {
      type: "thinking";
      content: string;
    }
  | {
      type: "tool-call";
      id: string;
      name: string;
      arguments: string;
      state:
        | "awaiting-input"
        | "input-streaming"
        | "input-complete"
        | "approval-requested"
        | "approval-responded";
      approval?: {
        id: string;
        needsApproval: boolean;
        approved?: boolean;
      };
      output?: JsonValue;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      content: string;
      state: "streaming" | "complete" | "error";
      error?: string;
    };

export interface ResumeAiChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  parts: ResumeAiChatMessagePart[];
}

export interface ResumeAiChatDTO {
  id: string;
  resumeId: string;
  messages: ResumeAiChatMessage[];
  createdAt: string;
  updatedAt: string;
}
