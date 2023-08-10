import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { httpJsonResponse } from '../lib/httpHelpers';
import { wrapHandler } from '../lib/observability';
import { ItemRepo } from '../lib/repos/ItemRepo';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const itemId = event.pathParameters?.itemId;

  if (!itemId) {
    return httpJsonResponse(400, { message: 'Invalid request: missing itemId' });
  }

  const itemRepo = ItemRepo.getInstance();
  const item = await itemRepo.deleteItem(itemId);

  // return 200 http response
  return httpJsonResponse(200, item);
};

export const handler = wrapHandler(lambdaHandler);

export default handler;
