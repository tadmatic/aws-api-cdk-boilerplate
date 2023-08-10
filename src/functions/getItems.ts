import { APIGatewayProxyResult } from 'aws-lambda';

import { httpJsonResponse } from '../lib/httpHelpers';
import { wrapHandler } from '../lib/observability';
import { ItemRepo } from '../lib/repos/ItemRepo';

const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
  const itemRepo = ItemRepo.getInstance();
  const items = await itemRepo.getItems();

  // return 200 http response
  return httpJsonResponse(200, items);
};

export const handler = wrapHandler(lambdaHandler);

export default handler;
