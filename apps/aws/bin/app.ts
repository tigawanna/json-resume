#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { CdkGraph } from "@aws-prototyping-sdk/cdk-graph";
import { CdkGraphDiagramPlugin } from "@aws-prototyping-sdk/cdk-graph-plugin-diagram";
import { ApiStack } from "../lib/api-stack.js";
import { SyncStack } from "../lib/sync-stack.js";
import { WebStack } from "../lib/web-stack.js";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const app = new App();

const api = new ApiStack(app, "Api", { env });
new SyncStack(app, "Sync", {
  env,
  webFunctionEndpointArn: api.endpointArn,
});
new WebStack(app, "Web", { env });

const graph = new CdkGraph(app, {
  plugins: [new CdkGraphDiagramPlugin()],
});

app.synth();
await graph.report();
