import { Hono } from "hono";
import { HealthController } from "./health/healath.controller";

export const index = new Hono()
.route("/health", new HealthController().routes)



