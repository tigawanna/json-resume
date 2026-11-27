import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestNodeApplication } from "@nestjs/platform-node";
import { AppModule, ObserveInstrument } from "./app.module.js";
import { configureApp } from "./bootstrap/configure-app.js";
import { createHttpAdapter, nestHttpOptions } from "./bootstrap/http-adapter.js";
import type { AppEnv } from "./config/env.schema.js";

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    createHttpAdapter(),
    {
      instrument: ObserveInstrument,
      ...nestHttpOptions,
    },
  );
  await configureApp({ app });

  // Hold idle sockets longer than a load balancer's idle timeout (ALB: 60 s).
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  app.enableShutdownHooks();

  const config = app.get(ConfigService<AppEnv, true>);
  if (
    config.get("NODE_ENV", { infer: true }) === "production" &&
    config.get("CREDITS_ENABLED", { infer: true }) !== "true"
  )
    new Logger("Bootstrap").warn(
      'CREDITS_ENABLED is not "true": resume charges are disabled in production',
    );

  await app.listen(config.get("PORT", { infer: true }));
}
await bootstrap();
