import { Injectable, type BeforeApplicationShutdown } from '@nestjs/common';

/** Flips once SIGTERM starts shutdown so the readiness probe can fail fast. */
@Injectable()
export class ReadinessService implements BeforeApplicationShutdown {
  private shuttingDown = false;

  beforeApplicationShutdown() {
    this.shuttingDown = true;
  }

  get isShuttingDown() {
    return this.shuttingDown;
  }
}
