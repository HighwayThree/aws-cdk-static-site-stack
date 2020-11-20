import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as r53 from '@aws-cdk/aws-route53'; 
import * as r53T from '@aws-cdk/aws-route53-targets'; 
import * as path from 'path';

interface StaticSiteStackOptions {
  SUB_DOMAIN_NAME: string
  DOMAIN_NAME: string
  STACK_SSL_CERTIFICATION_ARN: string
}

export class StaticSite extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, stackOptions: StaticSiteStackOptions, props?: cdk.StackProps) {
    /**
     * Force stack to be created in us-east-1 (lambda and cf restriction)
     */
    super(scope, id, 
      {
      ...props, 
      env: { 
        ...props?.env, 
        region: 'us-east-1'
      }
    });
    
    const URL = `${stackOptions.SUB_DOMAIN_NAME}.${stackOptions.DOMAIN_NAME}`;

    /**
     * Create s3 bucket for hosting static site files.
     */
    const bucket = new s3.Bucket(this,URL, { 
      websiteErrorDocument: '404.html',
      websiteIndexDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: true,
      cors: [{
        allowedOrigins: ['*'],
        allowedMethods: [
          s3.HttpMethods.GET, 
          s3.HttpMethods.POST, 
          s3.HttpMethods.PUT, 
          s3.HttpMethods.DELETE, 
          s3.HttpMethods.HEAD
        ]
      }],
    })

    /**
     * Get SSL Certification for use in Cloudfront Dist
     */
    const siteCertificate = acm.Certificate.fromCertificateArn(this, 'site-cert', stackOptions.STACK_SSL_CERTIFICATION_ARN)
    
    /**
     * Create Lambda Edge function for use in Cloudfront Dist
     */
    const nonHtmlRequestFunction = new lambda.Function( this, 'LambdaEdgeRedirect', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas', 'static-web-hosting')),
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      }
    })

    /**
     * Create CloudFront distribution
     * - Error page mapping, 
     * - Caching
     * - Lambda edge function
     * - ssl certification
     */
    const cf = new cloudfront.CloudFrontWebDistribution(this, `cf-${URL}`, {
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2,
      errorConfigurations: [{
        errorCode: 404,
        errorCachingMinTtl: 10,
        responseCode: 400,
        responsePagePath: '/404.html'
      },
      {
        errorCode: 400,
        errorCachingMinTtl: 10,
        responseCode: 400,
        responsePagePath: '/404.html'
      },
      {
        errorCode: 403,
        errorCachingMinTtl: 10,
        responseCode: 400,
        responsePagePath: '/404.html'
      },
      {
        errorCode: 405,
        errorCachingMinTtl: 10,
        responseCode: 400,
        responsePagePath: '/404.html'
      },
      {
        errorCode: 500,
        errorCachingMinTtl: 10,
        responseCode: 400,
        responsePagePath: '/404.html'
      }],
      originConfigs: [{ 
        s3OriginSource: { s3BucketSource: bucket },
        behaviors: [{
          cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
          isDefaultBehavior: true,
          compress: true,
          allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
          lambdaFunctionAssociations:[{
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            lambdaFunction: nonHtmlRequestFunction.currentVersion
          }]
        }],        
      }],
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
        siteCertificate,
        {
          aliases: [URL],
          securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1,
          sslMethod: cloudfront.SSLMethod.SNI
        }
      ),

    });

    /**
     * Create get zone and create ARecord
     */
    const zone = r53.HostedZone.fromLookup(this, 'H3-SiteZones', {
      domainName: stackOptions.DOMAIN_NAME
    })
    new r53.ARecord(this, 'DistributionRecord', {
      recordName: URL,
      zone: zone,
      target: r53.RecordTarget.fromAlias({ 
        bind: () => ({
          hostedZoneId: r53T.CloudFrontTarget.getHostedZoneId(cf),
          dnsName: cf.distributionDomainName
        })
      })
    })

    /**
     * Deploy website-dist folder to s3 bucket
     */
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', 'website-dist'))],
      destinationBucket: bucket,
      retainOnDelete: false
    });

    // Bunch of outputs to see everything manually
    new cdk.CfnOutput(this, 'Bucket', {
      value: `s3://${bucket.bucketName}`
    });

    new cdk.CfnOutput(this, 'CfDomain', {
      value: cf.distributionDomainName
    });

    new cdk.CfnOutput(this, 'CfId', {
      value: cf.distributionId
    });

  }
}
