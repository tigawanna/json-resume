import { Module } from "@nestjs/common";
import { DatabaseModule, DRIZZLE, type DrizzleDB } from "../database/database.module.js";
import { CreditLedgerService } from "./credit-ledger.service.js";
import { CreditWalletService } from "./credit-wallet.service.js";
import { CreditsController } from "./credits.controller.js";
import { CREDITS_POLICY, CreditsService, defaultCreditsPolicy } from "./credits.service.js";
import { ResumeCreditChargeService } from "./resume-credit-charge.service.js";
import { ResumeCreditSpendService } from "./resume-credit-spend.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [CreditsController],
  providers: [
    CreditsService,
    CreditWalletService,
    ResumeCreditSpendService,
    ResumeCreditChargeService,
    {
      provide: CreditLedgerService,
      inject: [DRIZZLE],
      useFactory: (db: DrizzleDB) => new CreditLedgerService(db),
    },
    { provide: CREDITS_POLICY, useValue: defaultCreditsPolicy },
  ],
  exports: [
    CreditsService,
    CreditLedgerService,
    CreditWalletService,
    ResumeCreditChargeService,
    CREDITS_POLICY,
  ],
})
export class CreditsModule {}
