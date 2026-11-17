import path from "node:path";
import { fileURLToPath } from "node:url";
import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import { HttpApi, HttpStage } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { apiConfigEnvironment } from "./api-env.js";
import { createApiSecret } from "./api-secret.js";
import { addSyncJwtRoutes } from "./sync-jwt.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Hono app from `apps/api`, unchanged, behind an HTTP API. Secrets come
 * from Secrets Manager; `/api/sync/*` can carry a gateway JWT check.
 */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const secret = createApiSecret({ scope: this });

    const api = new NodejsFunction(this, "ApiServer", {
      functionName: "resume-api",
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(here, "../src/api-server.ts"),
      memorySize: 512,
      timeout: Duration.seconds(29),
      environment: { ...apiConfigEnvironment(), API_SECRET_ARN: secret.secretArn },
    });
    secret.grantRead(api);

    const integration = new HttpLambdaIntegration("ApiIntegration", api);

    const httpApi = new HttpApi(this, "PublicHttpApi", {
      apiName: "resume-api",
      description: "Public /api/*. Throttled, then the Hono Lambda.",
      createDefaultStage: false,
      defaultIntegration: integration,
    });

    addSyncJwtRoutes({ scope: this, httpApi, integration });

    new HttpStage(this, "DefaultStage", {
      httpApi,
      stageName: "$default",
      autoDeploy: true,
      throttle: { rateLimit: 50, burstLimit: 100 },
    });

    new CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new CfnOutput(this, "ApiFunctionName", { value: api.functionName });
    new CfnOutput(this, "ApiSecretArn", { value: secret.secretArn });
  }
}
