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
  const config = app.get(ConfigService<AppEnv, true>);
  await app.listen(config.get("PORT", { infer: true }));
}
await bootstrap();
