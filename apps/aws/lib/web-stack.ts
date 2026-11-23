import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { isEmulator } from "./emulator.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const builtWeb = path.join(here, "../../web/dist/client");
const webBuild = existsSync(builtWeb) ? builtWeb : path.join(here, "../assets/site");

/**
 * CloudFront in front of the built web app. Build `apps/web` before synth.
 * Emulator custom-resource Lambdas cannot reach S3, so auto-delete and the file
 * upload only run against real AWS.
 */
export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const site = new Bucket(this, "Site", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: !isEmulator,
    });

    if (!isEmulator) {
      new BucketDeployment(this, "SiteFiles", {
        destinationBucket: site,
        sources: [Source.asset(webBuild)],
      });
    }

    const distribution = new Distribution(this, "Cdn", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
    });

    new CfnOutput(this, "SiteBucket", { value: site.bucketName });
    new CfnOutput(this, "WebUrl", { value: `https://${distribution.domainName}` });
  }
}
