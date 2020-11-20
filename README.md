# AWS CDK static site stack!

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Install

```
npm install -g aws-cdk
npm install
```

## Spinning up the stack

This stack relies you a wild card ssl certification already existing in aws (e.g., `*.example.com`). Get that ARN and set it as the `STACK_SSL_CERTIFICATION_ARN` within the `.env` file. Also set a test `STACK_URL` (e.g., `test-stack.example.com`). You will also want to set up your aws profile with the necessary credentials.

You will also want to create a deployment user with policies:

- AWSCloudFormationFullAccess
- AWSLambdaFullAccess
- IAMFullAccess
- AmazonS3FullAccess
- CloudFrontFullAccess
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess
- KMS-CDK-all-access
  ```
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Resource": "*",
              "Action": [
                  "kms:Create*",
                  "kms:Describe*",
                  "kms:Enable*",
                  "kms:List*",
                  "kms:Put*",
                  "kms:Update*",
                  "kms:Revoke*",
                  "kms:Disable*",
                  "kms:Get*",
                  "kms:Delete*",
                  "kms:ScheduleKeyDeletion",
                  "kms:CancelKeyDeletion"
              ]
          }
      ]
  }
  ```

These may give to much control, but you can role back permissions as you see fit. Use this users account number as the `CDK_DEPLOY_ACCOUNT` defined within `.env` file and your aws user profile.

```
npm run up
npm run seed --url=test-stack.example.com
```

The above will spin up a stack and seed it with a simple hello world website

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## TODO

- Set A record within a route53 construct
- currently a bug on destroying the stack. lambda@edge function doesn't destroy on first pass. Has to be done twice.
  - https://lanwen.ru/posts/aws-cdk-edge-lambda/
  - https://github.com/aws/aws-cdk/issues/1575
