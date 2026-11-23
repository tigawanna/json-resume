import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/auth.decorators.js";
import { AppService } from "./app.service.js";

@ApiTags("meta")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOkResponse({ schema: { type: "string", example: "Hello World!" } })
  getHello(): string {
    return this.appService.getHello();
  }
}
