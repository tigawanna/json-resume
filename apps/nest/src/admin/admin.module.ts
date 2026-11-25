import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AdminCreditsController } from './credits/admin-credits.controller.js';
import { AdminCreditsService } from './credits/admin-credits.service.js';
import { AdminWaitlistController } from './waitlist/admin-waitlist.controller.js';
import { AdminWaitlistService } from './waitlist/admin-waitlist.service.js';

@Module({
  imports: [DatabaseModule, CreditsModule],
  controllers: [AdminWaitlistController, AdminCreditsController],
  providers: [AdminWaitlistService, AdminCreditsService],
})
export class AdminModule {}
