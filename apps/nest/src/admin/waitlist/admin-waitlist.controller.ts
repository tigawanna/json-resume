import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../auth/helpers/auth.decorators.js';
import { AddWaitlistEntryDto, WaitlistIdParamDto } from './admin-waitlist.dto.js';
import { AdminWaitlistService } from './admin-waitlist.service.js';

@Roles({ roles: ['admin'] })
@Controller('admin/waitlist')
export class AdminWaitlistController {
  constructor(private readonly waitlist: AdminWaitlistService) {}

  @Get()
  findAll() {
    return this.waitlist.findAll();
  }

  @Post()
  add(@Body() body: AddWaitlistEntryDto) {
    return this.waitlist.add({ body });
  }

  @Get(':id')
  findOne(@Param() { id }: WaitlistIdParamDto) {
    return this.waitlist.findOne({ id });
  }

  @Delete(':id')
  remove(@Param() { id }: WaitlistIdParamDto) {
    return this.waitlist.remove({ id });
  }
}
