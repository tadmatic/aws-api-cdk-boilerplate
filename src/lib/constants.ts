if (!process.env.REGION) {
  throw new Error('Region environment variable missing');
}

if (!process.env.COGNITO_USER_POOL_ID) {
  throw new Error('Cognito user pool id environment variable missing');
}

if (!process.env.ITEM_TABLE) {
  throw new Error('Item table environment variable missing');
}

export const REGION = process.env.REGION;
export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
export const ITEM_TABLE = process.env.ITEM_TABLE;
export const DYNAMO_BATCH_SIZE = 25;
