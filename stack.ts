import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import * as path from "path";
import build from "./build";

interface ILambdaHandler {
  name: string;
  sourcePath: string;
  functionName?: string;
}

interface IApiHandler extends ILambdaHandler {
  apiPath?: string;
  method: "GET" | "POST" | "DELETE" | "PUT";
}

type CompiledHandler<T extends { sourcePath: string }> = Omit<
  T,
  "sourcePath"
> & { code: string };

export class ApiLambdaHelloWorldStack extends cdk.Stack {
  constructor(
    app: cdk.App,
    id: string,
    handlers: Array<CompiledHandler<IApiHandler>>,
    authorizerHandler?: CompiledHandler<ILambdaHandler>
  ) {
    super(app, id);

    const authorizer = authorizerHandler
      ? this.buildAuthorizer(app, authorizerHandler)
      : undefined;
    const authOptions: Partial<apigateway.MethodOptions> = authorizer
      ? { authorizer, authorizationType: apigateway.AuthorizationType.CUSTOM }
      : {};

    for (const handler of handlers) {
      const handlerLambda = new lambda.Function(
        this,
        handler.name + "Function",
        {
          code: new lambda.InlineCode(handler.code),
          handler: "index." + (handler.functionName || "handle"),
          runtime: lambda.Runtime.NODEJS_12_X
        }
      );

      const api = new apigateway.RestApi(this, handler.name + "Api");
      const resource = handler.apiPath
        ? api.root.addResource(handler.apiPath)
        : api.root;
      addCorsOptions(resource).addMethod(
        handler.method,
        new apigateway.LambdaIntegration(handlerLambda, {}),
        {
          ...authOptions
        }
      );
    }
  }

  private buildAuthorizer(
    app: cdk.App,
    { name, code, functionName }: CompiledHandler<ILambdaHandler>
  ) {
    const handlerLambda = new lambda.Function(this, name + "Function", {
      code: new lambda.InlineCode(code),
      handler: "index." + (functionName || "handle"),
      runtime: lambda.Runtime.NODEJS_12_X
    });
    return new apigateway.TokenAuthorizer(app, name + "Authorizer", {
      handler: handlerLambda
    });
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

async function loadSources(input: IApiHandler[]) {
  const handlers: Array<CompiledHandler<IApiHandler>> = [];
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
        name: "helloWorld",
        method: "GET",
        sourcePath: "src/hello.ts",
        functionName: "handle"
      }
    ]);
    const app = new cdk.App();
    new ApiLambdaHelloWorldStack(app, "ApiLambdaHelloWorld", handlers);
    app.synth();
  } catch (error) {
    console.error(error);
  }
})();
