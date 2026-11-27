import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestNodeApplication } from '@nestjs/platform-node';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configureApp } from './bootstrap/configure-app.js';
import {
  createHttpAdapter,
  nestHttpOptions,
} from './bootstrap/http-adapter.js';
import type { AppEnv } from './config/env.schema.js';

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

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const logger = new Logger('Bootstrap');
    const forceExit = setTimeout(() => {
      logger.error(`${signal} shutdown timed out`);
      process.exit(1);
    }, 8_000);
    forceExit.unref();
    logger.log(`Received ${signal}, shutting down`);
    try {
      await app.close();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error: unknown) {
      clearTimeout(forceExit);
      logger.error(
        'Shutdown failed',
        error instanceof Error ? error.stack : String(error),
      );
      process.exit(1);
    }
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  const config = app.get(ConfigService<AppEnv, true>);
  if (
    config.get('NODE_ENV', { infer: true }) === 'production' &&
    config.get('CREDITS_ENABLED', { infer: true }) !== 'true'
  )
    new Logger('Bootstrap').warn(
      'CREDITS_ENABLED is not "true": resume charges are disabled in production',
    );

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
