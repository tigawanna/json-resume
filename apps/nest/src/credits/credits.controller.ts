import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CurrentUser } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { CreditsService } from './credits.service.js';

const creditsSchema = z.object({
  monthly: z.number(),
  bonus: z.number(),
  available: z.number(),
  monthlyPeriodKey: z.string().nullable(),
  waitlistJoined: z.boolean(),
});

export class CreditsResponseDto extends createZodDto(creditsSchema) {}

@ApiTags('credits')
@ApiCookieAuth()
@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  @ApiOkResponse({ type: CreditsResponseDto })
  read(@CurrentUser() current: UserWithRole) {
    return this.credits.read({ userId: current.id });
  }
}
