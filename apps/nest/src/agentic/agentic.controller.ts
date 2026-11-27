import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/node';
import { RPCHandler, type NodeHttpHandler } from '@orpc/server/node';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  agenticCorsHeaders,
  agenticOpenApiBasePath,
  agenticOpenApiSpecPath,
  agenticRpcBasePath,
} from '@repo/isomorphic/agentic/routes';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Public } from '../auth/helpers/auth.decorators.js';
import type { AppEnv } from '../config/env.schema.js';
import { AgenticAuthService } from './agentic-auth.service.js';
import type { AgenticInitialContext } from './agentic-context.js';
import { AgenticJobService } from './agentic-job.service.js';
import { AgenticLibraryService } from './agentic-library.service.js';
import { AgenticResumeService } from './agentic-resume.service.js';
import { createAgenticRouter } from './agentic-router.js';

const scalarHtml = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Agentic JSON Resume API</title></head>
  <body>
    <script id="api-reference" data-url="${agenticOpenApiSpecPath}" data-configuration='{"theme":"purple"}'></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

@Public()
@ApiExcludeController()
@Controller('agentic')
export class AgenticController {
  private readonly rpc: NodeHttpHandler<AgenticInitialContext>;
  private readonly openapi: NodeHttpHandler<AgenticInitialContext>;
  private readonly spec: OpenAPIGenerator;

  constructor(
    private readonly auth: AgenticAuthService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly resumes: AgenticResumeService,
    private readonly library: AgenticLibraryService,
    private readonly jobs: AgenticJobService,
  ) {
    const router = createAgenticRouter({ resumes, library, jobs });
    this.rpc = new RPCHandler(router);
    this.openapi = new OpenAPIHandler(router);
    this.spec = new OpenAPIGenerator({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    });
  }

  @Get('openapi/json')
  getSpec(@Res({ passthrough: true }) response: ServerResponse) {
    this.cors(response);
    return this.spec.generate(
      createAgenticRouter({
        resumes: this.resumes,
        library: this.library,
        jobs: this.jobs,
      }),
      {
        info: { title: 'Agentic JSON Resume API', version: '0.1.0' },
        servers: [
          {
            url: `${this.config.get('SERVER_URL', { infer: true })}${agenticOpenApiBasePath}`,
          },
        ],
      },
    );
  }

  @Get('openapi')
  getUi(@Res({ passthrough: true }) response: ServerResponse) {
    this.cors(response);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return scalarHtml;
  }

  @All('rpc/*')
  async rpcRequest(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ) {
    await this.handleNode({
      request,
      response,
      handler: this.rpc,
      prefix: agenticRpcBasePath,
    });
  }

  @All('*')
  async openApiRequest(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ) {
    await this.handleNode({
      request,
      response,
      handler: this.openapi,
      prefix: agenticOpenApiBasePath,
    });
  }

  private async handleNode({
    request,
    response,
    handler,
    prefix,
  }: {
    request: IncomingMessage;
    response: ServerResponse;
    handler: NodeHttpHandler<AgenticInitialContext>;
    prefix: `/${string}`;
  }) {
    this.cors(response);
    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }
    const { matched } = await handler.handle(request, response, {
      prefix,
      context: { headers: requestHeaders(request), auth: this.auth },
    });
    if (!matched && !response.headersSent) {
      response.statusCode = 404;
      response.end('Not Found');
    }
  }

  private cors(response: ServerResponse) {
    for (const [key, value] of Object.entries(agenticCorsHeaders))
      response.setHeader(key, value);
  }
}

function requestHeaders(request: IncomingMessage) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value))
      value.forEach((entry) => headers.append(key, entry));
    else if (value !== undefined) headers.set(key, value);
  }
  return headers;
}
