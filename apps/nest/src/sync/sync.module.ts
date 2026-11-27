import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { EventLogProjectionService } from "./event-log-projection.service.js";
import { SyncCompactionService } from "./sync-compaction.service.js";
import { SyncController } from "./sync.controller.js";
import { SyncPullService } from "./sync-pull.service.js";
import { SyncPushService } from "./sync-push.service.js";

@Module({
  imports: [DatabaseModule, CreditsModule],
  controllers: [SyncController],
  providers: [EventLogProjectionService, SyncPushService, SyncPullService, SyncCompactionService],
  exports: [EventLogProjectionService],
})
export class SyncModule {}
