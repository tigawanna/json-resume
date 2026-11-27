import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const libraryAction = z.object({ userId: z.string().min(1).optional() });
export class AdminLibraryActionDto extends createZodDto(libraryAction) {}

export class AdminLibraryCompactResponseDto extends createZodDto(
  z.object({ users: z.number() }),
) {}
export class AdminLibraryPruneResponseDto extends createZodDto(
  z.object({ backup: z.string(), users: z.number() }),
) {}
