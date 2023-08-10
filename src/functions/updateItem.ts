import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { httpJsonResponse, parseRequestBody } from '../lib/httpHelpers';
import { wrapHandler } from '../lib/observability';
import { ItemRepo } from '../lib/repos/ItemRepo';
import { Item, PatchItemSchema } from '../lib/types/Item';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { item, errorResponse } = await parseRequestBody<Item>(event, PatchItemSchema, 'itemId');
  if (errorResponse) {
    return errorResponse;
  }

  const itemRepo = ItemRepo.getInstance();
  const items = await itemRepo.updateItem(item);

  // return 200 http response
  return httpJsonResponse(200, items);
};

export const handler = wrapHandler(lambdaHandler);

export default handler;
