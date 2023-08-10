import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy, Stack, StackProps, aws_lambda_nodejs } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import * as packageJson from '../package.json';

// get application name from package.json
const APPLICATION_NAME = packageJson.name;

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Dynamo DB
     */

    // Create a DynamoDB table to store items
    const itemTable = new dynamodb.Table(this, 'items', {
      partitionKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /**
     * Cognito
     */

    // Create a Cognito user pool
    const userPool = new cognito.UserPool(this, 'user-pool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: { fullname: { required: true } },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create a Cognito user pool client
    const userPoolClient = new cognito.UserPoolClient(this, 'user-pool-client', {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Cognito API Gateway authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'cognito-authorizer', {
      cognitoUserPools: [userPool],
    });

    // Authorizer settings for each API end point
    const authorizerSettings = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['aws.cognito.signin.user.admin'],
    };

    /**
     * Lambda settings
     */

    // Declare environment variables for Lambda functions
    const environment = {
      AWS_ACCOUNT_ID: Stack.of(this).account,
      POWERTOOLS_SERVICE_NAME: APPLICATION_NAME,
      POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_METRICS_NAMESPACE: APPLICATION_NAME,
      ITEM_TABLE: itemTable.tableName,
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      REGION: this.region,
    };

    // Global Lambda settings for each function
    const functionSettings = {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 256,
      environment,
      logRetention: logs.RetentionDays.THREE_MONTHS,
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
      },
      awsSdkConnectionReuse: true,
      timeout: Duration.seconds(30),
    };

    // Helper function create a lambda function
    const createLambdaFn = (name: string, path: string) => {
      return new aws_lambda_nodejs.NodejsFunction(this, name, {
        entry: `./src/functions/${path}`,
        ...functionSettings,
      });
    };

    /**
     * Lambda functions
     */

    // Create Lambda functions
    const getItemsFn = createLambdaFn('getItems', 'getItems.ts');
    const getItemByIdFn = createLambdaFn('getItemById', 'getItemById.ts');
    const addItemFn = createLambdaFn('addItem', 'addItem.ts');
    const upsertItemFn = createLambdaFn('upsertItem', 'upsertItem.ts');
    const updateItemFn = createLambdaFn('updateItem', 'updateItem.ts');
    const deleteItemFn = createLambdaFn('deleteItem', 'deleteItem.ts');

    // Add permissions to read data from database
    itemTable.grantReadData(getItemsFn);
    itemTable.grantReadData(getItemByIdFn);
    itemTable.grantReadWriteData(addItemFn);
    itemTable.grantWriteData(upsertItemFn);
    itemTable.grantWriteData(updateItemFn);
    itemTable.grantWriteData(deleteItemFn);

    /**
     * API Gateway
     */

    // Create log group for API gateway
    const apiLogGroup = new logs.LogGroup(this, 'api-access-logs', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Create an API Gateway to expose the Lambda function
    const api = new apigateway.RestApi(this, 'rest-api', {
      restApiName: APPLICATION_NAME,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        tracingEnabled: true,
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    /**
     * API Gateway Routes
     */

    // Declare API route: /items
    const apiItems = api.root.addResource('items');

    // Declare API route: /items/{itemId}
    const apiItemById = apiItems.addResource('{itemId}');

    apiItems.addMethod('GET', new apigateway.LambdaIntegration(getItemsFn), authorizerSettings);
    apiItemById.addMethod('GET', new apigateway.LambdaIntegration(getItemByIdFn), authorizerSettings);
    apiItems.addMethod('POST', new apigateway.LambdaIntegration(addItemFn), authorizerSettings);
    apiItemById.addMethod('PUT', new apigateway.LambdaIntegration(upsertItemFn), authorizerSettings);
    apiItemById.addMethod('PATCH', new apigateway.LambdaIntegration(updateItemFn), authorizerSettings);
    apiItemById.addMethod('DELETE', new apigateway.LambdaIntegration(deleteItemFn), authorizerSettings);

    // Output variables
    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'Region',
    });

    new cdk.CfnOutput(this, 'ApiUri', {
      value: api.url,
      description: 'API URL',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
