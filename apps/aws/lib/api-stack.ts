import path from "node:path";
import { fileURLToPath } from "node:url";
import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Hono app from `apps/api`, bundled as the process a Lambda web function
 * keeps open. The HTTP API is only the public front door for `/api/v1`.
 * Attach it as an HTTP proxy to the web function endpoint. A Lambda proxy
 * integration would invoke once per request.
 */
export class ApiStack extends Stack {
  readonly endpointArn: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new NodejsFunction(this, "ApiServer", {
      functionName: "resume-api",
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(here, "../src/api-server.ts"),
      memorySize: 512,
      environment: { PORT: "8080" },
    });

    const httpApi = new HttpApi(this, "PublicHttpApi", {
      apiName: "resume-api",
      description: "Public /api/v1. JWT authorizer and throttle, then the web function.",
    });

    this.endpointArn = `arn:aws:lambda:${this.region}:${this.account}:web-function/resume-api/endpoint/internal`;

    new CfnOutput(this, "HttpApiId", { value: httpApi.apiId });
    new CfnOutput(this, "ApiFunctionName", { value: api.functionName });
  }
}
