import { AuthService } from "@hono-api/core/auth/auth.service";
import { Hono } from "hono";
import { HealthController } from "./health/healath.controller";
import { MeController } from "./me/me.controller";
import { MeService } from "./me/me.service";

type RoutesProps = {
  auth: AuthService;
};

/** Resource apps only. Parent `basePath("/api")` + `.route("/", this)` keeps them at `/api/<name>`. */
export function createRoutes({ auth }: RoutesProps) {
  return new Hono()
    .route("/health", new HealthController().routes)
    .route("/me", new MeController({ me: new MeService({ auth }), auth }).routes);
}
