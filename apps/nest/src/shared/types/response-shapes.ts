import { ApiProperty } from '@nestjs/swagger';

export class OffsetPaginatedDto<T> {
  @ApiProperty({ description: 'Items', type: [Object] })
  items: T[];

  @ApiProperty({ description: 'Number of items per page', type: Number })
  perPage: number;

  @ApiProperty({ description: 'Total number of items', type: Number })
  totalItems: number;

  @ApiProperty({ description: 'Current page', type: Number })
  page: number;

  @ApiProperty({ description: 'Total number of items', type: Number })
  totalPages: number;
}

export class CursorPaginatedDto<T> {
  @ApiProperty({ description: 'Items', type: [Object] })
  items: T[];

  @ApiProperty({ description: 'Next cursor', type: String, nullable: true })
  nextCursor: string | null;

  @ApiProperty({ description: 'Previous cursor', type: String, nullable: true })
  previousCursor: string | null;

  @ApiProperty({ description: 'Has next page', type: Boolean })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Has previous page', type: Boolean })
  hasPreviousPage: boolean;
}
