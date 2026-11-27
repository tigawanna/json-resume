import { Module } from "@nestjs/common";
import { AiAccessService } from "./ai-access.service.js";
import { AiController } from "./ai.controller.js";
import { AgentChatService } from "./agent-chat.service.js";
import { DashboardChatService } from "./dashboard-chat.service.js";
import { ResumeChatService } from "./resume-chat.service.js";

@Module({
  controllers: [AiController],
  providers: [AiAccessService, AgentChatService, DashboardChatService, ResumeChatService],
})
export class AiModule {}
