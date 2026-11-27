import { randomBytes } from "node:crypto";
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { user } from "@repo/db/postgres/schema/auth-schema";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../../config/env.schema.js";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import type { Auth } from "../better-auth/create-auth.js";
import type {
  CreateTestUserDto,
  TestUserCredentials,
} from "./test-users.dto.js";

@Injectable()
export class TestUsersService {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService<Auth>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  /** Create a user, open a session, and return the plaintext credentials. */
  async createAndSignIn({ body }: { body: CreateTestUserDto }): Promise<{
    credentials: TestUserCredentials;
    setCookie: string[];
  }> {
    this.assertNotProduction();
    const email = body.email ?? `test-${randomBytes(4).toString("hex")}@example.com`;
    const password = body.password ?? randomBytes(12).toString("base64url");
    const name = body.name ?? email.split("@")[0] ?? "test-user";
    const role = body.role ?? "user";

    const signedUp = await this.auth.api.signUpEmail({
      body: { email, password, name },
      returnHeaders: true,
    });
    const userId = signedUp.response.user.id;
    if (role !== "user") {
      await this.db.update(user).set({ role }).where(eq(user.id, userId));
    }

    // Re-sign-in when cookies are missing or role was patched after the signup session.
    let setCookie = role === "user" ? signedUp.headers.getSetCookie() : [];
    if (setCookie.length === 0) {
      const signedIn = await this.auth.api.signInEmail({
        body: { email, password },
        returnHeaders: true,
      });
      setCookie = signedIn.headers.getSetCookie();
    }
    if (setCookie.length === 0) {
      throw new InternalServerErrorException("Better Auth did not return session cookies");
    }

    return {
      setCookie,
      credentials: {
        email,
        password,
        user: { id: userId, name, email, role },
      },
    };
  }

  private assertNotProduction() {
    if (this.config.get("NODE_ENV", { infer: true }) === "production") {
      throw new ForbiddenException("Test users are disabled in production");
    }
  }
}
