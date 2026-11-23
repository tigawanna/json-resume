import { Module } from "@nestjs/common";
import { CreditsGuard } from "../credits/credits.guard.js";
import { WaitlistGuard } from "../waitlist/waitlist.guard.js";
import { CreditsModule } from "../credits/credits.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { SyncController } from "./sync.controller.js";

@Module({
  imports: [DatabaseModule, CreditsModule],
  controllers: [SyncController],
  providers: [WaitlistGuard, CreditsGuard],
})
export class SyncModule {}
