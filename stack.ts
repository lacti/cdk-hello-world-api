import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import * as path from "path";
import build from "./build";

interface IApiHandler {
  apiName: string;
  sourcePath: string;
  handlerName?: string;
  apiPath?: string;
  method: "GET" | "POST" | "DELETE" | "PUT";
}

type ApiHandler = Omit<IApiHandler, "sourcePath"> & { code: string };

export class ApiLambdaHelloWorldStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, handlers: ApiHandler[]) {
    super(app, id);

    for (const handler of handlers) {
      const handlerLambda = new lambda.Function(
        this,
        handler.apiName + "Function",
        {
          code: new lambda.InlineCode(handler.code),
          handler: "index." + (handler.handlerName || "handle"),
          runtime: lambda.Runtime.NODEJS_12_X
        }
      );

      const api = new apigateway.RestApi(this, handler.apiName + "Api");
      const resource = handler.apiPath
        ? api.root.addResource(handler.apiPath)
        : api.root;
      addCorsOptions(resource).addMethod(
        handler.method,
        new apigateway.LambdaIntegration(handlerLambda)
      );
    }
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

async function loadSources(input: IApiHandler[]): Promise<ApiHandler[]> {
  const handlers: ApiHandler[] = [];
  for (const each of input) {
    const code = await build(path.join(__dirname, each.sourcePath));
    handlers.push({
      ...each,
      code
    });
  }
  return handlers;
}

(async () => {
  try {
    const handlers = await loadSources([
      {
        apiName: "helloWorld",
        method: "GET",
        sourcePath: "src/hello.ts",
        handlerName: "handle"
      }
    ]);
    const app = new cdk.App();
    new ApiLambdaHelloWorldStack(app, "ApiLambdaHelloWorld", handlers);
    app.synth();
  } catch (error) {
    console.error(error);
  }
})();
