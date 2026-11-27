import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../config/env.schema.js';
import { InsufficientCreditsError } from './credits-errors.js';
import { ResumeCreditSpendService } from './resume-credit-spend.service.js';

@Injectable()
export class ResumeCreditChargeService {
  private readonly logger = new Logger(ResumeCreditChargeService.name);

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly spend: ResumeCreditSpendService,
  ) {}

  /** Called from projection only for new `resume` rows. Never drops a résumé. */
  async chargeProjectedResume({
    userId,
    resumeId,
    createdAt,
  }: {
    userId: string;
    resumeId: string;
    createdAt: Date | undefined;
  }): Promise<void> {
    if (this.config.get('CREDITS_ENABLED', { infer: true }) !== 'true') return;
    const startAtValue = this.config.get('CREDITS_START_AT', { infer: true });
    const startAt = startAtValue ? new Date(startAtValue) : undefined;
    const grandfathered = Boolean(startAt && createdAt && createdAt < startAt);

    try {
      await this.spend.spend({
        userId,
        resumeId,
        grandfathered,
        reason: grandfathered ? 'legacy-import' : undefined,
      });
    } catch (error: unknown) {
      if (error instanceof InsufficientCreditsError) {
        await this.spend.recordOverdraft({ userId, resumeId });
        this.logger.warn(
          `credits.overdraft ${JSON.stringify({ userId, resumeId, available: error.available })}`,
        );
        return;
      }
      // Leave the idempotency key absent so a later rebuild can retry.
      this.logger.warn(
        `credits.projection_error ${JSON.stringify({
          userId,
          resumeId,
          error: error instanceof Error ? error.message : String(error),
        })}`,
      );
    }
  }
}
