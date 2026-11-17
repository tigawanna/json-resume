import path from "node:path";
import { fileURLToPath } from "node:url";
import { RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

const here = path.dirname(fileURLToPath(import.meta.url));

/** DynamoDB event log and the function in front of it. The log stays off the API database. */
export class SyncStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const log = new Table(this, "SyncEvents", {
      tableName: "resume-sync-events",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "seq", type: AttributeType.NUMBER },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const sync = new NodejsFunction(this, "Sync", {
      functionName: "resume-sync",
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(here, "sync-entry.ts"),
      memorySize: 256,
      environment: { SYNC_TABLE: log.tableName },
    });

    log.grantReadWriteData(sync);
  }
}
