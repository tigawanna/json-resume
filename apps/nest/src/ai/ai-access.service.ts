import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UserWithRole } from "../auth/helpers/utils.js";
import type { AppEnv } from "../config/env.schema.js";

type AiUser = Pick<UserWithRole, "id" | "banned">;

@Injectable()
export class AiAccessService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  resolveUserId({ current }: { current?: AiUser }): string | null {
    if (current?.banned) return null;
    if (current) return current.id;
    if (this.config.get("HOSTED_AI_ALLOW_ANONYMOUS", { infer: true }) === "true") {
      return "local";
    }
    return null;
  }
}
