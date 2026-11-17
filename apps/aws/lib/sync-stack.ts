import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stack, type StackProps } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

type SyncStackProps = StackProps & {
  webFunctionEndpointArn: string;
};

const here = path.dirname(fileURLToPath(import.meta.url));

/** Event function for the DynamoDB log. It asks the API web function over IAM. */
export class SyncStack extends Stack {
  constructor(scope: Construct, id: string, props: SyncStackProps) {
    super(scope, id, props);

    const sync = new NodejsFunction(this, "Sync", {
      functionName: "resume-sync",
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(here, "sync-entry.ts"),
      memorySize: 256,
    });

    sync.addToRolePolicy(
      new PolicyStatement({
        actions: ["lambda:InvokeWebFunctionEndpoint"],
        resources: [props.webFunctionEndpointArn],
      }),
    );
  }
}
