import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule, ObserveInstrument } from "./app.module.js";
import { configureApp } from "./bootstrap/configure-app.js";
import type { AppEnv } from "./config/env.schema.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bodyParser: false,
  });
  configureApp({ app });
  const config = app.get(ConfigService<AppEnv, true>);
  await app.listen(config.get("PORT", { infer: true }));
}
await bootstrap();
