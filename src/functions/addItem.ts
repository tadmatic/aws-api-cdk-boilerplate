import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { httpJsonResponse, parseRequestBody } from '../lib/httpHelpers';
import { wrapHandler } from '../lib/observability';
import { ItemRepo } from '../lib/repos/ItemRepo';
import { Item, PostItemSchema } from '../lib/types/Item';
import { generateUniqueId } from '../lib/util';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { item, errorResponse } = await parseRequestBody<Item>(event, PostItemSchema);
  if (errorResponse) {
    return errorResponse;
  }

  if (!item.itemId) {
    item.itemId = generateUniqueId();
  }

  const itemRepo = ItemRepo.getInstance();

  const existingItem = await itemRepo.getItemById(item.itemId);
  if (existingItem) {
    return httpJsonResponse(409, { message: 'Item with that id already exists' });
  }

  await itemRepo.upsertItem(item);

  // return 201 Created
  return httpJsonResponse(201);
};

export const handler = wrapHandler(lambdaHandler);

export default handler;
