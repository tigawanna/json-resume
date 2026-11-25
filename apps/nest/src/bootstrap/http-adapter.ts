import { NodeAdapter } from "@nestjs/platform-node";

export function createHttpAdapter() {
  return new NodeAdapter({ trustProxy: "loopback" });
}

export const nestHttpOptions = { bodyParser: false as const };
