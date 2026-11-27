import { applyDecorators } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiErrorDto } from './api-error.dto.js';

/** Document the two responses produced by the global auth guard. */
export function ApiAuthResponses({
  forbiddenDescription = 'Forbidden',
}: {
  forbiddenDescription?: string;
} = {}) {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ApiErrorDto,
    }),
    ApiForbiddenResponse({
      description: forbiddenDescription,
      type: ApiErrorDto,
    }),
  );
}
