import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { CreditsController } from "./credits.controller.js";
import { CREDITS_POLICY, CreditsService, defaultCreditsPolicy } from "./credits.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [CreditsController],
  providers: [CreditsService, { provide: CREDITS_POLICY, useValue: defaultCreditsPolicy }],
  exports: [CreditsService, CREDITS_POLICY],
})
export class CreditsModule {}
