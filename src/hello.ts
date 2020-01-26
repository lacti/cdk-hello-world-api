import { APIGatewayProxyHandler } from "aws-lambda";

export const handle: APIGatewayProxyHandler = async event => {
  return { statusCode: 200, body: JSON.stringify(event, null, 2) };
};
