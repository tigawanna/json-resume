import { Controller, Logger, Options, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiExcludeController } from "@nestjs/swagger";
import type { IncomingMessage, ServerResponse } from "node:http";
import { chatParamsFromRequestBody } from "@tanstack/ai";
import { z } from "zod";
import type { UserWithRole } from "../auth/helpers/utils.js";
import { CurrentUser, Public } from "../auth/helpers/auth.decorators.js";
import type { AppEnv } from "../config/env.schema.js";
import { AiAccessService } from "./ai-access.service.js";
import { readJsonBody } from "./ai-request.js";
import { sendAiJsonError, sendAiSse, setAiCors } from "./ai-sse.js";
import { DashboardChatService } from "./dashboard-chat.service.js";
import { ResumeChatService } from "./resume-chat.service.js";
import {
  dashboardAssistantForwardedPropsSchema,
  eventSourcedResumeTailorForwardedPropsSchema,
} from "@repo/isomorphic/agentic/request-schemas";

function aiErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) return "Invalid AI request payload";
  if (error instanceof Error) return error.message;
  return "Unable to process AI request";
}

@Public()
@SkipThrottle()
@ApiExcludeController()
@Controller("ai")
export class AiController {
  private readonly logger = new Logger("AI");

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly access: AiAccessService,
    private readonly dashboard: DashboardChatService,
    private readonly resume: ResumeChatService,
  ) {}

  @Post("dashboard-assistant")
  async dashboardAssistant(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
    @CurrentUser() current?: UserWithRole,
  ) {
    const frontendOrigin = this.frontendOrigin();
    if (request.headers.origin !== frontendOrigin) {
      sendAiJsonError({ response, frontendOrigin, message: "Forbidden", status: 403 });
      return;
    }
    const userId = this.access.resolveUserId({ current });
    if (!userId) {
      sendAiJsonError({
        response,
        frontendOrigin,
        message: "Sign in to use AI. These requests run on our servers.",
        status: 401,
      });
      return;
    }
    try {
      const params = await chatParamsFromRequestBody(await readJsonBody({ request }));
      const data = dashboardAssistantForwardedPropsSchema.parse(params.forwardedProps);
      const abortController = new AbortController();
      const stream = this.dashboard.streamDashboardAgentChat({
        today: data.today,
        slopGuard: data.slopGuard,
        skillInstructions: data.skillInstructions,
        messages: params.messages,
        threadId: params.threadId,
        runId: params.runId,
        parentRunId: params.parentRunId,
        resume: params.resume,
        apiKey: data.apiKey,
        model: data.model,
        routing: data.routing,
        userId,
        page: data.page,
        frontendOrigin,
        abortController,
      });
      await sendAiSse({ response, stream, frontendOrigin, abortController });
    } catch (error: unknown) {
      if (response.headersSent) {
        this.logger.error(
          "AI stream failed after headers were sent",
          error instanceof Error ? error.stack : String(error),
        );
        response.end();
        return;
      }
      this.sendError({ response, frontendOrigin, error });
    }
  }

  @Post("event-sourced-resume-tailor")
  async resumeTailor(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
    @CurrentUser() current?: UserWithRole,
  ) {
    const frontendOrigin = this.frontendOrigin();
    if (request.headers.origin !== frontendOrigin) {
      sendAiJsonError({ response, frontendOrigin, message: "Forbidden", status: 403 });
      return;
    }
    const userId = this.access.resolveUserId({ current });
    if (!userId) {
      sendAiJsonError({
        response,
        frontendOrigin,
        message: "Sign in to use AI. These requests run on our servers.",
        status: 401,
      });
      return;
    }
    try {
      const params = await chatParamsFromRequestBody(await readJsonBody({ request }));
      const data = eventSourcedResumeTailorForwardedPropsSchema.parse(params.forwardedProps);
      const abortController = new AbortController();
      const stream = this.resume.streamEventSourcedResumeAgentChat({
        resumeId: data.resumeId,
        activeResumeId: data.activeResumeId,
        activeJob: data.activeJobId
          ? { id: data.activeJobId, label: data.activeJobLabel ?? "" }
          : undefined,
        systemPrompt: data.systemPrompt,
        skillInstructions: data.skillInstructions,
        slopGuard: data.slopGuard,
        messages: params.messages,
        threadId: params.threadId,
        runId: params.runId,
        parentRunId: params.parentRunId,
        resume: params.resume,
        apiKey: data.apiKey,
        model: data.model,
        routing: data.routing,
        userId,
        frontendOrigin,
        abortController,
      });
      await sendAiSse({ response, stream, frontendOrigin, abortController });
    } catch (error: unknown) {
      if (response.headersSent) {
        this.logger.error(
          "AI stream failed after headers were sent",
          error instanceof Error ? error.stack : String(error),
        );
        response.end();
        return;
      }
      this.sendError({ response, frontendOrigin, error });
    }
  }

  @Options(["dashboard-assistant", "event-sourced-resume-tailor"])
  preflight(@Res() response: ServerResponse) {
    setAiCors({ response, frontendOrigin: this.frontendOrigin() });
    response.statusCode = 204;
    response.end();
  }

  private frontendOrigin() {
    return this.config.get("FRONTEND_URL", { infer: true }).replace(/\/+$/, "");
  }

  private sendError({
    response,
    frontendOrigin,
    error,
  }: {
    response: ServerResponse;
    frontendOrigin: string;
    error: unknown;
  }) {
    const message = aiErrorMessage(error);
    sendAiJsonError({ response, frontendOrigin, message, status: 400 });
  }
}
