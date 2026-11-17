#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack.js";
import { SyncStack } from "../lib/sync-stack.js";
import { WebStack } from "../lib/web-stack.js";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const app = new App();

new ApiStack(app, "Api", { env });
new SyncStack(app, "Sync", { env });

// CloudFront is not emulated everywhere; opt in with `-c web=true`.
if (app.node.tryGetContext("web") === "true") new WebStack(app, "Web", { env });

app.synth();
