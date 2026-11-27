import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { GithubController } from './github.controller.js';
import { GithubService } from './github.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}
