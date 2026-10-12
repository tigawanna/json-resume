import { createChatUI } from "@tanstack/ai-react/ui";
import { ResumeAiChatLayout, ResumeAiMessage } from "./ResumeAiMessage";
import {
  ResumeAiCloneResumeTool,
  ResumeAiCreateResumeTool,
  ResumeAiReplaceDocumentTool,
  ResumeAiTailorResumeTool,
  ResumeAiTextPart,
  ResumeAiThinkingPart,
  ResumeAiToolCall,
  ResumeAiToolResultPart,
} from "./ResumeAiToolWidgets";
import { ResumeAiWrapUpTool } from "./ResumeAiWrapUpTool";
import { resumeAiChatOptions } from "./resume-ai-chat-options";

/**
 * Every tool needs an entry. A tool listed here gets its approval as the
 * `interrupt` prop, so `replace_resume_document` asks inline.
 */
export const ResumeAiChatUI = createChatUI(resumeAiChatOptions, {
  components: {
    layout: ResumeAiChatLayout,
    message: ResumeAiMessage,
  },
  partsComponents: {
    text: ResumeAiTextPart,
    thinking: ResumeAiThinkingPart,
    toolResult: ResumeAiToolResultPart,
    fallback: () => null,
  },
  toolsComponents: {
    list_resumes: ResumeAiToolCall,
    get_resume: ResumeAiToolCall,
    set_active_resume: ResumeAiToolCall,
    search_library: ResumeAiToolCall,
    attach_library_items: ResumeAiToolCall,
    rank_library_for_job: ResumeAiToolCall,
    update_resume_details: ResumeAiToolCall,
    set_summary: ResumeAiToolCall,
    set_experience_bullets: ResumeAiToolCall,
    set_skills: ResumeAiToolCall,
    upsert_experience: ResumeAiToolCall,
    upsert_project: ResumeAiToolCall,
    upsert_education: ResumeAiToolCall,
    upsert_talk: ResumeAiToolCall,
    set_contacts: ResumeAiToolCall,
    set_links: ResumeAiToolCall,
    set_notes: ResumeAiToolCall,
    reorder_section: ResumeAiToolCall,
    remove_from_resume: ResumeAiToolCall,
    replace_resume_document: ResumeAiReplaceDocumentTool,
    clone_resume: ResumeAiCloneResumeTool,
    create_resume: ResumeAiCreateResumeTool,
    rank_resumes_for_job: ResumeAiToolCall,
    tailor_resume_for_job: ResumeAiTailorResumeTool,
    open_resume: ResumeAiToolCall,
    list_jobs: ResumeAiToolCall,
    get_job: ResumeAiToolCall,
    save_job: ResumeAiToolCall,
    update_job: ResumeAiToolCall,
    attach_job: ResumeAiToolCall,
    get_playbook: ResumeAiToolCall,
    undo_last_ai_change: ResumeAiToolCall,
    wrap_up: ResumeAiWrapUpTool,
  },
});
