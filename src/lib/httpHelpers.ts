import { APIGatewayProxyEvent } from 'aws-lambda';
import * as yup from 'yup';

// Helper function extract logged in user id from auth headers
export const getAuthUserId = (event: APIGatewayProxyEvent): string | null => {
  try {
    return event.requestContext.authorizer?.claims.sub;
  } catch (err) {
    return null;
  }
};

// Helper function to parse HTTP request body as JSON object
export const parseRequestBody = async <T>(
  event: APIGatewayProxyEvent,
  schema: yup.ObjectSchema<yup.AnyObject>,
  pathParam?: string,
) => {
  let obj: Record<string, unknown>;

  // Check if body is valid JSON
  try {
    obj = JSON.parse(event.body || '');
  } catch (err) {
    const errorResponse = httpJsonResponse(400, { message: 'Invalid JSON format' });
    return { errorResponse };
  }

  if (pathParam) {
    const urlKey = event.pathParameters ? event.pathParameters[pathParam] : null;

    // if path paramater is missing, return an error
    if (!urlKey) {
      const errorResponse = httpJsonResponse(400, { message: `Missing ${pathParam} in URL` });
      return { errorResponse };
    }

    // if path parameter and body value don't match, return an error
    if (obj[pathParam]) {
      if (obj[pathParam] !== urlKey) {
        const errorResponse = httpJsonResponse(400, {
          message: `Bad request - ${pathParam} in body and URL do not match`,
        });
        return { errorResponse };
      }
    }

    // if body is missing the path parameter, add it to the object
    if (!obj[pathParam]) {
      obj[pathParam] = urlKey;
    }
  }

  // Validate the item using yup
  try {
    await schema.validate(obj);
  } catch (err: unknown) {
    const errorMessage = (err as { errors: string[] }).errors.join(', ');
    const errorResponse = httpJsonResponse(400, { message: errorMessage });
    return { errorResponse };
  }

  return { item: obj as T };
};

// Helper function to return JSON object as HTTP response
export const httpJsonResponse = (statusCode: number, object?: unknown) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
    },
    body: object ? JSON.stringify(object) : '',
  };
};
