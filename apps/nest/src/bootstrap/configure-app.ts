import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { NestNodeApplication } from "@nestjs/platform-node";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { cleanupOpenApiDoc, ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import type { AppEnv } from "../config/env.schema.js";

export function configureApp({ app }: { app: NestNodeApplication }) {
  const env = app.get(ConfigService<AppEnv, true>);
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
    .addCookieAuth("better-auth.session_token")
    .addTag("meta")
    .addTag("auth")
    .addTag("waitlist")
    .addTag("credits")
    .addTag("sync")
    .build();

  const document = () => cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup("docs", app, document, { ui: false });
  app.use(
    "/docs",
    apiReference({
      url: "/docs-json",
    }),
  );
}
