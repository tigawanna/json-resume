import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { NestNodeApplication } from "@nestjs/platform-node";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { cleanupOpenApiDoc, ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { AUTH_BASE_PATH, type Auth } from "../auth/better-auth/create-auth.js";
import type { AppEnv } from "../config/env.schema.js";
import {
  API_GLOBAL_PREFIX,
  joinOriginPath,
  pathAfterGlobalPrefix,
} from "./api-prefix.js";
import { mergeAuthOpenApi } from "./merge-auth-openapi.js";

export async function configureApp({ app }: { app: NestNodeApplication }) {
  const env = app.get(ConfigService<AppEnv, true>);
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableCors({
    origin: env.get("TRUSTED_ORIGINS", { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle("Agentic JSON Resume")
    .setDescription("Nest API. Sync handlers are stubs until the sync pass.")
    .setVersion("0.0.1")
    .addServer(
      joinOriginPath({
        origin: env.get("SERVER_URL", { infer: true }),
        path: API_GLOBAL_PREFIX,
      }),
    )
    .addCookieAuth("better-auth.session_token")
    .addTag("meta")
    .addTag("auth")
    .addTag("waitlist")
    .addTag("credits")
    .addTag("sync")
    .build();

  const authSchema = await app.get<AuthService<Auth>>(AuthService).api.generateOpenAPISchema();
  const document = () =>
    mergeAuthOpenApi({
      nestDocument: cleanupOpenApiDoc(
        SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: true }),
      ),
      authSchema,
      basePath: pathAfterGlobalPrefix({
        absolutePath: AUTH_BASE_PATH,
        prefix: API_GLOBAL_PREFIX,
      }),
    });
  SwaggerModule.setup("docs", app, document, {
    ui: false,
    useGlobalPrefix: true,
  });
  app.use(
    `/${API_GLOBAL_PREFIX}/docs`,
    apiReference({
      url: `/${API_GLOBAL_PREFIX}/docs-json`,
    }),
  );
}
