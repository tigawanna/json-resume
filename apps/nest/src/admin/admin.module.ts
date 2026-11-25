import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AdminWaitlistController } from './waitlist/admin-waitlist.controller.js';
import { AdminWaitlistService } from './waitlist/admin-waitlist.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminWaitlistController],
  providers: [AdminWaitlistService],
})
export class AdminModule {}
