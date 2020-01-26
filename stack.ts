import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import build from "./build";

async function buildSources() {
  const hello = await build("src/hello.js");
  return { hello };
}

type Unpromisify<T> = T extends Promise<infer U> ? U : T;
type Sources = Unpromisify<ReturnType<typeof buildSources>>;

export class ApiLambdaHelloWorldStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, sources: Sources) {
    super(app, id);

    const helloWorldLambda = new lambda.Function(this, "HelloWorldFunction", {
      code: new lambda.InlineCode(sources.hello),
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

(async () => {
  const sources = await buildSources();
  const app = new cdk.App();
  new ApiLambdaHelloWorldStack(app, "ApiLambdaHelloWorld", sources);
  app.synth();
})();
