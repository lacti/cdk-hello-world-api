import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import * as fs from "fs";
import * as path from "path";

export class ApiLambdaHelloWorldStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const helloWorldLambda = new lambda.Function(this, "HelloWorldFunction", {
      code: new lambda.InlineCode(
        fs.readFileSync(path.join("src", "hello.js"), "utf-8")
      ),
      handler: "index.handle",
      runtime: lambda.Runtime.NODEJS_12_X
    });

    const api = new apigateway.RestApi(this, "helloWorldApi", {
      restApiName: "Hello World Service"
    });

    addCorsOptions(api.root).addMethod(
      "GET",
      new apigateway.LambdaIntegration(helloWorldLambda)
    );
  }
}

function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod(
    "OPTIONS",
    new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Headers":
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Credentials":
              "'false'",
            "method.response.header.Access-Control-Allow-Methods":
              "'OPTIONS,GET,PUT,POST,DELETE'"
          }
        }
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": '{"statusCode": 200}'
      }
    }),
    {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Credentials": true,
            "method.response.header.Access-Control-Allow-Origin": true
          }
        }
      ]
    }
  );
  return apiResource;
}

const app = new cdk.App();
new ApiLambdaHelloWorldStack(app, "ApiLambdaHelloWorld");
app.synth();
