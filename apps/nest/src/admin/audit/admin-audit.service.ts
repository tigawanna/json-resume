import { Injectable, Logger } from '@nestjs/common';

export type AdminActor = { id: string; email: string };

type AuditInput = Record<string, unknown>;

/**
 * Nest equivalent of the web admin wide-event audit. The final structured log
 * contains the actor, redacted input, outcome, duration and result or error.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  async run<T>({
    action,
    actor,
    input,
    execute,
  }: {
    action: string;
    actor: AdminActor;
    input: AuditInput;
    execute: () => Promise<T>;
  }): Promise<T> {
    const startedAt = Date.now();
    const started = {
      action,
      actor: { id: actor.id, email: actor.email },
      input,
    };

    try {
      const result = await execute();
      this.logger.log(
        JSON.stringify({
          message: `Admin ${action} succeeded`,
          adminAction: {
            ...started,
            outcome: 'success',
            durationMs: Date.now() - startedAt,
            result,
          },
        }),
      );
      return result;
    } catch (error: unknown) {
      this.logger.error(
        JSON.stringify({
          message: `Admin ${action} failed`,
          adminAction: {
            ...started,
            outcome: 'error',
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );
      throw error;
    }
  }
}
