import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AppUser } from '../helpers/app-user.js';
import { CurrentUser } from '../helpers/auth.decorators.js';

const meSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  banned: z.boolean(),
});

export class MeResponseDto extends createZodDto(meSchema) {}

@ApiTags('auth')
@ApiCookieAuth()
@Controller('me')
export class MeController {
  @Get()
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser() current: AppUser): MeResponseDto {
    return {
      id: current.id,
      name: current.name,
      email: current.email,
      role: current.role,
      banned: current.banned,
    };
  }
}
