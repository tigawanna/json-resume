import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { HealthController } from './health.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [ReadinessService],
  exports: [ReadinessService],
})
export class HealthModule {}
