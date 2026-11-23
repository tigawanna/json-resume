import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { WaitlistController } from "./waitlist.controller.js";
import { WaitlistService } from "./waitlist.service.js";

@Module({
  imports: [DatabaseModule, CreditsModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
