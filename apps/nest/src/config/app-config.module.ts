import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./env.schema.js";

const isProduction = process.env.NODE_ENV === "production";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      ignoreEnvFile: isProduction,
      envFilePath: isProduction ? undefined : [".env"],
      validate: (source) => validateEnv({ source }),
    }),
  ],
})
export class AppConfigModule {}
