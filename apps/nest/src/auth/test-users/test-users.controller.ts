import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { ServerResponse } from "node:http";
import { ZodSerializerDto } from "nestjs-zod";
import { Public } from "../helpers/auth.decorators.js";
import { ApiErrorDto } from "../../shared/openapi/api-error.dto.js";
import {
  CreateTestUserDto,
  TestUserCredentialsDto,
} from "./test-users.dto.js";
import { TestUsersService } from "./test-users.service.js";

@ApiTags("auth")
@Controller("test-users")
export class TestUsersController {
  constructor(private readonly testUsers: TestUsersService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Create a test user and sign in as them (non-production only)",
    description:
      "Generates email/password when omitted, sets Better Auth session cookies on the response, and returns the plaintext credentials. Refused when NODE_ENV=production.",
  })
  @ApiOkResponse({ type: TestUserCredentialsDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ZodSerializerDto(TestUserCredentialsDto)
  async create(
    @Body() body: CreateTestUserDto,
    @Res({ passthrough: true }) response: ServerResponse,
  ) {
    const { credentials, setCookie } = await this.testUsers.createAndSignIn({
      body,
    });
    response.setHeader("Set-Cookie", setCookie);
    return credentials;
  }
}
