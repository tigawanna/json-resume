import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import { IS_PUBLIC, ROLES } from './auth.constants.js';
import type { UserWithRole } from './utils.js';

export const Public = () => SetMetadata(IS_PUBLIC, true);

export const Roles = ({ roles }: { roles: string[] }) =>
  SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: UserWithRole }>();
    return request.user;
  },
);
